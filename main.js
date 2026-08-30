const header = document.querySelector('.site-header');
const progress = document.querySelector('.scroll-progress span');
const film = document.querySelector('#official-film');
const filmSection = document.querySelector('.film-section');
const dialog = document.querySelector('#image-dialog');
const dialogImage = dialog.querySelector('img');
const scalpForm = document.querySelector('#scalp-form');
const scalpReport = document.querySelector('#scalp-report');
const scalpPhoto = document.querySelector('#scalp-photo');
const uploadZone = document.querySelector('[data-upload-zone]');
const uploadPreview = document.querySelector('.upload-preview');
const uploadEmpty = document.querySelector('.upload-empty');
const cloudConsent = document.querySelector('#cloud-consent');

let scalpImageStats = null;
let scalpImageStatsPromise = null;
let scalpImageDataUrl = null;
const API_BASE = window.location.port === '5173' ? 'http://127.0.0.1:8787' : '';

const updateScroll = () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
  progress.style.width = `${Math.min(100, ratio * 100)}%`;
  header.classList.toggle('scrolled', window.scrollY > 24);
};

window.addEventListener('scroll', updateScroll, { passive: true });
updateScroll();

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const element = entry.target;
    const target = Number(element.dataset.counter);
    const pad = Number(element.dataset.pad || 0);
    const duration = target > 100 ? 1500 : 900;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);
      element.textContent = String(value).padStart(pad, '0');
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
    counterObserver.unobserve(element);
  });
}, { threshold: 0.65 });

document.querySelectorAll('[data-counter]').forEach((element) => counterObserver.observe(element));

const effectSection = document.querySelector('.immersive-effect');
if (effectSection) {
  const headerBrandObserver = new IntersectionObserver(([entry]) => {
    header.classList.toggle('hide-brand', entry.isIntersecting);
  }, { threshold: 0.04 });
  headerBrandObserver.observe(effectSection);
}

document.querySelectorAll('[data-play-film]').forEach((button) => {
  button.addEventListener('click', async () => {
    filmSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => film.play().catch(() => {}), 650);
  });
});

film.addEventListener('play', () => filmSection.classList.add('playing'));
film.addEventListener('pause', () => filmSection.classList.remove('playing'));
film.addEventListener('ended', () => filmSection.classList.remove('playing'));

document.querySelectorAll('[data-open-image]').forEach((button) => {
  button.addEventListener('click', () => {
    dialogImage.src = button.dataset.openImage;
    dialogImage.alt = button.dataset.imageAlt || '完整资料图';
    dialog.showModal();
  });
});

dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});

document.querySelectorAll('.range-stack input[type="range"]').forEach((input) => {
  const output = input.closest('label').querySelector('output');
  const update = () => { output.value = input.value; };
  input.addEventListener('input', update);
  update();
});

if (uploadZone && scalpPhoto) {
  ['dragenter', 'dragover'].forEach((eventName) => {
    uploadZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      uploadZone.classList.add('dragging');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    uploadZone.addEventListener(eventName, () => uploadZone.classList.remove('dragging'));
  });

  uploadZone.addEventListener('drop', (event) => {
    event.preventDefault();
    const [file] = event.dataTransfer.files;
    if (file) handleScalpPhoto(file);
  });

  scalpPhoto.addEventListener('change', () => {
    const [file] = scalpPhoto.files;
    if (file) handleScalpPhoto(file);
  });
}

if (scalpForm) {
  scalpForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (scalpImageStatsPromise) {
      scalpImageStats = await scalpImageStatsPromise;
    }
    await renderScalpReport(collectScalpInputs());
  });

  scalpForm.addEventListener('reset', () => {
    window.setTimeout(() => {
      scalpImageStats = null;
      scalpImageStatsPromise = null;
      scalpImageDataUrl = null;
      if (uploadPreview) {
        uploadPreview.hidden = true;
        uploadPreview.removeAttribute('src');
      }
      if (uploadEmpty) uploadEmpty.hidden = false;
      scalpReport.innerHTML = `
        <div class="report-empty">
          <p class="eyebrow">REPORT PREVIEW</p>
          <h3>等待生成图片</h3>
          <p>上传照片并填写状态后，这里会先分析头皮信号，再生成一张可下载的头皮护理画像图。</p>
        </div>
      `;
      document.querySelectorAll('.range-stack input[type="range"]').forEach((input) => {
        input.dispatchEvent(new Event('input'));
      });
    }, 0);
  });
}

