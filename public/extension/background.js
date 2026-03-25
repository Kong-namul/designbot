// Design QA Inspector - Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log("Design QA Inspector 설치 완료");
});

// content.js → popup.js 메시지 중계
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "elementSelected") {
    // popup이 열려있으면 전달
    chrome.runtime.sendMessage(msg).catch(() => {});
  }
  sendResponse({ ok: true });
  return true;
});
