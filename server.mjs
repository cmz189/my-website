import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const XJJUHE_BASE_URL = (process.env.XJJUHE_BASE_URL || 'https://xjjuhe.site/v1').replace(/\/+$/, '');
const XJJUHE_API_KEY = resolveApiKey();
const XJJUHE_ANALYSIS_MODEL = process.env.XJJUHE_ANALYSIS_MODEL || 'gpt-5.5';
const XJJUHE_IMAGE_MODEL = process.env.XJJUHE_IMAGE_MODEL || 'gpt-image-2';
const MAX_JSON_BYTES = 18 * 1024 * 1024;
const MAX_DATA_URL_BYTES = 10 * 1024 * 1024;
const MAX_REMOTE_IMAGE_BYTES = 14 * 1024 * 1024;
const IMAGE_POLL_INTERVAL_MS = 3_000;
const IMAGE_POLL_TIMEOUT_MS = 150_000;

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.mp4', 'video/mp4'],
  ['.ico', 'image/x-icon'],
]);

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return sendJson(response, 204, null);
    }

    if (url.pathname === '/api/health' && request.method === 'GET') {
      return sendJson(response, 200, {
        ok: true,
        has_api_key: Boolean(XJJUHE_API_KEY),
        base_url: XJJUHE_BASE_URL,
        analysis_model: XJJUHE_ANALYSIS_MODEL,
        image_model: XJJUHE_IMAGE_MODEL,
      });
    }

    if (url.pathname === '/api/scalp-poster' && request.method === 'POST') {
      const body = await readJson(request);
      const result = await generateScalpPoster(body);
      return sendJson(response, 200, result);
    }

    if (url.pathname.startsWith('/api/')) {
      return sendJson(response, 404, { ok: false, error: 'API route not found.' });
    }

    return serveStatic(url.pathname, response);
  } catch (error) {
    const status = error && typeof error === 'object' && Number.isInteger(error.statusCode)
      ? error.statusCode
      : 500;
    return sendJson(response, status, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Scalp poster API listening at http://127.0.0.1:${PORT}`);
});

async function generateScalpPoster(body) {
  if (!XJJUHE_API_KEY) {
    throw new Error('XJJUHE_API_KEY is not set. Set it in your environment before starting the server.');
  }

  const sourceImage = validateDataUrl(body.sourceImage);
  let analysis = buildFallbackScalpAnalysis(body);
  let analysisError = null;

  try {
    analysis = await analyzeScalpWithGpt55(sourceImage, body);
  } catch (error) {
    analysisError = error instanceof Error ? error.message : String(error);
    analysis.analysis_note = 'gpt-5.5 图片理解暂时不可用，本次海报已使用页面初筛结果生成。';
  }

  const prompt = buildPosterPrompt(body, analysis);
  const generation = await generateImageWithGptImage2({
    prompt,
    sourceImage,
    aspectRatio: body.aspect_ratio || '4:5',
  });
  const imageDataUrl = generation.image_data_url || await fetchGeneratedImageAsDataUrl(generation.image_url);

  return {
    ok: true,
    analysis_model: XJJUHE_ANALYSIS_MODEL,
    image_model: generation.model || XJJUHE_IMAGE_MODEL,
    model: generation.model || XJJUHE_IMAGE_MODEL,
    analysis_ok: !analysisError,
    analysis_error: analysisError,
    analysis,
    prompt,
    image_url: generation.image_url,
    image_data_url: imageDataUrl,
    task_id: generation.task_id,
    raw_status: generation.raw_status,
  };
}