async function handleScalpPhoto(file) {
  if (!file.type.startsWith('image/')) return;
  const dataUrl = await readFileAsDataUrl(file);
  uploadPreview.src = dataUrl;
  uploadPreview.hidden = false;
  uploadEmpty.hidden = true;
  scalpImageDataUrl = dataUrl;
  scalpImageStatsPromise = estimateImageSignals(dataUrl);
  scalpImageStats = await scalpImageStatsPromise;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function estimateImageSignals(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 180;
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0, size, size);
      const { data } = context.getImageData(0, 0, size, size);
      let brightnessTotal = 0;
      let redTotal = 0;
      let yellowTotal = 0;
      let brightPixels = 0;
      const brightnessValues = [];

      for (let index = 0; index < data.length; index += 4) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const brightness = (red + green + blue) / 3;
        brightnessTotal += brightness;
        redTotal += Math.max(0, red - (green + blue) / 2);
        yellowTotal += Math.max(0, (red + green) / 2 - blue);
        if (brightness > 205 && red > 170 && green > 150) brightPixels += 1;
        brightnessValues.push(brightness);
      }

      const pixelCount = data.length / 4;
      const average = brightnessTotal / pixelCount;
      const variance = brightnessValues.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / pixelCount;

      resolve({
        shine: clampScore((brightPixels / pixelCount) * 24),
        redness: clampScore((redTotal / pixelCount) / 8),
        buildup: clampScore((yellowTotal / pixelCount) / 10 + Math.sqrt(variance) / 34),
        clarity: clampScore(5 - Math.sqrt(variance) / 28),
      });
    };
    image.onerror = () => resolve(null);
    image.src = dataUrl;
  });
}

function collectScalpInputs() {
  const checked = Array.from(scalpForm.querySelectorAll('.symptom-grid input:checked')).map((input) => input.value);
  return {
    oil: Number(document.querySelector('#oil-level').value),
    flakes: Number(document.querySelector('#flake-level').value),
    itch: Number(document.querySelector('#itch-level').value),
    shed: Number(document.querySelector('#shed-level').value),
    washFrequency: document.querySelector('#wash-frequency').value,
    hairState: document.querySelector('#hair-state').value,
    checked,
    notes: document.querySelector('#scalp-notes').value.trim(),
    imageStats: scalpImageStats,
    cloudConsent: Boolean(cloudConsent?.checked),
  };
}

