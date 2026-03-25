let isActive = false;
let currentInfo = null;

const toggleBtn = document.getElementById("toggleBtn");
const dot = document.getElementById("dot");
const statusText = document.getElementById("statusText");
const elSection = document.getElementById("elSection");
const emptySection = document.getElementById("emptySection");
const qaUrlInput = document.getElementById("qaUrl");

// 저장된 URL 불러오기
chrome.storage.local.get(["qaAppUrl", "isActive"], (data) => {
  if (data.qaAppUrl) qaUrlInput.value = data.qaAppUrl;
  if (data.isActive) {
    isActive = true;
    updateUI();
  }
});

toggleBtn.addEventListener("click", async () => {
  isActive = !isActive;
  const qaAppUrl = qaUrlInput.value.trim() || "http://localhost:3000";
  chrome.storage.local.set({ qaAppUrl, isActive });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: "toggle", active: isActive, qaAppUrl });
  updateUI();

  // 선택된 요소 갱신
  if (isActive) {
    setTimeout(() => {
      chrome.tabs.sendMessage(tab.id, { action: "getSelected" }, (res) => {
        if (res?.element) showElement(res.element);
      });
    }, 300);
  }
});

// content.js에서 메시지 수신
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "elementSelected" && msg.info) {
    currentInfo = msg.info;
    showElement(msg.info);
  }
});

function updateUI() {
  if (isActive) {
    toggleBtn.textContent = "⏹ 검사 모드 종료";
    toggleBtn.className = "toggle-btn on";
    dot.className = "dot active";
    statusText.textContent = "활성화 — 요소를 클릭하세요";
  } else {
    toggleBtn.textContent = "🔍 검사 모드 시작";
    toggleBtn.className = "toggle-btn off";
    dot.className = "dot";
    statusText.textContent = "비활성화";
    elSection.style.display = "none";
    emptySection.style.display = "block";
    currentInfo = null;
  }
}

function showElement(info) {
  elSection.style.display = "block";
  emptySection.style.display = "none";

  document.getElementById("elSelector").textContent = info.selector;

  const css = info.css;
  const hasBorder = css.borderValues && (css.borderValues.top > 0 || css.borderValues.left > 0);

  const props = [
    { name: "padding", val: css.padding, cls: "" },
    { name: "margin", val: css.margin, cls: "green" },
    { name: "size", val: `${Math.round(css.width)}×${Math.round(css.height)}px`, cls: "blue" },
    { name: "font", val: `${css.fontSize} / ${css.fontWeight}`, cls: "pink" },
    { name: "border-radius", val: css.borderRadius, cls: "" },
    { name: "display", val: css.display, cls: "" },
  ];

  document.getElementById("propsGrid").innerHTML = props.map(p => `
    <div class="prop">
      <div class="prop-name">${p.name}</div>
      <div class="prop-val ${p.cls}">${p.val}</div>
    </div>
  `).join("");

  // 스페이싱 노트 (border 있을 때)
  const noteEl = document.getElementById("spacingNote");
  if (hasBorder) {
    const bt = css.borderValues.top;
    const bl = css.borderValues.left;
    noteEl.style.display = "block";
    noteEl.innerHTML = `
      📐 <strong>outline vs inline 보정</strong><br>
      border: ${css.border}<br>
      Figma padding ≈ Dev padding - border-width<br>
      Top: ${css.paddingValues?.top}px → <span style="color:#a78bfa">${Math.max(0, (css.paddingValues?.top || 0) - bt)}px (Figma 추정)</span><br>
      Left: ${css.paddingValues?.left}px → <span style="color:#a78bfa">${Math.max(0, (css.paddingValues?.left || 0) - bl)}px (Figma 추정)</span>
    `;
  } else {
    noteEl.style.display = "none";
  }

  // Figma 비교값
  if (info.figmaEstimate) {
    const fe = info.figmaEstimate;
    const figmaEl = document.getElementById("figmaCompare");
    figmaEl.style.display = "block";
    document.getElementById("figmaVals").innerHTML = `
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
        ${["top","right","bottom","left"].map(d => {
          const devVal = css.paddingValues?.[d] || 0;
          const figmaVal = fe["padding" + d.charAt(0).toUpperCase() + d.slice(1)] || 0;
          const diff = Math.abs(devVal - figmaVal);
          const cls = diff <= 1 ? "diff-ok" : diff <= 4 ? "diff-warn" : "diff-err";
          return `<span class="figma-val">padding-${d}: ${figmaVal}px</span><span class="diff-tag ${cls}">±${diff}px</span>`;
        }).join("")}
      </div>
      <div style="font-size:10px;color:#64748b;margin-top:4px">DPR ${info.dpr}x · ${Math.round(info.physicalSize?.width || 0)}×${Math.round(info.physicalSize?.height || 0)}px 물리</div>
    `;
  }
}

// 앱에 이슈 전송
document.getElementById("sendBtn").addEventListener("click", async () => {
  if (!currentInfo) return;
  const qaAppUrl = qaUrlInput.value.trim() || "http://localhost:3000";
  const issue = {
    selector: currentInfo.selector,
    url: currentInfo.url,
    css: currentInfo.css,
    figmaEstimate: currentInfo.figmaEstimate,
    dpr: currentInfo.dpr,
  };
  try {
    await fetch(`${qaAppUrl}/api/component-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issue }),
    });
    const btn = document.getElementById("sendBtn");
    btn.textContent = "✅ 전송 완료!";
    setTimeout(() => { btn.textContent = "📤 앱에 이슈 전송"; }, 2000);
  } catch {
    // 앱이 실행 중이 아닐 수 있음 - 클립보드로 대체
    document.getElementById("copyBtn").click();
  }
});

// 클립보드 복사
document.getElementById("copyBtn").addEventListener("click", async () => {
  if (!currentInfo) return;
  const text = `[Design QA - ${currentInfo.selector}]
URL: ${currentInfo.url}
padding: ${currentInfo.css.padding}
margin: ${currentInfo.css.margin}
border: ${currentInfo.css.border}
size: ${Math.round(currentInfo.css.width)}×${Math.round(currentInfo.css.height)}px
font: ${currentInfo.css.fontSize} / ${currentInfo.css.fontWeight}
DPR: ${currentInfo.dpr}x`;

  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById("copyBtn");
    btn.textContent = "✅ 복사됨!";
    setTimeout(() => { btn.textContent = "📋 복사"; }, 1500);
  } catch {}
});