async function callXjjuhe(endpoint, { method, body, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = {
    Authorization: `Bearer ${XJJUHE_API_KEY}`,
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const options = {
      method,
      headers,
      signal: controller.signal,
    };
    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${XJJUHE_BASE_URL}${endpoint}`, {
      ...options,
    });

    const text = await response.text();
    const parsed = text ? safeParseJson(text) : {};
    if (!response.ok) {
      throw createHttpError(502, `xjjuhe API HTTP ${response.status}: ${extractError(parsed, text)}`);
    }
    if (text && !parsed) {
      throw createHttpError(502, 'Invalid JSON response from xjjuhe API.');
    }
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

async function analyzeScalpWithGpt55(sourceImage, body) {
  const prompt = buildScalpAnalysisPrompt(body);
  const upstream = await callXjjuhe('/chat/completions', {
    method: 'POST',
    body: {
      model: XJJUHE_ANALYSIS_MODEL,
      messages: [
        {
          role: 'system',
          content: '你是洗发水行业的头皮照片观察助手，只做日常洗护观察和护理沟通建议，不做医疗诊断。',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: sourceImage } },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 1200,
      stream: false,
    },
    timeoutMs: 90_000,
  });

  const content = extractAssistantContent(upstream);
  const parsed = parseJsonObjectFromText(content);
  return normalizeScalpAnalysis(parsed, body);
}

async function generateImageWithGptImage2({ prompt, sourceImage, aspectRatio }) {
  const payload = {
    model: XJJUHE_IMAGE_MODEL,
    prompt,
    aspect_ratio: aspectRatio,
    response_format: 'url',
    reference_images: [sourceImage],
    n: 1,
  };

  const submitted = await callXjjuhe('/images/generations', {
    method: 'POST',
    body: payload,
    timeoutMs: 60_000,
  });
  const directImage = extractGeneratedImage(submitted);
  if (directImage.image_url || directImage.image_data_url) {
    return {
      model: submitted.model || XJJUHE_IMAGE_MODEL,
      image_url: directImage.image_url,
      image_data_url: directImage.image_data_url,
      task_id: extractTaskId(submitted),
      raw_status: submitted.status,
    };
  }

  const taskId = extractTaskId(submitted);
  if (!taskId) {
    throw new Error('gpt-image-2 returned no image URL and no task_id.');
  }

  const completed = await pollImageGenerationTask(taskId);
  const image = extractGeneratedImage(completed);
  if (!image.image_url && !image.image_data_url) {
    throw new Error('gpt-image-2 task completed but returned no generated image URL.');
  }

  return {
    model: completed.model || submitted.model || XJJUHE_IMAGE_MODEL,
    image_url: image.image_url,
    image_data_url: image.image_data_url,
    task_id: taskId,
    raw_status: completed.status,
  };
}

async function pollImageGenerationTask(taskId) {
  const startedAt = Date.now();
  let lastStatus = 'queued';

  while (Date.now() - startedAt < IMAGE_POLL_TIMEOUT_MS) {
    await sleep(IMAGE_POLL_INTERVAL_MS);
    const task = await callXjjuhe(`/images/generations/${encodeURIComponent(taskId)}`, {
      method: 'GET',
      timeoutMs: 30_000,
    });
    const status = String(task.status || '').toLowerCase();
    lastStatus = status || lastStatus;
    const image = extractGeneratedImage(task);

    if (image.image_url || image.image_data_url || ['completed', 'succeeded', 'success'].includes(status)) {
      return task;
    }
    if (['failed', 'error', 'cancelled', 'canceled'].includes(status)) {
      throw new Error(`gpt-image-2 task failed: ${extractError(task, lastStatus)}`);
    }
  }

  throw new Error(`gpt-image-2 task timed out after ${Math.round(IMAGE_POLL_TIMEOUT_MS / 1000)} seconds. Last status: ${lastStatus}.`);
}

function buildScalpAnalysisPrompt(body) {
  const profile = safeText(body.profile?.title || '头皮护理画像', 80);
  const summary = safeText(body.profile?.summary || '', 140);
  const scores = body.scores || {};
  const signals = Array.isArray(body.signals) ? body.signals.map((item) => safeText(item, 100)).slice(0, 5) : [];
  const imageSignals = Array.isArray(body.imageSignals) ? body.imageSignals.map((item) => safeText(item, 100)).slice(0, 4) : [];
  const notes = safeText(body.notes || '', 160);

  return [
    '请观察用户上传的头皮/发根照片，并结合页面里的初筛信息，输出一段严格 JSON，不要输出 Markdown。',
    '输出字段必须是：',
    '{"scalp_type":"字符串","confidence":"高/中/低","scores":{"oil":0-5,"flakes":0-5,"sensitivity":0-5,"root":0-5},"observations":["最多4条可见信号"],"care_suggestions":["最多3条护理建议"],"poster_brief":"用于生图海报的一句话视觉简报","safety_note":"安全提醒"}',
    '要求：只描述可见的油光、屑感、泛红、发根稀疏/塌感、清洁残留等洗护观察；不要诊断疾病，不要承诺治疗效果；照片不清楚时降低 confidence。',
    `页面初筛画像：${profile}`,
    summary ? `页面初筛总结：${summary}` : '',
    `页面初筛分数：油脂 ${formatScore(scores.oil)} / 5，屑感 ${formatScore(scores.flakes)} / 5，敏感 ${formatScore(scores.sensitivity)} / 5，发根 ${formatScore(scores.root)} / 5。`,
    signals.length ? `用户可观察信号：${signals.join('；')}` : '',
    imageSignals.length ? `本地图像估计：${imageSignals.join('；')}` : '',
    notes ? `用户补充：${notes}` : '',
  ].filter(Boolean).join('\n');
}

function buildPosterPrompt(body, analysis) {
  const profile = safeText(body.profile?.title || '头皮护理画像', 60);
  const summary = safeText(body.profile?.summary || '', 120);
  const scores = body.scores || {};
  const routine = Array.isArray(body.routine) ? body.routine.map((item) => safeText(item, 90)).slice(0, 3) : [];
  const signals = Array.isArray(body.imageSignals) ? body.imageSignals.map((item) => safeText(item, 80)).slice(0, 4) : [];
  const notes = safeText(body.notes || '', 120);
  const aiType = safeText(analysis?.scalp_type || '', 70);
  const aiObservations = Array.isArray(analysis?.observations) ? analysis.observations.map((item) => safeText(item, 90)).slice(0, 4) : [];
  const aiSuggestions = Array.isArray(analysis?.care_suggestions) ? analysis.care_suggestions.map((item) => safeText(item, 90)).slice(0, 3) : [];
  const posterBrief = safeText(analysis?.poster_brief || '', 160);
  const safetyNote = safeText(analysis?.safety_note || '', 160);

  return [
    '根据参考图生成一张高端洗护品牌风格的竖版头皮护理分析海报底图，比例 4:5。',
    '画面要干净、专业、适合洗发水行业，用绿色、米白、浅金色和深墨绿，质感接近专业头皮检测报告。',
    '请保留参考图的头皮观察感，但不要制造病变、血腥、夸张脱发或医疗诊断画面。',
    '非常重要：不要在图片中生成任何文字、汉字、英文字母、数字、品牌字样、签名、水印、表格文字或可阅读字符。',
    '请只生成视觉背景、头皮观察图、留白面板、线条、色块、图标感装饰和报告版式空间，所有真实文字会由网页后期叠加。',
    `海报主题：${profile}`,
    summary ? `一句话结论：${summary}` : '',
    aiType ? `gpt-5.5 图片理解画像：${aiType}` : '',
    aiObservations.length ? `gpt-5.5 可见观察：${aiObservations.join('；')}` : '',
    aiSuggestions.length ? `gpt-5.5 护理建议：${aiSuggestions.join('；')}` : '',
    posterBrief ? `视觉简报：${posterBrief}` : '',
    `四项分数：油脂 ${formatScore(scores.oil)} / 5，屑感 ${formatScore(scores.flakes)} / 5，敏感 ${formatScore(scores.sensitivity)} / 5，发根 ${formatScore(scores.root)} / 5。`,
    signals.length ? `图片信号：${signals.join('；')}` : '',
    routine.length ? `护理步骤：${routine.join('；')}` : '',
    notes ? `用户补充：${notes}` : '',
    safetyNote ? `安全边界：${safetyNote}` : '',
    '整体像品牌给用户生成的个性化护理建议图，不要像医院诊断单。必须保持无文字底图，文字区域用干净空白或半透明面板表达。',
  ].filter(Boolean).join('\n');
}

async function fetchGeneratedImageAsDataUrl(imageUrl) {
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) return undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(imageUrl, { signal: controller.signal });
    if (!response.ok) return undefined;

    const contentType = response.headers.get('content-type') || 'image/png';
    if (!/^image\/(png|jpe?g|webp)/i.test(contentType)) return undefined;

    const length = Number(response.headers.get('content-length') || 0);
    if (length > MAX_REMOTE_IMAGE_BYTES) return undefined;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_REMOTE_IMAGE_BYTES) return undefined;

    return `data:${contentType.split(';')[0]};base64,${buffer.toString('base64')}`;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

function extractGeneratedImage(upstream) {
  const candidates = [
    upstream,
    upstream?.data,
    upstream?.data?.[0],
    upstream?.images?.[0],
    upstream?.result,
    upstream?.output,
    upstream?.output?.[0],
  ];

  for (const item of candidates) {
    if (typeof item?.image_url === 'string' && item.image_url) {
      return { image_url: item.image_url };
    }
    if (typeof item?.url === 'string' && item.url) {
      return { image_url: item.url };
    }
    if (typeof item?.b64_json === 'string' && item.b64_json) {
      return { image_data_url: `data:image/png;base64,${item.b64_json}` };
    }
  }
  return {};
}

function extractTaskId(upstream) {
  const candidates = [
    upstream,
    upstream?.data,
    upstream?.data?.[0],
    upstream?.result,
    upstream?.output,
    upstream?.output?.[0],
  ];

  for (const item of candidates) {
    if (typeof item?.task_id === 'string' && item.task_id) return item.task_id;
    if (typeof item?.id === 'string' && item.id) return item.id;
  }

  return null;
}

function validateDataUrl(value) {
  if (typeof value !== 'string' || !/^data:image\/(png|jpe?g|webp);base64,/i.test(value)) {
    throw createHttpError(400, 'sourceImage must be a PNG, JPEG, or WEBP data URL.');
  }
  const base64 = value.split(',', 2)[1] || '';
  const approxBytes = Math.floor(base64.length * 0.75);
  if (approxBytes > MAX_DATA_URL_BYTES) {
    throw createHttpError(413, 'sourceImage is larger than 10MB.');
  }
  return value;
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_JSON_BYTES) {
        reject(createHttpError(413, 'Request body is too large.'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      try {
        resolve(parseJson(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (error) {
        reject(createHttpError(400, error instanceof Error ? error.message : String(error)));
      }
    });
    request.on('error', reject);
  });
}

async function serveStatic(requestPath, response) {
  const cleanPath = decodeURIComponent(requestPath.split('?')[0]);
  let filePath;

  if (cleanPath === '/') {
    filePath = path.join(__dirname, 'index.html');
  } else if (cleanPath.startsWith('/assets/')) {
    filePath = path.join(__dirname, 'public', cleanPath);
  } else {
    filePath = path.join(__dirname, cleanPath);
  }

  const normalized = path.normalize(filePath);
  if (!normalized.startsWith(__dirname)) {
    return sendJson(response, 403, { ok: false, error: 'Forbidden.' });
  }

  try {
    const data = await fs.readFile(normalized);
    const contentType = MIME_TYPES.get(path.extname(normalized).toLowerCase()) || 'application/octet-stream';
    response.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
    });
    response.end(data);
  } catch {
    const index = await fs.readFile(path.join(__dirname, 'index.html'));
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end(index);
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': 'http://127.0.0.1:5173',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(payload === null ? '' : JSON.stringify(payload));
}

function resolveApiKey() {
  if (process.env.XJJUHE_API_KEY) {
    return process.env.XJJUHE_API_KEY;
  }

  if (process.platform === 'win32') {
    try {
      const value = execFileSync(
        'powershell.exe',
        ['-NoProfile', '-Command', "[Environment]::GetEnvironmentVariable('XJJUHE_API_KEY','User')"],
        { encoding: 'utf8', timeout: 3_000, windowsHide: true },
      ).trim();
      if (value) {
        process.env.XJJUHE_API_KEY = value;
        return value;
      }
    } catch {
      // Fall through to the normal missing-key error.
    }
  }

  return '';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function extractAssistantContent(upstream) {
  const content = upstream?.choices?.[0]?.message?.content ?? upstream?.choices?.[0]?.text ?? '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === 'string') return part;
      if (typeof part?.text === 'string') return part.text;
      if (typeof part?.content === 'string') return part.content;
      return '';
    }).join('\n');
  }
  return '';
}

function parseJsonObjectFromText(text) {
  const content = String(text || '').trim();
  if (!content) {
    throw new Error('gpt-5.5 returned empty analysis content.');
  }

  const candidates = [content];
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());

  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(content.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    const parsed = safeParseJson(candidate);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  }

  throw new Error('gpt-5.5 returned non-JSON analysis content.');
}

function normalizeScalpAnalysis(value, body) {
  const fallback = buildFallbackScalpAnalysis(body);
  const aiScores = value?.scores || {};
  return {
    scalp_type: safeText(value?.scalp_type || value?.type || fallback.scalp_type, 70),
    confidence: safeText(value?.confidence || fallback.confidence, 40),
    scores: {
      oil: normalizeScore(aiScores.oil ?? fallback.scores.oil),
      flakes: normalizeScore(aiScores.flakes ?? fallback.scores.flakes),
      sensitivity: normalizeScore(aiScores.sensitivity ?? fallback.scores.sensitivity),
      root: normalizeScore(aiScores.root ?? fallback.scores.root),
    },
    observations: normalizeStringArray(value?.observations || value?.visible_signals || fallback.observations, 4, 100),
    care_suggestions: normalizeStringArray(value?.care_suggestions || value?.suggestions || fallback.care_suggestions, 3, 110),
    poster_brief: safeText(value?.poster_brief || fallback.poster_brief, 180),
    safety_note: safeText(value?.safety_note || fallback.safety_note, 180),
  };
}

function buildFallbackScalpAnalysis(body) {
  const scores = body.scores || {};
  return {
    scalp_type: safeText(body.profile?.title || '头皮护理画像', 70),
    confidence: '本地初筛',
    scores: {
      oil: normalizeScore(scores.oil),
      flakes: normalizeScore(scores.flakes),
      sensitivity: normalizeScore(scores.sensitivity),
      root: normalizeScore(scores.root),
    },
    observations: normalizeStringArray(body.imageSignals || body.signals || ['照片信号已进入海报生成参考。'], 4, 100),
    care_suggestions: normalizeStringArray(body.routine || ['保持温和清洁，连续观察头皮舒适度变化。'], 3, 110),
    poster_brief: safeText(body.profile?.summary || '生成一张专业、干净、适合洗发水行业的头皮护理分析海报。', 180),
    safety_note: safeText(body.warning || '本结果只用于日常洗护观察，不构成医疗诊断。', 180),
  };
}

function normalizeStringArray(value, maxItems, maxLength) {
  const list = Array.isArray(value) ? value : String(value || '').split(/[；;\n]/);
  return list
    .map((item) => safeText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(5, number));
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON response.');
  }
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractError(parsed, fallback) {
  if (parsed?.error?.message) return parsed.error.message;
  if (parsed?.message) return parsed.message;
  return fallback || 'Unknown error';
}

function safeText(value, maxLength) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function formatScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0.0';
  return Math.max(0, Math.min(5, number)).toFixed(1);
}