async function renderScalpReport(input) {
  const scores = buildScores(input);
  const profile = chooseProfile(scores, input.checked);
  const signals = buildSignals(scores, input);
  const routine = buildRoutine(profile, scores, input);
  const talkTrack = buildTalkTrack(profile, scores);
  const warning = buildWarning(scores, input.checked);
  const confidence = input.imageStats ? '照片 + 自评' : '自评为主';
  const imageSignals = buildImageSignals(input.imageStats);
  const canUseCloud = Boolean(input.cloudConsent && scalpImageDataUrl);
  const generatedImage = await createScalpInsightImage({
    profile,
    scores,
    routine,
    warning,
    imageSignals,
    sourceImage: scalpImageDataUrl,
  });

  scalpReport.innerHTML = `
    <div class="report-title">
      <div>
        <p class="eyebrow">SCALP REPORT</p>
        <h3>${profile.title}</h3>
        <p>${profile.summary}</p>
      </div>
      <div class="report-type">
        <span>判断依据</span>
        <strong>${confidence}</strong>
      </div>
    </div>

    <div class="score-grid" aria-label="头皮分项评分">
      ${scoreTile('油脂', scores.oil)}
      ${scoreTile('屑感', scores.flakes)}
      ${scoreTile('敏感', scores.sensitivity)}
      ${scoreTile('发根', scores.root)}
    </div>

    <section class="generated-card">
      <div>
        <p class="eyebrow">GENERATED IMAGE</p>
        <h4>已生成头皮护理画像图</h4>
        <p>这张图把上传照片、初步画像、关键评分和三步护理建议合成到一张 PNG，适合保存或发给用户。</p>
      </div>
      <img class="generated-image" src="${generatedImage}" alt="生成的头皮护理画像图" />
    </section>

    <section class="cloud-poster" data-cloud-poster>
      ${renderCloudPosterShell(canUseCloud)}
    </section>

    <section class="report-section">
      <h4>图片分析信号</h4>
      <ul class="report-list">${imageSignals.map((item) => `<li>${item}</li>`).join('')}</ul>
    </section>

    <section class="report-section">
      <h4>初步了解</h4>
      <p>${profile.detail}</p>
    </section>

    <section class="report-section">
      <h4>可观察信号</h4>
      <ul class="report-list">${signals.map((item) => `<li>${item}</li>`).join('')}</ul>
    </section>

    <section class="report-section">
      <h4>建议护理方向</h4>
      <div class="routine-steps">
        ${routine.map((item, index) => `<div><span>STEP ${String(index + 1).padStart(2, '0')}</span><p>${item}</p></div>`).join('')}
      </div>
    </section>

    <section class="report-section">
      <h4>导购沟通话术</h4>
      <ul class="report-list">${talkTrack.map((item) => `<li>${item}</li>`).join('')}</ul>
    </section>

    <p class="report-warning">${warning}</p>
    <div class="report-actions">
      <button type="button" data-download-image>下载画像图</button>
      <button type="button" data-copy-report>复制报告</button>
      <button type="button" data-scroll-form>继续调整</button>
    </div>
  `;

  scalpReport.querySelector('[data-download-image]').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `scalp-care-${Date.now()}.png`;
    link.href = generatedImage;
    link.click();
  });
  scalpReport.querySelector('[data-copy-report]').addEventListener('click', () => {
    navigator.clipboard?.writeText(toPlainReport(profile, scores, signals, routine, talkTrack, warning));
  });
  scalpReport.querySelector('[data-scroll-form]').addEventListener('click', () => {
    scalpForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  if (canUseCloud) {
    requestCloudPoster({
      profile,
      scores,
      signals,
      routine,
      imageSignals,
      warning,
      notes: input.notes,
      sourceImage: scalpImageDataUrl,
    });
  }
}

function renderCloudPosterShell(canUseCloud) {
  if (!scalpImageDataUrl) {
    return `
      <div class="cloud-copy">
        <p class="eyebrow">AI POSTER</p>
        <h4>等待头皮照片</h4>
        <p>上传照片后，可勾选授权并调用聚合生图模型，生成更完整的 AI 护理海报。</p>
      </div>
    `;
  }

  if (!canUseCloud) {
    return `
      <div class="cloud-copy">
        <p class="eyebrow">AI POSTER</p>
        <h4>未启用聚合生图</h4>
        <p>当前只生成了本地画像图。勾选左侧授权后再次点击“分析并生成图片”，网页会调用聚合生图接口生成 AI 海报。</p>
      </div>
    `;
  }

  return `
    <div class="cloud-copy">
      <p class="eyebrow">AI POSTER</p>
      <h4>聚合生图生成中</h4>
      <p>正在把头皮图和分析结果发送到本地后端，由 gpt-5.5 理解图片，再由 gpt-image-2 生成海报，通常需要 1-3 分钟。</p>
    </div>
    <div class="cloud-loading" aria-hidden="true"><span></span></div>
  `;
}

async function requestCloudPoster(payload) {
  const target = scalpReport.querySelector('[data-cloud-poster]');
  if (!target) return;

  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 330000);
    const response = await fetch(`${API_BASE}/api/scalp-poster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    window.clearTimeout(timeout);

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new Error(result.error || `HTTP ${response.status}`);
    }

    const imageSrc = result.image_data_url || result.image_url;
    if (!imageSrc) throw new Error('接口没有返回图片地址。');
    const posterImage = await createAiPosterWithReadableText({
      backgroundImage: imageSrc,
      sourceImage: payload.sourceImage,
      analysis: result.analysis,
      profile: payload.profile,
      scores: payload.scores,
      routine: payload.routine,
      warning: payload.warning,
    }).catch(() => createAiPosterWithReadableText({
      backgroundImage: '',
      sourceImage: payload.sourceImage,
      analysis: result.analysis,
      profile: payload.profile,
      scores: payload.scores,
      routine: payload.routine,
      warning: payload.warning,
    }));

    target.innerHTML = `
      <div class="cloud-copy">
        <p class="eyebrow">AI POSTER</p>
        <h4>AI 护理海报已生成</h4>
        <p>根据你上传的头皮照片，AI 已给出可观察信号和按优先级排列的护理建议。下方海报可以直接保存或发给用户。</p>
        ${renderCloudAnalysis(result.analysis, result.analysis_ok)}
        <div class="cloud-actions">
          <a href="${escapeAttr(posterImage)}" target="_blank" rel="noreferrer">打开海报</a>
          <button type="button" data-download-ai-poster>下载海报</button>
        </div>
      </div>
      <img class="ai-generated-image" src="${escapeAttr(posterImage)}" alt="聚合生图生成并叠加清晰中文的头皮护理分析海报" />
    `;

    target.querySelector('[data-download-ai-poster]').addEventListener('click', () => {
      const link = document.createElement('a');
      link.href = posterImage;
      link.download = `ai-scalp-poster-${Date.now()}.png`;
      link.target = '_blank';
      link.click();
    });
  } catch (error) {
    target.innerHTML = `
      <div class="cloud-copy">
        <p class="eyebrow">AI POSTER</p>
        <h4>AI 海报生成失败</h4>
        <p>${escapeHtml(error.name === 'AbortError' ? '生成超时，请稍后重试或换一张更清晰的头皮图。' : error.message)}</p>
      </div>
    `;
  }
}

async function createAiPosterWithReadableText({ backgroundImage, sourceImage, analysis, profile, scores, routine, warning }) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  const background = await loadCanvasImage(backgroundImage);
  const source = sourceImage ? await loadCanvasImage(sourceImage) : null;
  const mergedScores = {
    oil: Number(analysis?.scores?.oil ?? scores?.oil ?? 0),
    flakes: Number(analysis?.scores?.flakes ?? scores?.flakes ?? 0),
    sensitivity: Number(analysis?.scores?.sensitivity ?? scores?.sensitivity ?? 0),
    root: Number(analysis?.scores?.root ?? scores?.root ?? 0),
  };
  const title = analysis?.scalp_type || profile?.title || '头皮护理画像';
  const subtitle = profile?.summary || analysis?.poster_brief || '基于头皮照片生成的日常护理观察。';
  const observations = normalizeDisplayList(analysis?.observations).slice(0, 3);
  const suggestions = normalizeDisplayList(analysis?.care_suggestions).slice(0, 3);
  const careSteps = suggestions.length ? suggestions : (Array.isArray(routine) ? routine.slice(0, 3) : []);
  const today = new Date().toLocaleDateString('zh-CN');

  ctx.fillStyle = '#f0ece4';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (background) {
    drawImageCover(ctx, background, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(244, 239, 229, .62)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const topGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  topGradient.addColorStop(0, 'rgba(20, 48, 41, .94)');
  topGradient.addColorStop(1, 'rgba(190, 160, 95, .82)');
  ctx.fillStyle = topGradient;
  ctx.fillRect(0, 0, canvas.width, 180);

  ctx.fillStyle = '#f8f3e8';
  ctx.font = '700 30px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillText('头皮护理分析海报', 64, 72);
  ctx.font = '400 22px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillText('Scalp Care Analysis', 64, 116);
  ctx.textAlign = 'right';
  ctx.fillText(today, canvas.width - 64, 94);
  ctx.textAlign = 'left';

  fillRoundRect(ctx, 64, 226, 952, 430, 26, 'rgba(255,255,255,.9)');
  if (source) {
    clipRoundRect(ctx, 88, 250, 370, 370, 22);
    drawImageCover(ctx, source, 88, 250, 370, 370);
    ctx.restore();
  }

  ctx.fillStyle = '#20352e';
  ctx.font = '500 48px "SimSun", "Songti SC", "Microsoft YaHei", serif';
  wrapCanvasText(ctx, title, 502, 304, 450, 58, 2);
  ctx.fillStyle = '#53635b';
  ctx.font = '400 24px "Microsoft YaHei", "PingFang SC", sans-serif';
  wrapCanvasText(ctx, subtitle, 502, 392, 448, 36, 3);

  drawPosterScore(ctx, '油脂', clampScore(mergedScores.oil), 502, 524, '#6b8f82');
  drawPosterScore(ctx, '屑感', clampScore(mergedScores.flakes), 502, 578, '#bea05f');
  drawPosterScore(ctx, '敏感', clampScore(mergedScores.sensitivity), 502, 632, '#8c5c66');

  fillRoundRect(ctx, 64, 706, 952, 250, 24, 'rgba(255,255,255,.9)');
  ctx.fillStyle = '#233730';
  ctx.font = '500 34px "SimSun", "Songti SC", "Microsoft YaHei", serif';
  ctx.fillText('AI 可见观察', 96, 766);
  ctx.fillStyle = '#516259';
  ctx.font = '400 23px "Microsoft YaHei", "PingFang SC", sans-serif';
  let observationY = 816;
  const visibleObservations = observations.length ? observations : ['照片清晰度、拍摄距离和光线会影响观察结果。'];
  visibleObservations.forEach((item) => {
    observationY = drawBulletText(ctx, item, 96, observationY, 850, 34, 2) + 8;
  });

  fillRoundRect(ctx, 64, 1000, 952, 214, 24, '#20382f');
  ctx.fillStyle = '#f6efe2';
  ctx.font = '500 34px "SimSun", "Songti SC", "Microsoft YaHei", serif';
  ctx.fillText('建议护理方向', 96, 1062);
  const stepWidth = 276;
  careSteps.slice(0, 3).forEach((step, index) => {
    const x = 96 + index * 306;
    ctx.fillStyle = '#cdb77f';
    ctx.font = '700 18px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.fillText(`STEP ${String(index + 1).padStart(2, '0')}`, x, 1112);
    ctx.fillStyle = '#f6efe2';
    ctx.font = '400 20px "Microsoft YaHei", "PingFang SC", sans-serif';
    wrapCanvasText(ctx, step, x, 1148, stepWidth, 30, 3);
  });

  ctx.fillStyle = '#6a332d';
  ctx.font = '400 20px "Microsoft YaHei", "PingFang SC", sans-serif';
  wrapCanvasText(ctx, warning || analysis?.safety_note || '本报告只用于日常洗护观察，不构成医疗诊断。', 64, 1282, 952, 30, 2);

  return canvas.toDataURL('image/png');
}

function renderCloudAnalysis(analysis, analysisOk) {
  if (!analysis) return '';

  const scores = analysis.scores || {};
  const observations = normalizeDisplayList(analysis.observations).slice(0, 3);
  const suggestions = normalizeDisplayList(analysis.care_suggestions).slice(0, 3);
  const scoreItems = [
    ['油脂', scores.oil],
    ['屑感', scores.flakes],
    ['敏感', scores.sensitivity],
    ['发根', scores.root],
  ].map(([label, value]) => `<span class="score-chip"><strong>${label}</strong><b>${formatDisplayScore(value)}</b></span>`).join('');
  const note = analysisOk === false
    ? 'gpt-5.5 图片理解暂时不可用，本次海报已使用页面初筛结果生成。'
    : escapeHtml(analysis.poster_brief || analysis.safety_note || '');

  return `
    <div class="cloud-analysis">
      <div class="cloud-analysis-head">
        <strong>${escapeHtml(analysis.scalp_type || 'AI 头皮观察')}</strong>
        <span>置信度：${escapeHtml(analysis.confidence || '中')} · 护理建议按优先级排列</span>
      </div>
      ${scoreItems ? `<div class="cloud-scores">${scoreItems}</div>` : ''}
      ${observations.length ? `
        <div class="cloud-block">
          <h5>图片可见观察</h5>
          <ul>${observations.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </div>
      ` : ''}
      ${suggestions.length ? `
        <div class="cloud-block cloud-advice">
          <h5>根据你的头皮情况，建议这样护理</h5>
          <ol>${suggestions.map((item, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span><p>${escapeHtml(item)}</p></li>`).join('')}</ol>
        </div>
      ` : ''}
      ${note ? `<small>${note}</small>` : ''}
    </div>
  `;
}

