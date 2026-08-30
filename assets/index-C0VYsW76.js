(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))s(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const l of a.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&s(l)}).observe(document,{childList:!0,subtree:!0});function o(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function s(r){if(r.ep)return;r.ep=!0;const a=o(r);fetch(r.href,a)}})();const J=document.querySelector(".site-header"),oe=document.querySelector(".scroll-progress span"),R=document.querySelector("#official-film"),F=document.querySelector(".film-section"),E=document.querySelector("#image-dialog"),G=E.querySelector("img"),M=document.querySelector("#scalp-form"),q=document.querySelector("#scalp-report"),O=document.querySelector("#scalp-photo"),k=document.querySelector("[data-upload-zone]"),P=document.querySelector(".upload-preview"),N=document.querySelector(".upload-empty"),ie=document.querySelector("#cloud-consent");let C=null,x=null,A=null;const ne=window.location.port==="5173"?"http://127.0.0.1:8787":"",K=()=>{const e=document.documentElement.scrollHeight-window.innerHeight,t=e>0?window.scrollY/e:0;oe.style.width=`${Math.min(100,t*100)}%`,J.classList.toggle("scrolled",window.scrollY>24)};window.addEventListener("scroll",K,{passive:!0});K();const X=new IntersectionObserver(e=>{e.forEach(t=>{t.isIntersecting&&(t.target.classList.add("is-visible"),X.unobserve(t.target))})},{threshold:.12,rootMargin:"0px 0px -5% 0px"});document.querySelectorAll(".reveal").forEach(e=>X.observe(e));const Z=new IntersectionObserver(e=>{e.forEach(t=>{if(!t.isIntersecting)return;const o=t.target,s=Number(o.dataset.counter),r=Number(o.dataset.pad||0),a=s>100?1500:900,l=performance.now(),i=n=>{const d=Math.min(1,(n-l)/a),f=1-Math.pow(1-d,3),c=Math.round(s*f);o.textContent=String(c).padStart(r,"0"),d<1&&requestAnimationFrame(i)};requestAnimationFrame(i),Z.unobserve(o)})},{threshold:.65});document.querySelectorAll("[data-counter]").forEach(e=>Z.observe(e));const U=document.querySelector(".immersive-effect");U&&new IntersectionObserver(([t])=>{J.classList.toggle("hide-brand",t.isIntersecting)},{threshold:.04}).observe(U);document.querySelectorAll("[data-play-film]").forEach(e=>{e.addEventListener("click",async()=>{F.scrollIntoView({behavior:"smooth",block:"center"}),window.setTimeout(()=>R.play().catch(()=>{}),650)})});R.addEventListener("play",()=>F.classList.add("playing"));R.addEventListener("pause",()=>F.classList.remove("playing"));R.addEventListener("ended",()=>F.classList.remove("playing"));document.querySelectorAll("[data-open-image]").forEach(e=>{e.addEventListener("click",()=>{G.src=e.dataset.openImage,G.alt=e.dataset.imageAlt||"完整资料图",E.showModal()})});E.querySelector(".dialog-close").addEventListener("click",()=>E.close());E.addEventListener("click",e=>{e.target===E&&E.close()});document.querySelectorAll('.range-stack input[type="range"]').forEach(e=>{const t=e.closest("label").querySelector("output"),o=()=>{t.value=e.value};e.addEventListener("input",o),o()});k&&O&&(["dragenter","dragover"].forEach(e=>{k.addEventListener(e,t=>{t.preventDefault(),k.classList.add("dragging")})}),["dragleave","drop"].forEach(e=>{k.addEventListener(e,()=>k.classList.remove("dragging"))}),k.addEventListener("drop",e=>{e.preventDefault();const[t]=e.dataTransfer.files;t&&W(t)}),O.addEventListener("change",()=>{const[e]=O.files;e&&W(e)}));M&&(M.addEventListener("submit",async e=>{e.preventDefault(),x&&(C=await x),await le(ae())}),M.addEventListener("reset",()=>{window.setTimeout(()=>{C=null,x=null,A=null,P&&(P.hidden=!0,P.removeAttribute("src")),N&&(N.hidden=!1),q.innerHTML=`
        <div class="report-empty">
          <p class="eyebrow">REPORT PREVIEW</p>
          <h3>等待生成图片</h3>
          <p>上传照片并填写状态后，这里会先分析头皮信号，再生成一张可下载的头皮护理画像图。</p>
        </div>
      `,document.querySelectorAll('.range-stack input[type="range"]').forEach(e=>{e.dispatchEvent(new Event("input"))})},0)}));async function W(e){if(!e.type.startsWith("image/"))return;const t=await re(e);P.src=t,P.hidden=!1,N.hidden=!0,A=t,x=se(t),C=await x}function re(e){return new Promise((t,o)=>{const s=new FileReader;s.onload=()=>t(s.result),s.onerror=o,s.readAsDataURL(e)})}function se(e){return new Promise(t=>{const o=new Image;o.onload=()=>{const s=document.createElement("canvas"),r=180;s.width=r,s.height=r;const a=s.getContext("2d",{willReadFrequently:!0});a.drawImage(o,0,0,r,r);const{data:l}=a.getImageData(0,0,r,r);let i=0,n=0,d=0,f=0;const c=[];for(let g=0;g<l.length;g+=4){const v=l[g],T=l[g+1],b=l[g+2],I=(v+T+b)/3;i+=I,n+=Math.max(0,v-(T+b)/2),d+=Math.max(0,(v+T)/2-b),I>205&&v>170&&T>150&&(f+=1),c.push(I)}const u=l.length/4,$=i/u,S=c.reduce((g,v)=>g+Math.pow(v-$,2),0)/u;t({shine:p(f/u*24),redness:p(n/u/8),buildup:p(d/u/10+Math.sqrt(S)/34),clarity:p(5-Math.sqrt(S)/28)})},o.onerror=()=>t(null),o.src=e})}function ae(){const e=Array.from(M.querySelectorAll(".symptom-grid input:checked")).map(t=>t.value);return{oil:Number(document.querySelector("#oil-level").value),flakes:Number(document.querySelector("#flake-level").value),itch:Number(document.querySelector("#itch-level").value),shed:Number(document.querySelector("#shed-level").value),washFrequency:document.querySelector("#wash-frequency").value,hairState:document.querySelector("#hair-state").value,checked:e,notes:document.querySelector("#scalp-notes").value.trim(),imageStats:C,cloudConsent:!!ie?.checked}}async function le(e){const t=he(e),o=Se(t,e.checked),s=ve(t,e),r=ye(o,t,e),a=be(o,t),l=we(t,e.checked),i=e.imageStats?"照片 + 自评":"自评为主",n=pe(e.imageStats),d=!!(e.cloudConsent&&A),f=await ge({profile:o,scores:t,routine:r,warning:l,imageSignals:n,sourceImage:A});q.innerHTML=`
    <div class="report-title">
      <div>
        <p class="eyebrow">SCALP REPORT</p>
        <h3>${o.title}</h3>
        <p>${o.summary}</p>
      </div>
      <div class="report-type">
        <span>判断依据</span>
        <strong>${i}</strong>
      </div>
    </div>

    <div class="score-grid" aria-label="头皮分项评分">
      ${L("油脂",t.oil)}
      ${L("屑感",t.flakes)}
      ${L("敏感",t.sensitivity)}
      ${L("发根",t.root)}
    </div>

    <section class="generated-card">
      <div>
        <p class="eyebrow">GENERATED IMAGE</p>
        <h4>已生成头皮护理画像图</h4>
        <p>这张图把上传照片、初步画像、关键评分和三步护理建议合成到一张 PNG，适合保存或发给用户。</p>
      </div>
      <img class="generated-image" src="${f}" alt="生成的头皮护理画像图" />
    </section>

    <section class="cloud-poster" data-cloud-poster>
      ${ce(d)}
    </section>

    <section class="report-section">
      <h4>图片分析信号</h4>
      <ul class="report-list">${n.map(c=>`<li>${c}</li>`).join("")}</ul>
    </section>

    <section class="report-section">
      <h4>初步了解</h4>
      <p>${o.detail}</p>
    </section>

    <section class="report-section">
      <h4>可观察信号</h4>
      <ul class="report-list">${s.map(c=>`<li>${c}</li>`).join("")}</ul>
    </section>

    <section class="report-section">
      <h4>建议护理方向</h4>
      <div class="routine-steps">
        ${r.map((c,u)=>`<div><span>STEP ${String(u+1).padStart(2,"0")}</span><p>${c}</p></div>`).join("")}
      </div>
    </section>

    <section class="report-section">
      <h4>导购沟通话术</h4>
      <ul class="report-list">${a.map(c=>`<li>${c}</li>`).join("")}</ul>
    </section>

    <p class="report-warning">${l}</p>
    <div class="report-actions">
      <button type="button" data-download-image>下载画像图</button>
      <button type="button" data-copy-report>复制报告</button>
      <button type="button" data-scroll-form>继续调整</button>
    </div>
  `,q.querySelector("[data-download-image]").addEventListener("click",()=>{const c=document.createElement("a");c.download=`scalp-care-${Date.now()}.png`,c.href=f,c.click()}),q.querySelector("[data-copy-report]").addEventListener("click",()=>{navigator.clipboard?.writeText(Ee(o,t,s,r,a,l))}),q.querySelector("[data-scroll-form]").addEventListener("click",()=>{M.scrollIntoView({behavior:"smooth",block:"center"})}),d&&de({profile:o,scores:t,signals:s,routine:r,imageSignals:n,warning:l,notes:e.notes,sourceImage:A})}function ce(e){return A?e?`
    <div class="cloud-copy">
      <p class="eyebrow">AI POSTER</p>
      <h4>聚合生图生成中</h4>
      <p>正在把头皮图和分析结果发送到本地后端，由 gpt-5.5 理解图片，再由 gpt-image-2 生成海报，通常需要 1-3 分钟。</p>
    </div>
    <div class="cloud-loading" aria-hidden="true"><span></span></div>
  `:`
      <div class="cloud-copy">
        <p class="eyebrow">AI POSTER</p>
        <h4>未启用聚合生图</h4>
        <p>当前只生成了本地画像图。勾选左侧授权后再次点击“分析并生成图片”，网页会调用聚合生图接口生成 AI 海报。</p>
      </div>
    `:`
      <div class="cloud-copy">
        <p class="eyebrow">AI POSTER</p>
        <h4>等待头皮照片</h4>
        <p>上传照片后，可勾选授权并调用聚合生图模型，生成更完整的 AI 护理海报。</p>
      </div>
    `}async function de(e){const t=q.querySelector("[data-cloud-poster]");if(t)try{const o=new AbortController,s=window.setTimeout(()=>o.abort(),33e4),r=await fetch(`${ne}/api/scalp-poster`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e),signal:o.signal});window.clearTimeout(s);const a=await r.json().catch(()=>({}));if(!r.ok||!a.ok)throw new Error(a.error||`HTTP ${r.status}`);const l=a.image_data_url||a.image_url;if(!l)throw new Error("接口没有返回图片地址。");const i=await z({backgroundImage:l,sourceImage:e.sourceImage,analysis:a.analysis,profile:e.profile,scores:e.scores,routine:e.routine,warning:e.warning}).catch(()=>z({backgroundImage:"",sourceImage:e.sourceImage,analysis:a.analysis,profile:e.profile,scores:e.scores,routine:e.routine,warning:e.warning}));t.innerHTML=`
      <div class="cloud-copy">
        <p class="eyebrow">AI POSTER</p>
        <h4>AI 护理海报已生成</h4>
        <p>根据你上传的头皮照片，AI 已给出可观察信号和按优先级排列的护理建议。下方海报可以直接保存或发给用户。</p>
        ${fe(a.analysis,a.analysis_ok)}
        <div class="cloud-actions">
          <a href="${V(i)}" target="_blank" rel="noreferrer">打开海报</a>
          <button type="button" data-download-ai-poster>下载海报</button>
        </div>
      </div>
      <img class="ai-generated-image" src="${V(i)}" alt="聚合生图生成并叠加清晰中文的头皮护理分析海报" />
    `,t.querySelector("[data-download-ai-poster]").addEventListener("click",()=>{const n=document.createElement("a");n.href=i,n.download=`ai-scalp-poster-${Date.now()}.png`,n.target="_blank",n.click()})}catch(o){t.innerHTML=`
      <div class="cloud-copy">
        <p class="eyebrow">AI POSTER</p>
        <h4>AI 海报生成失败</h4>
        <p>${y(o.name==="AbortError"?"生成超时，请稍后重试或换一张更清晰的头皮图。":o.message)}</p>
      </div>
    `}}async function z({backgroundImage:e,sourceImage:t,analysis:o,profile:s,scores:r,routine:a,warning:l}){const i=document.createElement("canvas");i.width=1080,i.height=1350;const n=i.getContext("2d"),d=await D(e),f=t?await D(t):null,c={oil:Number(o?.scores?.oil??r?.oil??0),flakes:Number(o?.scores?.flakes??r?.flakes??0),sensitivity:Number(o?.scores?.sensitivity??r?.sensitivity??0),root:Number(o?.scores?.root??r?.root??0)},u=o?.scalp_type||s?.title||"头皮护理画像",$=s?.summary||o?.poster_brief||"基于头皮照片生成的日常护理观察。",S=H(o?.observations).slice(0,3),g=H(o?.care_suggestions).slice(0,3),v=g.length?g:Array.isArray(a)?a.slice(0,3):[],T=new Date().toLocaleDateString("zh-CN");n.fillStyle="#f0ece4",n.fillRect(0,0,i.width,i.height),d&&(_(n,d,0,0,i.width,i.height),n.fillStyle="rgba(244, 239, 229, .62)",n.fillRect(0,0,i.width,i.height));const b=n.createLinearGradient(0,0,i.width,0);b.addColorStop(0,"rgba(20, 48, 41, .94)"),b.addColorStop(1,"rgba(190, 160, 95, .82)"),n.fillStyle=b,n.fillRect(0,0,i.width,180),n.fillStyle="#f8f3e8",n.font='700 30px "Microsoft YaHei", "PingFang SC", sans-serif',n.fillText("头皮护理分析海报",64,72),n.font='400 22px "Microsoft YaHei", "PingFang SC", sans-serif',n.fillText("Scalp Care Analysis",64,116),n.textAlign="right",n.fillText(T,i.width-64,94),n.textAlign="left",h(n,64,226,952,430,26,"rgba(255,255,255,.9)"),f&&(Q(n,88,250,370,370,22),_(n,f,88,250,370,370),n.restore()),n.fillStyle="#20352e",n.font='500 48px "SimSun", "Songti SC", "Microsoft YaHei", serif',m(n,u,502,304,450,58,2),n.fillStyle="#53635b",n.font='400 24px "Microsoft YaHei", "PingFang SC", sans-serif',m(n,$,502,392,448,36,3),w(n,"油脂",p(c.oil),502,524,"#6b8f82"),w(n,"屑感",p(c.flakes),502,578,"#bea05f"),w(n,"敏感",p(c.sensitivity),502,632,"#8c5c66"),h(n,64,706,952,250,24,"rgba(255,255,255,.9)"),n.fillStyle="#233730",n.font='500 34px "SimSun", "Songti SC", "Microsoft YaHei", serif',n.fillText("AI 可见观察",96,766),n.fillStyle="#516259",n.font='400 23px "Microsoft YaHei", "PingFang SC", sans-serif';let I=816;(S.length?S:["照片清晰度、拍摄距离和光线会影响观察结果。"]).forEach(Y=>{I=me(n,Y,96,I,850,34,2)+8}),h(n,64,1e3,952,214,24,"#20382f"),n.fillStyle="#f6efe2",n.font='500 34px "SimSun", "Songti SC", "Microsoft YaHei", serif',n.fillText("建议护理方向",96,1062);const te=276;return v.slice(0,3).forEach((Y,j)=>{const B=96+j*306;n.fillStyle="#cdb77f",n.font='700 18px "Microsoft YaHei", "PingFang SC", sans-serif',n.fillText(`STEP ${String(j+1).padStart(2,"0")}`,B,1112),n.fillStyle="#f6efe2",n.font='400 20px "Microsoft YaHei", "PingFang SC", sans-serif',m(n,Y,B,1148,te,30,3)}),n.fillStyle="#6a332d",n.font='400 20px "Microsoft YaHei", "PingFang SC", sans-serif',m(n,l||o?.safety_note||"本报告只用于日常洗护观察，不构成医疗诊断。",64,1282,952,30,2),i.toDataURL("image/png")}function fe(e,t){if(!e)return"";const o=e.scores||{},s=H(e.observations).slice(0,3),r=H(e.care_suggestions).slice(0,3),a=[["油脂",o.oil],["屑感",o.flakes],["敏感",o.sensitivity],["发根",o.root]].map(([i,n])=>`<span class="score-chip"><strong>${i}</strong><b>${ue(n)}</b></span>`).join(""),l=t===!1?"gpt-5.5 图片理解暂时不可用，本次海报已使用页面初筛结果生成。":y(e.poster_brief||e.safety_note||"");return`
    <div class="cloud-analysis">
      <div class="cloud-analysis-head">
        <strong>${y(e.scalp_type||"AI 头皮观察")}</strong>
        <span>置信度：${y(e.confidence||"中")} · 护理建议按优先级排列</span>
      </div>
      ${a?`<div class="cloud-scores">${a}</div>`:""}
      ${s.length?`
        <div class="cloud-block">
          <h5>图片可见观察</h5>
          <ul>${s.map(i=>`<li>${y(i)}</li>`).join("")}</ul>
        </div>
      `:""}
      ${r.length?`
        <div class="cloud-block cloud-advice">
          <h5>根据你的头皮情况，建议这样护理</h5>
          <ol>${r.map((i,n)=>`<li><span>${String(n+1).padStart(2,"0")}</span><p>${y(i)}</p></li>`).join("")}</ol>
        </div>
      `:""}
      ${l?`<small>${l}</small>`:""}
    </div>
  `}function H(e){return(Array.isArray(e)?e:String(e||"").split(/[；;\n]/)).map(o=>String(o||"").trim()).filter(Boolean)}function ue(e){const t=Number(e);return Number.isFinite(t)?Math.max(0,Math.min(5,t)).toFixed(1):"0.0"}function pe(e){return e?[`油光/反光估计：${e.shine.toFixed(1)} / 5，用于辅助判断出油和发根清爽度。`,`泛红倾向估计：${e.redness.toFixed(1)} / 5，用于辅助判断头皮刺激感。`,`堆积/屑感估计：${e.buildup.toFixed(1)} / 5，用于辅助判断可见残留或屑感。`,`照片清晰度估计：${e.clarity.toFixed(1)} / 5，清晰度越高，图片参考价值越高。`]:["未读取到照片信号，本次图片按用户自评内容生成。"]}async function ge({profile:e,scores:t,routine:o,warning:s,imageSignals:r,sourceImage:a}){const l=document.createElement("canvas");l.width=1080,l.height=1350;const i=l.getContext("2d"),n=a?await D(a):null;i.fillStyle="#f2efe7",i.fillRect(0,0,l.width,l.height);const d=i.createLinearGradient(0,0,l.width,l.height);d.addColorStop(0,"#19352d"),d.addColorStop(.52,"#6b8f82"),d.addColorStop(1,"#c7ae75"),i.fillStyle=d,i.fillRect(0,0,l.width,176),i.fillStyle="#f8f3e8",i.font='700 30px "Microsoft YaHei", sans-serif',i.fillText("头皮护理画像",64,72),i.font='400 22px "Microsoft YaHei", sans-serif',i.fillText("Scalp Care Snapshot",64,116),i.textAlign="right",i.fillText(new Date().toLocaleDateString("zh-CN"),l.width-64,94),i.textAlign="left",h(i,64,220,430,430,24,"#ffffff"),n?(Q(i,82,238,394,394,20),_(i,n,82,238,394,394),i.restore()):(h(i,82,238,394,394,20,"#e3e9e5"),i.fillStyle="#5f7168",i.font='500 28px "Microsoft YaHei", sans-serif',i.fillText("未上传照片",206,420),i.font='400 20px "Microsoft YaHei", sans-serif',i.fillText("按用户自评生成",192,462)),i.fillStyle="#53635b",i.font='400 20px "Microsoft YaHei", sans-serif',i.fillText(n?"用户上传图像":"图像占位",92,690),h(i,536,220,480,430,24,"#ffffff"),i.fillStyle="#233730",i.font='500 46px "SimSun", "Songti SC", serif',m(i,e.title,574,292,386,56,2),i.fillStyle="#53635b",i.font='400 24px "Microsoft YaHei", sans-serif',m(i,e.summary,574,370,384,36,3),w(i,"油脂",t.oil,574,486,"#6b8f82"),w(i,"屑感",t.flakes,574,538,"#bea05f"),w(i,"敏感",t.sensitivity,574,590,"#8c5c66"),w(i,"发根",t.root,574,642,"#425f58"),h(i,64,750,952,236,24,"#ffffff"),i.fillStyle="#233730",i.font='500 34px "SimSun", "Songti SC", serif',i.fillText("图片分析信号",96,812),i.fillStyle="#516259",i.font='400 22px "Microsoft YaHei", sans-serif';let f=858;r.slice(0,3).forEach(u=>{f=m(i,u,96,f,860,34,2)+8}),h(i,64,1030,952,210,24,"#213930"),i.fillStyle="#f6efe2",i.font='500 34px "SimSun", "Songti SC", serif',i.fillText("建议护理方向",96,1092),i.font='400 22px "Microsoft YaHei", sans-serif';const c=274;return o.forEach((u,$)=>{const S=96+$*304;i.fillStyle="#cdb77f",i.font='700 18px "Microsoft YaHei", sans-serif',i.fillText(`STEP ${String($+1).padStart(2,"0")}`,S,1142),i.fillStyle="#f6efe2",i.font='400 20px "Microsoft YaHei", sans-serif',m(i,u,S,1178,c,30,3)}),i.fillStyle="#6a332d",i.font='400 20px "Microsoft YaHei", sans-serif',m(i,s,64,1290,952,30,2),l.toDataURL("image/png")}function D(e){return new Promise(t=>{if(!e){t(null);return}const o=new Image;o.onload=()=>t(o),o.onerror=()=>t(null),/^https?:\/\//i.test(e)&&(o.crossOrigin="anonymous"),o.src=e})}function w(e,t,o,s,r,a){e.fillStyle="#233730",e.font='500 22px "Microsoft YaHei", sans-serif',e.fillText(t,s,r),e.fillStyle="#e6e1d6",h(e,s+68,r-18,250,18,9,"#e6e1d6"),h(e,s+68,r-18,250*(o/5),18,9,a),e.fillStyle=a,e.font="700 22px Georgia, serif",e.fillText(o.toFixed(1),s+340,r)}function me(e,t,o,s,r,a,l=3){return e.fillStyle="#6b8f82",e.beginPath(),e.arc(o+5,s-8,5,0,Math.PI*2),e.fill(),e.fillStyle="#516259",m(e,t,o+24,s,r-24,a,l)}function _(e,t,o,s,r,a){const l=Math.max(r/t.width,a/t.height),i=t.width*l,n=t.height*l,d=o+(r-i)/2,f=s+(a-n)/2;e.drawImage(t,d,f,i,n)}function m(e,t,o,s,r,a,l=4){const i=Array.from(String(t));let n="",d=0;for(const f of i){const c=n+f;if(e.measureText(c).width>r&&n){if(e.fillText(n,o,s),s+=a,d+=1,n=f,d>=l-1)break}else n=c}return n&&d<l&&e.fillText(n,o,s),s}function Q(e,t,o,s,r,a){e.save(),ee(e,t,o,s,r,a),e.clip()}function h(e,t,o,s,r,a,l){e.fillStyle=l,ee(e,t,o,s,r,a),e.fill()}function ee(e,t,o,s,r,a){const l=Math.min(a,s/2,r/2);e.beginPath(),e.moveTo(t+l,o),e.arcTo(t+s,o,t+s,o+r,l),e.arcTo(t+s,o+r,t,o+r,l),e.arcTo(t,o+r,t,o,l),e.arcTo(t,o,t+s,o,l),e.closePath()}function he(e){const t=e.imageStats||{},o=s=>e.checked.includes(s);return{oil:p(e.oil+(t.shine||0)*.34+(o("洗后很快出油")?1:0)+(o("发根塌")?.5:0)),flakes:p(e.flakes+(t.buildup||0)*.28+(o("有明显头屑")?1:0)),sensitivity:p(e.itch+(t.redness||0)*.42+(o("容易泛红")?1.2:0)+(o("染烫后敏感")?.8:0)+(o("头皮紧绷")?.6:0)),root:p(e.shed+(o("局部稀疏")?1.4:0)+(e.hairState==="fine"?.6:0))}}function Se(e,t){return e.sensitivity>=4?{title:"敏感易刺激型头皮",summary:"当前更需要关注舒缓、温和清洁和减少刺激源。",detail:"用户反馈的瘙痒、刺痛、泛红或染烫后敏感信号较强。建议先把护理目标从“强清洁”调整为“稳定头皮感受”，减少高频去油和复杂叠加产品。"}:e.flakes>=3.5&&e.oil>=3?{title:"油屑混合型头皮",summary:"油脂、头屑和发根塌感可能同时存在。",detail:"这类用户常见困扰是洗后不久变油、视觉上有屑感、发根不够清爽。沟通时可把重点放在头皮清洁节奏、减少堆积感和保持发根轻盈。"}:e.oil>=4?{title:"油脂旺盛型头皮",summary:"当前重点是净澈油脂和维持头皮清爽感。",detail:"出油速度偏快时，用户往往会感到发根塌、头顶扁、洗后清爽维持时间短。建议建立规律清洁节奏，避免只追求强去油带来的紧绷反复。"}:e.flakes>=3.5?{title:"干屑紧绷型头皮",summary:"屑感明显，但油脂分数不高，更适合温和清洁。",detail:"当屑感与紧绷同时出现时，沟通重点不是“洗得更猛”，而是保持头皮屏障舒适度、降低刺激、观察换季和洗护频率对头皮的影响。"}:e.root>=4||t.includes("局部稀疏")?{title:"发根脆弱关注型",summary:"掉发困扰或局部稀疏是用户最需要被回应的问题。",detail:"这类用户通常更在意梳洗时掉发、头顶视觉稀疏和发根支撑感。建议结合清洁后护理，帮助用户建立可坚持的长期观察周期。"}:{title:"日常稳态维护型头皮",summary:"当前信号整体温和，适合做预防型、习惯型护理。",detail:"用户目前没有特别突出的强困扰，可以围绕清洁、蓬松、发根养护和规律记录建立日常护理方案。"}}function ve(e,t){const o=[],s={daily:"用户每天洗头，需留意过度清洁后的紧绷或干痒感。","two-days":"用户 2-3 天洗一次，适合围绕清爽维持时间观察护理效果。",weekly:"用户洗头频率较低，头皮油脂与造型残留堆积可能更值得关注。",unstable:"用户洗护节奏不固定，建议先建立可坚持的观察周期。"};return o.push(s[t.washFrequency]),e.oil>=3.5&&o.push("油脂分数偏高，发根塌、头顶扁和清爽感维持时间短会是核心沟通点。"),e.flakes>=3.5&&o.push("屑感分数偏高，建议区分干屑、油屑和产品残留，避免直接下诊断结论。"),e.sensitivity>=3.5&&o.push("敏感分数偏高，应优先强调温和、舒缓和减少刺激。"),e.root>=3.5&&o.push("发根分数偏高，用户可能更关注掉发观感、发缝宽度和发根支撑。"),t.imageStats&&o.push("照片估算仅作为辅助，强光、阴影、发量遮挡和拍摄距离都会影响可见结果。"),t.notes&&o.push(`用户补充：${y(t.notes)}`),o}function ye(e,t,o){const s=t.oil>=3.5?"白瓶用于头皮与发根清洁，重点按摩易出油区域，帮助减少油脂和堆积感。":"白瓶用于温和清洁头皮与发丝，减少清洁不足或过度清洁带来的不适。",r=t.sensitivity>=3.5?"洗后先观察头皮舒适度，减少频繁叠加刺激型产品，优先建立稳定耐受。":"洗后保持头皮清爽，再按说明使用黑瓶，把护理集中到发根位置。",a=o.hairState==="fine"||t.root>=3.5?"连续记录 2-4 周的出油、掉发和发根蓬松感，用周期变化而不是单次感受判断。":"维持固定洗护节奏，记录清爽维持时间、屑感变化和头皮舒适度。";return[s,r,a]}function be(e,t){const o=[`你的头皮画像更接近“${e.title}”，我们先从你最明显的困扰入手，而不是直接推荐同一套用法。`,"这份结果是护理观察，不是医疗诊断；我们会用可坚持的洗护节奏帮你记录变化。"];return t.oil>=3.5&&o.push("如果你最在意出油和塌发，重点看洗后 24 小时的发根清爽度。"),t.sensitivity>=3.5&&o.push("如果你容易痒或泛红，先把温和度和舒适感放在第一位。"),t.root>=3.5&&o.push("如果你更担心掉发，我们建议搭配发根护理，并用照片定期对比。"),o}function we(e,t){return e.sensitivity>=4.5||e.root>=4.5||t.includes("局部稀疏")?"提醒：如果头皮持续疼痛、明显红肿、渗液、结痂、斑片状脱发或短期大量掉发，请尽快咨询皮肤科医生。本报告只用于洗护沟通和日常观察。":"提醒：本报告只用于洗护沟通和日常观察，不构成医疗诊断。若不适持续或加重，请咨询皮肤科医生。"}function L(e,t){return`<div class="score-tile"><strong>${t.toFixed(1)}</strong><span>${e} / 5</span></div>`}function Ee(e,t,o,s,r,a){return[`头皮画像：${e.title}`,e.summary,`评分：油脂 ${t.oil.toFixed(1)} / 屑感 ${t.flakes.toFixed(1)} / 敏感 ${t.sensitivity.toFixed(1)} / 发根 ${t.root.toFixed(1)}`,`可观察信号：${o.join("；")}`,`护理方向：${s.join("；")}`,`沟通话术：${r.join("；")}`,a].join(`
`)}function p(e){return Math.max(0,Math.min(5,Number(e)||0))}function y(e){return e.replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function V(e){return y(String(e||""))}
