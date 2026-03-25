// Design QA Inspector - Content Script
// margin/padding: dev(outline=border-box) vs figma(inline=content-box) 자동 보정

let isActive = false;
let tooltip = null;
let selectedEl = null;
let overlay = null;
let qaAppUrl = "http://localhost:3000";

// 메시지 수신 (popup에서)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "toggle") {
    isActive = msg.active;
    qaAppUrl = msg.qaAppUrl || qaAppUrl;
    if (isActive) {
      activate();
    } else {
      deactivate();
    }
    sendResponse({ ok: true });
  }
  if (msg.action === "getSelected") {
    sendResponse({ element: selectedEl ? getElementInfo(selectedEl) : null });
  }
});

function activate() {
  document.body.style.cursor = "crosshair";
  createTooltip();
  createOverlay();
  document.addEventListener("mouseover", onHover);
  document.addEventListener("mouseout", onOut);
  document.addEventListener("click", onClick, true);
  showBanner("🔬 Design QA 검사 모드 ON — 요소 위에 마우스를 올리세요");
}

function deactivate() {
  document.body.style.cursor = "";
  removeTooltip();
  removeOverlay();
  document.removeEventListener("mouseover", onHover);
  document.removeEventListener("mouseout", onOut);
  document.removeEventListener("click", onClick, true);
}

function createTooltip() {
  tooltip = document.createElement("div");
  tooltip.id = "dqa-tooltip";
  tooltip.style.cssText = `
    position: fixed; z-index: 2147483647; pointer-events: none;
    background: rgba(15, 23, 42, 0.96); color: #e2e8f0;
    font-family: 'SF Mono', 'Fira Code', monospace; font-size: 11px;
    border-radius: 10px; padding: 10px 14px; line-height: 1.7;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4); max-width: 320px;
    border: 1px solid rgba(99,102,241,0.4); display: none;
  `;
  document.body.appendChild(tooltip);
}

function createOverlay() {
  overlay = document.createElement("div");
  overlay.id = "dqa-overlay";
  overlay.style.cssText = `
    position: fixed; z-index: 2147483646; pointer-events: none;
    border: 2px solid #6366f1; background: rgba(99,102,241,0.08);
    border-radius: 4px; transition: all 0.1s; display: none;
  `;
  document.body.appendChild(overlay);
}

function removeTooltip() {
  if (tooltip) { tooltip.remove(); tooltip = null; }
}

function removeOverlay() {
  if (overlay) { overlay.remove(); overlay = null; }
}

function onHover(e) {
  if (!isActive) return;
  const el = e.target;
  if (el.id === "dqa-tooltip" || el.id === "dqa-overlay" || el.id === "dqa-banner") return;

  const info = getElementInfo(el);
  showTooltip(e, info);
  showOverlayOn(el);
}

function onOut(e) {
  if (!isActive) return;
  if (tooltip) tooltip.style.display = "none";
  if (overlay) overlay.style.display = "none";
}

function onClick(e) {
  if (!isActive) return;
  const el = e.target;
  if (el.id === "dqa-tooltip" || el.id === "dqa-overlay" || el.id === "dqa-banner") return;
  e.preventDefault();
  e.stopPropagation();

  selectedEl = el;
  const info = getElementInfo(el);

  // 선택 표시
  if (overlay) {
    overlay.style.border = "2px solid #22c55e";
    overlay.style.background = "rgba(34,197,94,0.1)";
  }

  // 클립보드에 복사
  const report = formatReport(info);
  navigator.clipboard.writeText(report).catch(() => {});

  // popup에 알림
  chrome.runtime.sendMessage({ action: "elementSelected", info });

  showBanner(`✅ "${info.selector}" 선택됨 — popup에서 확인하세요`);
}

function getElementInfo(el) {
  const cs = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  // CSS 계산값 (border-box, outline 기준)
  const paddingTop = parseFloat(cs.paddingTop);
  const paddingRight = parseFloat(cs.paddingRight);
  const paddingBottom = parseFloat(cs.paddingBottom);
  const paddingLeft = parseFloat(cs.paddingLeft);
  const marginTop = parseFloat(cs.marginTop);
  const marginRight = parseFloat(cs.marginRight);
  const marginBottom = parseFloat(cs.marginBottom);
  const marginLeft = parseFloat(cs.marginLeft);
  const borderTop = parseFloat(cs.borderTopWidth);
  const borderRight = parseFloat(cs.borderRightWidth);
  const borderBottom = parseFloat(cs.borderBottomWidth);
  const borderLeft = parseFloat(cs.borderLeftWidth);

  // Figma 인라인 기준 추정값 (border 제외)
  const figmaPaddingTop = paddingTop - borderTop;
  const figmaPaddingRight = paddingRight - borderRight;
  const figmaPaddingBottom = paddingBottom - borderBottom;
  const figmaPaddingLeft = paddingLeft - borderLeft;

  // DPR 보정된 크기
  const cssWidth = rect.width;
  const cssHeight = rect.height;

  // 셀렉터 생성
  const selector = getSelector(el);

  return {
    selector,
    tag: el.tagName.toLowerCase(),
    className: el.className,
    css: {
      padding: `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`,
      paddingValues: { top: paddingTop, right: paddingRight, bottom: paddingBottom, left: paddingLeft },
      margin: `${marginTop}px ${marginRight}px ${marginBottom}px ${marginLeft}px`,
      marginValues: { top: marginTop, right: marginRight, bottom: marginBottom, left: marginLeft },
      border: `${borderTop}px ${borderRight}px ${borderBottom}px ${borderLeft}px`,
      borderValues: { top: borderTop, right: borderRight, bottom: borderBottom, left: borderLeft },
      width: cssWidth,
      height: cssHeight,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      borderRadius: cs.borderRadius,
      display: cs.display,
      boxSizing: cs.boxSizing,
    },
    figmaEstimate: {
      note: "Figma 인라인 기준 추정 (border 제외)",
      paddingTop: Math.max(0, figmaPaddingTop),
      paddingRight: Math.max(0, figmaPaddingRight),
      paddingBottom: Math.max(0, figmaPaddingBottom),
      paddingLeft: Math.max(0, figmaPaddingLeft),
    },
    dpr,
    physicalSize: { width: cssWidth * dpr, height: cssHeight * dpr },
    url: location.href,
    timestamp: new Date().toISOString(),
  };
}