function normalizeDisplayList(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(/[；;\n]/);
  return list.map((item) => String(item || '').trim()).filter(Boolean);
}

function formatDisplayScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0.0';
  return Math.max(0, Math.min(5, number)).toFixed(1);
}

function buildImageSignals(stats) {
  if (!stats) {
    return ['未读取到照片信号，本次图片按用户自评内容生成。'];
  }
  return [
    `油光/反光估计：${stats.shine.toFixed(1)} / 5，用于辅助判断出油和发根清爽度。`,
    `泛红倾向估计：${stats.redness.toFixed(1)} / 5，用于辅助判断头皮刺激感。`,
    `堆积/屑感估计：${stats.buildup.toFixed(1)} / 5，用于辅助判断可见残留或屑感。`,
    `照片清晰度估计：${stats.clarity.toFixed(1)} / 5，清晰度越高，图片参考价值越高。`,
  ];
}

async function createScalpInsightImage({ profile, scores, routine, warning, imageSignals, sourceImage }) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  const source = sourceImage ? await loadCanvasImage(sourceImage) : null;

  ctx.fillStyle = '#f2efe7';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#19352d');
  gradient.addColorStop(0.52, '#6b8f82');
  gradient.addColorStop(1, '#c7ae75');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, 176);

  ctx.fillStyle = '#f8f3e8';
  ctx.font = '700 30px "Microsoft YaHei", sans-serif';
  ctx.fillText('头皮护理画像', 64, 72);
  ctx.font = '400 22px "Microsoft YaHei", sans-serif';
  ctx.fillText('Scalp Care Snapshot', 64, 116);
  ctx.textAlign = 'right';
  ctx.fillText(new Date().toLocaleDateString('zh-CN'), canvas.width - 64, 94);
  ctx.textAlign = 'left';

  fillRoundRect(ctx, 64, 220, 430, 430, 24, '#ffffff');
  if (source) {
    clipRoundRect(ctx, 82, 238, 394, 394, 20);
    drawImageCover(ctx, source, 82, 238, 394, 394);
    ctx.restore();
  } else {
    fillRoundRect(ctx, 82, 238, 394, 394, 20, '#e3e9e5');
    ctx.fillStyle = '#5f7168';
    ctx.font = '500 28px "Microsoft YaHei", sans-serif';
    ctx.fillText('未上传照片', 206, 420);
    ctx.font = '400 20px "Microsoft YaHei", sans-serif';
    ctx.fillText('按用户自评生成', 192, 462);
  }

  ctx.fillStyle = '#53635b';
  ctx.font = '400 20px "Microsoft YaHei", sans-serif';
  ctx.fillText(source ? '用户上传图像' : '图像占位', 92, 690);

  fillRoundRect(ctx, 536, 220, 480, 430, 24, '#ffffff');
  ctx.fillStyle = '#233730';
  ctx.font = '500 46px "SimSun", "Songti SC", serif';
  wrapCanvasText(ctx, profile.title, 574, 292, 386, 56, 2);
  ctx.fillStyle = '#53635b';
  ctx.font = '400 24px "Microsoft YaHei", sans-serif';
  wrapCanvasText(ctx, profile.summary, 574, 370, 384, 36, 3);

  drawPosterScore(ctx, '油脂', scores.oil, 574, 486, '#6b8f82');
  drawPosterScore(ctx, '屑感', scores.flakes, 574, 538, '#bea05f');
  drawPosterScore(ctx, '敏感', scores.sensitivity, 574, 590, '#8c5c66');
  drawPosterScore(ctx, '发根', scores.root, 574, 642, '#425f58');

  fillRoundRect(ctx, 64, 750, 952, 236, 24, '#ffffff');
  ctx.fillStyle = '#233730';
  ctx.font = '500 34px "SimSun", "Songti SC", serif';
  ctx.fillText('图片分析信号', 96, 812);
  ctx.fillStyle = '#516259';
  ctx.font = '400 22px "Microsoft YaHei", sans-serif';
  let signalY = 858;
  imageSignals.slice(0, 3).forEach((item) => {
    signalY = wrapCanvasText(ctx, item, 96, signalY, 860, 34, 2) + 8;
  });

  fillRoundRect(ctx, 64, 1030, 952, 210, 24, '#213930');
  ctx.fillStyle = '#f6efe2';
  ctx.font = '500 34px "SimSun", "Songti SC", serif';
  ctx.fillText('建议护理方向', 96, 1092);
  ctx.font = '400 22px "Microsoft YaHei", sans-serif';
  const stepWidth = 274;
  routine.forEach((step, index) => {
    const x = 96 + index * 304;
    ctx.fillStyle = '#cdb77f';
    ctx.font = '700 18px "Microsoft YaHei", sans-serif';
    ctx.fillText(`STEP ${String(index + 1).padStart(2, '0')}`, x, 1142);
    ctx.fillStyle = '#f6efe2';
    ctx.font = '400 20px "Microsoft YaHei", sans-serif';
    wrapCanvasText(ctx, step, x, 1178, stepWidth, 30, 3);
  });

  ctx.fillStyle = '#6a332d';
  ctx.font = '400 20px "Microsoft YaHei", sans-serif';
  wrapCanvasText(ctx, warning, 64, 1290, 952, 30, 2);

  return canvas.toDataURL('image/png');
}

function loadCanvasImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    if (/^https?:\/\//i.test(src)) {
      image.crossOrigin = 'anonymous';
    }
    image.src = src;
  });
}

function drawPosterScore(ctx, label, score, x, y, color) {
  ctx.fillStyle = '#233730';
  ctx.font = '500 22px "Microsoft YaHei", sans-serif';
  ctx.fillText(label, x, y);
  ctx.fillStyle = '#e6e1d6';
  fillRoundRect(ctx, x + 68, y - 18, 250, 18, 9, '#e6e1d6');
  fillRoundRect(ctx, x + 68, y - 18, 250 * (score / 5), 18, 9, color);
  ctx.fillStyle = color;
  ctx.font = '700 22px Georgia, serif';
  ctx.fillText(score.toFixed(1), x + 340, y);
}

function drawBulletText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  ctx.fillStyle = '#6b8f82';
  ctx.beginPath();
  ctx.arc(x + 5, y - 8, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#516259';
  return wrapCanvasText(ctx, text, x + 24, y, maxWidth - 24, lineHeight, maxLines);
}

function drawImageCover(ctx, image, x, y, width, height) {
  const ratio = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * ratio;
  const drawHeight = image.height * ratio;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const chars = Array.from(String(text));
  let line = '';
  let lines = 0;
  for (const char of chars) {
    const testLine = line + char;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      lines += 1;
      line = char;
      if (lines >= maxLines - 1) break;
    } else {
      line = testLine;
    }
  }
  if (line && lines < maxLines) {
    ctx.fillText(line, x, y);
  }
  return y;
}