function getSelector(el) {
  if (el.id) return `#${el.id}`;
  const classes = Array.from(el.classList).slice(0, 3).map(c => `.${c}`).join("");
  if (classes) return `${el.tagName.toLowerCase()}${classes}`;
  return el.tagName.toLowerCase();
}

function showTooltip(e, info) {
  if (!tooltip) return;
  const css = info.css;
  const hasBorder = css.borderValues.top > 0 || css.borderValues.left > 0;

  tooltip.innerHTML = `
    <div style="color:#818cf8;font-weight:700;margin-bottom:6px;font-size:12px">${info.selector}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px">
      <div><span style="color:#94a3b8">padding</span><br><span style="color:#fbbf24">${css.padding}</span></div>
      <div><span style="color:#94a3b8">margin</span><br><span style="color:#34d399">${css.margin}</span></div>
      <div><span style="color:#94a3b8">size</span><br><span style="color:#60a5fa">${Math.round(css.width)}×${Math.round(css.height)}px</span></div>
      <div><span style="color:#94a3b8">font</span><br><span style="color:#f472b6">${css.fontSize} / ${css.fontWeight}</span></div>
      ${hasBorder ? `<div style="grid-column:span 2"><span style="color:#94a3b8">border</span> <span style="color:#fb923c">${css.border}</span></div>` : ""}
      ${hasBorder ? `<div style="grid-column:span 2;color:#64748b;font-size:10px">⚠️ border 있음 → Figma padding ≈ dev padding - border</div>` : ""}
    </div>
    <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);color:#64748b;font-size:10px">
      📐 box-sizing: ${css.boxSizing} · DPR: ${info.dpr}x · 클릭하면 선택
    </div>
  `;

  tooltip.style.display = "block";
  const x = Math.min(e.clientX + 14, window.innerWidth - 340);
  const y = Math.min(e.clientY + 14, window.innerHeight - 200);
  tooltip.style.left = x + "px";
  tooltip.style.top = y + "px";
}

function showOverlayOn(el) {
  if (!overlay) return;
  const rect = el.getBoundingClientRect();
  overlay.style.display = "block";
  overlay.style.left = rect.left + "px";
  overlay.style.top = rect.top + "px";
  overlay.style.width = rect.width + "px";
  overlay.style.height = rect.height + "px";
  overlay.style.border = "2px solid #6366f1";
  overlay.style.background = "rgba(99,102,241,0.08)";
}

function formatReport(info) {
  return `[Design QA Report]
선택자: ${info.selector}
URL: ${info.url}

[CSS 값 - outline(border-box) 기준]
padding: ${info.css.padding}
margin: ${info.css.margin}
border: ${info.css.border}
size: ${Math.round(info.css.width)}×${Math.round(info.css.height)}px
font: ${info.css.fontSize} / ${info.css.fontWeight}
color: ${info.css.color}
background: ${info.css.backgroundColor}
border-radius: ${info.css.borderRadius}

[Figma 비교용 - inline(content-box) 기준 추정]
padding-top: ${info.figmaEstimate.paddingTop}px
padding-right: ${info.figmaEstimate.paddingRight}px
padding-bottom: ${info.figmaEstimate.paddingBottom}px
padding-left: ${info.figmaEstimate.paddingLeft}px

DPR: ${info.dpr}x | 물리 크기: ${Math.round(info.physicalSize.width)}×${Math.round(info.physicalSize.height)}px
시각: ${info.timestamp}`;
}

function showBanner(msg) {
  let banner = document.getElementById("dqa-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "dqa-banner";
    banner.style.cssText = `
      position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
      z-index: 2147483647; background: rgba(15,23,42,0.95); color: #e2e8f0;
      font-family: sans-serif; font-size: 13px; font-weight: 500;
      padding: 10px 20px; border-radius: 999px;
      border: 1px solid rgba(99,102,241,0.5);
      box-shadow: 0 4px 20px rgba(0,0,0,0.3); pointer-events: none;
      transition: opacity 0.3s;
    `;
    document.body.appendChild(banner);
  }
  banner.textContent = msg;
  banner.style.opacity = "1";
  setTimeout(() => { if (banner) banner.style.opacity = "0"; }, 3000);
}