function clipRoundRect(ctx, x, y, width, height, radius) {
  ctx.save();
  roundedPath(ctx, x, y, width, height, radius);
  ctx.clip();
}

function fillRoundRect(ctx, x, y, width, height, radius, fillStyle) {
  ctx.fillStyle = fillStyle;
  roundedPath(ctx, x, y, width, height, radius);
  ctx.fill();
}

function roundedPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function buildScores(input) {
  const photo = input.imageStats || {};
  const symptom = (name) => input.checked.includes(name);
  return {
    oil: clampScore(input.oil + (photo.shine || 0) * 0.34 + (symptom('洗后很快出油') ? 1 : 0) + (symptom('发根塌') ? 0.5 : 0)),
    flakes: clampScore(input.flakes + (photo.buildup || 0) * 0.28 + (symptom('有明显头屑') ? 1 : 0)),
    sensitivity: clampScore(input.itch + (photo.redness || 0) * 0.42 + (symptom('容易泛红') ? 1.2 : 0) + (symptom('染烫后敏感') ? 0.8 : 0) + (symptom('头皮紧绷') ? 0.6 : 0)),
    root: clampScore(input.shed + (symptom('局部稀疏') ? 1.4 : 0) + (input.hairState === 'fine' ? 0.6 : 0)),
  };
}

function chooseProfile(scores, checked) {
  if (scores.sensitivity >= 4) {
    return {
      title: '敏感易刺激型头皮',
      summary: '当前更需要关注舒缓、温和清洁和减少刺激源。',
      detail: '用户反馈的瘙痒、刺痛、泛红或染烫后敏感信号较强。建议先把护理目标从“强清洁”调整为“稳定头皮感受”，减少高频去油和复杂叠加产品。',
    };
  }
  if (scores.flakes >= 3.5 && scores.oil >= 3) {
    return {
      title: '油屑混合型头皮',
      summary: '油脂、头屑和发根塌感可能同时存在。',
      detail: '这类用户常见困扰是洗后不久变油、视觉上有屑感、发根不够清爽。沟通时可把重点放在头皮清洁节奏、减少堆积感和保持发根轻盈。',
    };
  }
  if (scores.oil >= 4) {
    return {
      title: '油脂旺盛型头皮',
      summary: '当前重点是净澈油脂和维持头皮清爽感。',
      detail: '出油速度偏快时，用户往往会感到发根塌、头顶扁、洗后清爽维持时间短。建议建立规律清洁节奏，避免只追求强去油带来的紧绷反复。',
    };
  }
  if (scores.flakes >= 3.5) {
    return {
      title: '干屑紧绷型头皮',
      summary: '屑感明显，但油脂分数不高，更适合温和清洁。',
      detail: '当屑感与紧绷同时出现时，沟通重点不是“洗得更猛”，而是保持头皮屏障舒适度、降低刺激、观察换季和洗护频率对头皮的影响。',
    };
  }
  if (scores.root >= 4 || checked.includes('局部稀疏')) {
    return {
      title: '发根脆弱关注型',
      summary: '掉发困扰或局部稀疏是用户最需要被回应的问题。',
      detail: '这类用户通常更在意梳洗时掉发、头顶视觉稀疏和发根支撑感。建议结合清洁后护理，帮助用户建立可坚持的长期观察周期。',
    };
  }
  return {
    title: '日常稳态维护型头皮',
    summary: '当前信号整体温和，适合做预防型、习惯型护理。',
    detail: '用户目前没有特别突出的强困扰，可以围绕清洁、蓬松、发根养护和规律记录建立日常护理方案。',
  };
}

function buildSignals(scores, input) {
  const signals = [];
  const frequencyText = {
    daily: '用户每天洗头，需留意过度清洁后的紧绷或干痒感。',
    'two-days': '用户 2-3 天洗一次，适合围绕清爽维持时间观察护理效果。',
    weekly: '用户洗头频率较低，头皮油脂与造型残留堆积可能更值得关注。',
    unstable: '用户洗护节奏不固定，建议先建立可坚持的观察周期。',
  };
  signals.push(frequencyText[input.washFrequency]);
  if (scores.oil >= 3.5) signals.push('油脂分数偏高，发根塌、头顶扁和清爽感维持时间短会是核心沟通点。');
  if (scores.flakes >= 3.5) signals.push('屑感分数偏高，建议区分干屑、油屑和产品残留，避免直接下诊断结论。');
  if (scores.sensitivity >= 3.5) signals.push('敏感分数偏高，应优先强调温和、舒缓和减少刺激。');
  if (scores.root >= 3.5) signals.push('发根分数偏高，用户可能更关注掉发观感、发缝宽度和发根支撑。');
  if (input.imageStats) signals.push('照片估算仅作为辅助，强光、阴影、发量遮挡和拍摄距离都会影响可见结果。');
  if (input.notes) signals.push(`用户补充：${escapeHtml(input.notes)}`);
  return signals;
}

function buildRoutine(profile, scores, input) {
  const first = scores.oil >= 3.5
    ? '白瓶用于头皮与发根清洁，重点按摩易出油区域，帮助减少油脂和堆积感。'
    : '白瓶用于温和清洁头皮与发丝，减少清洁不足或过度清洁带来的不适。';
  const second = scores.sensitivity >= 3.5
    ? '洗后先观察头皮舒适度，减少频繁叠加刺激型产品，优先建立稳定耐受。'
    : '洗后保持头皮清爽，再按说明使用黑瓶，把护理集中到发根位置。';
  const third = input.hairState === 'fine' || scores.root >= 3.5
    ? '连续记录 2-4 周的出油、掉发和发根蓬松感，用周期变化而不是单次感受判断。'
    : '维持固定洗护节奏，记录清爽维持时间、屑感变化和头皮舒适度。';
  return [first, second, third];
}

function buildTalkTrack(profile, scores) {
  const lines = [
    `你的头皮画像更接近“${profile.title}”，我们先从你最明显的困扰入手，而不是直接推荐同一套用法。`,
    '这份结果是护理观察，不是医疗诊断；我们会用可坚持的洗护节奏帮你记录变化。',
  ];
  if (scores.oil >= 3.5) lines.push('如果你最在意出油和塌发，重点看洗后 24 小时的发根清爽度。');
  if (scores.sensitivity >= 3.5) lines.push('如果你容易痒或泛红，先把温和度和舒适感放在第一位。');
  if (scores.root >= 3.5) lines.push('如果你更担心掉发，我们建议搭配发根护理，并用照片定期对比。');
  return lines;
}

function buildWarning(scores, checked) {
  const needCare = scores.sensitivity >= 4.5 || scores.root >= 4.5 || checked.includes('局部稀疏');
  if (needCare) {
    return '提醒：如果头皮持续疼痛、明显红肿、渗液、结痂、斑片状脱发或短期大量掉发，请尽快咨询皮肤科医生。本报告只用于洗护沟通和日常观察。';
  }
  return '提醒：本报告只用于洗护沟通和日常观察，不构成医疗诊断。若不适持续或加重，请咨询皮肤科医生。';
}

function scoreTile(label, value) {
  return `<div class="score-tile"><strong>${value.toFixed(1)}</strong><span>${label} / 5</span></div>`;
}

function toPlainReport(profile, scores, signals, routine, talkTrack, warning) {
  return [
    `头皮画像：${profile.title}`,
    profile.summary,
    `评分：油脂 ${scores.oil.toFixed(1)} / 屑感 ${scores.flakes.toFixed(1)} / 敏感 ${scores.sensitivity.toFixed(1)} / 发根 ${scores.root.toFixed(1)}`,
    `可观察信号：${signals.join('；')}`,
    `护理方向：${routine.join('；')}`,
    `沟通话术：${talkTrack.join('；')}`,
    warning,
  ].join('\n');
}

function clampScore(value) {
  return Math.max(0, Math.min(5, Number(value) || 0));
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(String(value || ''));
}
