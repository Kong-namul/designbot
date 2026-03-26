"use client";

import { useState, useRef, useEffect, CSSProperties, ReactNode, ChangeEvent } from "react";
import * as XLSX from "xlsx";

const DEFAULT_BREAKPOINTS = [
  { label: "모바일", width: 375 },
  { label: "태블릿", width: 768 },
  { label: "데스크탑", width: 1440 },
];
const PAGE_CHECKS = [
  "색상·폰트 불일치",
  "간격·여백 오차",
  "컴포넌트 크기 차이",
  "텍스트 내용 오류",
  "화면 크기별 레이아웃 깨짐",
];
const COMMON_ELEMENTS = ["헤더", "푸터", "GNB", "사이드바", "팝업·모달", "알림·토스트"];
const HDR = "#2d6a4f";
const PURPLE = "#6366f1";
const SEV: Record<string, { color: string; bg: string; label: string; sub: string }> = {
  critical: { color: "#A32D2D", bg: "#FCEBEB", label: "즉시 수정", sub: "배포 불가" },
  high: { color: "#993C1D", bg: "#FAECE7", label: "빠른 수정", sub: "우선 처리" },
  medium: { color: "#854F0B", bg: "#FAEEDA", label: "다음 작업", sub: "개선 필요" },
  low: { color: "#3B6D11", bg: "#EAF3DE", label: "여유 수정", sub: "선택 사항" },
};
const SEV_KEYS = ["critical", "high", "medium", "low"];

const inp: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: "9px 13px",
  color: "#1e293b",
  fontSize: 14,
  boxSizing: "border-box",
  outline: "none",
  width: "100%",
};

const chip = (on: boolean, c: string): CSSProperties => ({
  padding: "6px 14px",
  borderRadius: 20,
  border: "1px solid",
  cursor: "pointer",
  fontSize: 13,
  borderColor: on ? c : "#e2e8f0",
  background: on ? c + "18" : "#fff",
  color: on ? c : "#94a3b8",
  transition: "all .15s",
});

const ghostBtn = (c: string): CSSProperties => ({
  padding: "7px 14px",
  borderRadius: 8,
  border: "1px solid " + c,
  background: "#fff",
  color: c,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
});

const solidBtn = (c: string): CSSProperties => ({
  padding: "7px 16px",
  borderRadius: 8,
  border: "none",
  background: c,
  color: "#fff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
});

interface Issue {
  id: number;
  severity: string;
  issue: string;
  devAnswer: string;
  done: boolean;
  component?: string;
  breakpoint?: string;
  category?: string;
  path?: string;
  pageName?: string;
  figmaPage?: string;
  publishedUrl?: string;
  element?: string;
  spacingNote?: string;
}

interface IssuesData {
  summary: string;
  score: number;
  commonIssues: Issue[];
  pageIssues: Issue[];
}

interface PageRow {
  id: number;
  name: string;
  url: string;
  figmaPage: string;
}

interface Breakpoint {
  label: string;
  width: number;
}

interface Screenshot {
  name: string;
  dataUrl: string;
  pageUrl: string;
}

const Card = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #e2e8f0", ...style }}>
    {children}
  </div>
);

const Label = ({ children, sub }: { children: ReactNode; sub?: string }) => (
  <div style={{ marginBottom: 8 }}>
    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{children}</span>
    {sub && <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 6 }}>{sub}</span>}
  </div>
);

const SevBadge = ({ s }: { s: string }) => {
  const m = SEV[s] || SEV.low;
  return (
    <span style={{ background: m.bg, color: m.color, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
      {m.label}
    </span>
  );
};

function FigmaSelect({ pages, value, onChange }: { pages: string[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [rect, setRect] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleOpen = () => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    setOpen((o) => !o);
  };

  const filtered = pages.filter((p) => p.toLowerCase().includes(q.toLowerCase()));
  const isEmpty = pages.length === 0;
  return (
    <div style={{ position: "relative" }}>
      <div ref={triggerRef} onClick={isEmpty ? undefined : handleOpen} style={{ ...inp, cursor: isEmpty ? "default" : "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: isEmpty ? 0.6 : 1 }}>
        <span style={{ color: value ? "#1e293b" : "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value || (isEmpty ? "Figma URL 입력 후 자동 불러오기" : "Figma 프레임 선택")}
        </span>
        {!isEmpty && <span style={{ fontSize: 10, color: "#94a3b8", flexShrink: 0, marginLeft: 4 }}>▼</span>}
      </div>
      {open && rect && !isEmpty && (
        <div
          ref={dropRef}
          style={{
            position: "fixed",
            top: rect.bottom + 4,
            left: rect.left,
            width: Math.max(rect.width, 220),
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            zIndex: 9999,
            boxShadow: "0 8px 24px rgba(0,0,0,.12)",
          }}
        >
          <div style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색..." style={{ ...inp, padding: "6px 10px", fontSize: 13 }} />
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            <div onClick={() => { onChange(""); setOpen(false); setQ(""); }} style={{ padding: "8px 14px", cursor: "pointer", fontSize: 13, color: "#94a3b8" }}>— 선택 안 함</div>
            {filtered.map((p) => (
              <div key={p} onClick={() => { onChange(p); setOpen(false); setQ(""); }}
                style={{ padding: "8px 14px", cursor: "pointer", fontSize: 13, background: p === value ? "#f0f4ff" : "transparent", color: p === value ? PURPLE : "#1e293b" }}>
                {p}
              </div>
            ))}
            {filtered.length === 0 && q && (
              <div style={{ padding: "8px 14px", fontSize: 13, color: "#94a3b8" }}>검색 결과 없음</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

let uid = 2000;

export default function App() {
  const [step, setStep] = useState(1);
  const [view, setView] = useState("dashboard");
  const [siteUrl, setSiteUrl] = useState("");
  const [figmaFileUrl, setFigmaFileUrl] = useState("");
  const [figmaPages, setFigmaPages] = useState<string[]>([]);
  const [pageRows, setPageRows] = useState<PageRow[]>([{ id: 1, name: "", url: "", figmaPage: "" }]);
  const [commonOn, setCommonOn] = useState(true);
  const [selCommon, setSelCommon] = useState(["헤더", "푸터", "GNB"]);
  const [breakpoints] = useState<Breakpoint[]>(DEFAULT_BREAKPOINTS);
  const [selBPs, setSelBPs] = useState(["모바일", "데스크탑"]);
  const [selChecks, setSelChecks] = useState([...PAGE_CHECKS]);
  const [env, setEnv] = useState({ version: "", aos: "", ios: "" });
  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState<IssuesData | null>(null);
  const [filterSev, setFilterSev] = useState<string[]>([]);
  const [filterDone, setFilterDone] = useState(false);
  const [addModal, setAddModal] = useState<string | null>(null);
  const [newIssue, setNewIssue] = useState<Partial<Issue & { component: string; category: string }>>({});
  const [error, setError] = useState("");
  const [wStep, setWStep] = useState(1);

  // Figma 토큰
  const [figmaToken, setFigmaToken] = useState("");
  const [showFigmaToken, setShowFigmaToken] = useState(false);

  // Figma 페이지·프레임
  const [figmaFileName, setFigmaFileName] = useState("");
  const [figmaFetchMsg, setFigmaFetchMsg] = useState("");
  const [figmaTree, setFigmaTree] = useState<{ id: string; name: string; frames: { id: string; name: string }[] }[]>([]);
  const [selectedFrames, setSelectedFrames] = useState<Set<string>>(new Set());
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());

  // 🔐 로그인 계정
  const [loginEnabled, setLoginEnabled] = useState(false);
  const [loginUrl, setLoginUrl] = useState("");
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [showPw, setShowPw] = useState(false);

  // 🔬 컴포넌트 검사
  const [compEnabled, setCompEnabled] = useState(false);
  const [compSelector, setCompSelector] = useState("");
  const [compName, setCompName] = useState("");
  const [compIssues, setCompIssues] = useState<Issue[]>([]);
  const [compLoading, setCompLoading] = useState(false);
  const [compError, setCompError] = useState("");

  // 📸 스크린샷 비교
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [screenshotResults, setScreenshotResults] = useState<{ pageUrl: string; analysis: string; score: number }[]>([]);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [extModal, setExtModal] = useState(false);
  const screenshotRef = useRef<HTMLInputElement>(null);

  const toggle = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, val: T) =>
    setter((p) => (p.includes(val) ? p.filter((x) => x !== val) : [...p, val]));

  // localStorage에서 Figma 토큰 복원
  useEffect(() => {
    const saved = localStorage.getItem("figmaToken");
    if (saved) setFigmaToken(saved);
  }, []);

  // figmaTree 로드 시 pageRows 자동 생성
  useEffect(() => {
    if (figmaTree.length === 0) return;
    const rows: PageRow[] = [];
    figmaTree.forEach((page) => {
      page.frames.forEach((frame) => {
        rows.push({ id: Date.now() + Math.random(), name: frame.name, url: "", figmaPage: `${page.name} / ${frame.name}` });
      });
    });
    if (rows.length > 0) setPageRows(rows);
  }, [figmaTree]);

  // Figma URL → 파일 구조(페이지+프레임) 자동 가져오기
  const fetchFigmaInfo = async (url: string) => {
    if (!url.includes("figma.com")) return;
    const fileKeyMatch = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
    const fileKey = fileKeyMatch ? fileKeyMatch[1] : null;
    if (!fileKey) { setFigmaFetchMsg("올바른 Figma URL이 아닙니다."); return; }

    setFigmaFetchMsg("Figma 파일 읽는 중...");
    setFigmaFileName("");
    setFigmaTree([]);

    const token = figmaToken || localStorage.getItem("figmaToken") || "";

    // Figma REST API 직접 호출 (토큰이 있는 경우)
    if (token) {
      try {
        const res = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=2`, {
          headers: { "X-Figma-Token": token },
        });
        if (res.ok) {
          const data = await res.json();
          const pages = (data.document?.children || [])
            .filter((c: { type: string }) => c.type === "CANVAS")
            .map((c: { name: string; id: string; children?: { type: string; name: string; id: string }[] }) => ({
              id: c.id, name: c.name,
              frames: (c.children || [])
                .filter((n) => n.type === "FRAME" || n.type === "COMPONENT")
                .map((f) => ({ id: f.id, name: f.name })),
            }));
          if (pages.length) {
            setFigmaTree(pages);
            setExpandedPages(new Set(pages.map((p: { id: string }) => p.id)));
            setFigmaPages(pages.flatMap((p: { name: string; frames: { name: string }[] }) => p.frames.map((f) => f.name)));
            setFigmaFileName(data.name || "");
            const total = pages.reduce((acc: number, p: { frames: unknown[] }) => acc + p.frames.length, 0);
            setFigmaFetchMsg(`✅ ${pages.length}개 페이지 · ${total}개 프레임`);
            return;
          }
        } else if (res.status === 403) {
          setFigmaFetchMsg("⚠️ 토큰이 유효하지 않습니다. 다시 확인해주세요.");
          return;
        }
      } catch { /* ignore */ }
    }

    // 폴백: 서버 API (Figma MCP)
    try {
      const res = await fetch("/api/figma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ figmaFileUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) { setFigmaFetchMsg("URL을 확인해주세요"); return; }
      setFigmaFileName(data.fileName || "");
      if (data.pages && data.pages.length > 0) {
        setFigmaTree(data.pages);
        setExpandedPages(new Set(data.pages.map((p: { id: string }) => p.id)));
        setFigmaPages(data.pages.flatMap((p: { name: string; frames: { name: string }[] }) =>
          p.frames.length > 0 ? p.frames.map((f) => f.name) : [p.name]
        ));
        const total = data.pages.reduce((acc: number, p: { frames: unknown[] }) => acc + (p.frames?.length || 0), 0);
        setFigmaFetchMsg(`✅ ${data.pages.length}개 페이지 · ${total}개 프레임`);
      } else {
        setFigmaFetchMsg("프레임을 찾을 수 없습니다. 아래 액세스 토큰을 입력해주세요.");
      }
    } catch {
      setFigmaFetchMsg("연결 실패. 아래 액세스 토큰을 입력해주세요.");
    }
  };

  const togglePage = (pageId: string) => {
    setExpandedPages((prev) => {
      const n = new Set(prev);
      n.has(pageId) ? n.delete(pageId) : n.add(pageId);
      return n;
    });
  };

  const selectAllFrames = () => {
    const all = new Set<string>();
    figmaTree.forEach((p) => p.frames.forEach((f) => all.add(`${p.id}:${f.id}`)));
    setSelectedFrames(all);
    const rows: PageRow[] = [];
    figmaTree.forEach((p) =>
      p.frames.forEach((f) => {
        rows.push({ id: Date.now() + Math.random(), name: f.name, url: "", figmaPage: `${p.name} / ${f.name}` });
      })
    );
    if (rows.length > 0) setPageRows(rows);
  };

  const resetFrames = () => {
    setSelectedFrames(new Set());
    setPageRows([{ id: 1, name: "", url: "", figmaPage: "" }]);
  };

  // 프레임 선택 → pageRows 자동 생성
  const toggleFrame = (pageName: string, frameName: string, frameKey: string) => {
    setSelectedFrames((prev) => {
      const next = new Set(prev);
      if (next.has(frameKey)) {
        next.delete(frameKey);
        setPageRows((rows) => rows.filter((r) => r.figmaPage !== frameName));
      } else {
        next.add(frameKey);
        setPageRows((rows) => {
          const exists = rows.some((r) => r.figmaPage === frameName);
          if (exists) return rows;
          const emptyIdx = rows.findIndex((r) => !r.url.trim() && !r.figmaPage);
          const newRow = { id: Date.now() + Math.random(), name: frameName, url: "", figmaPage: `${pageName} / ${frameName}` };
          if (emptyIdx !== -1) {
            const updated = [...rows];
            updated[emptyIdx] = newRow;
            return updated;
          }
          return [...rows, newRow];
        });
      }
      return next;
    });
  };

  const buildPrompt = () => {
    const rows = pageRows.filter((r) => r.url.trim());
    const pageList = rows
      .map((r, i) => `${i + 1}. ${r.name || r.url} | URL: ${r.url}${r.figmaPage ? " | Figma: " + r.figmaPage : ""}`)
      .join("\n");

    let prompt = `당신은 디자인 QA 전문가입니다. Figma 디자인과 퍼블리싱 결과물을 비교 검수하세요.
Figma 파일: ${figmaFileUrl || "없음"}
페이지 목록:\n${pageList || "1. " + siteUrl}
화면 크기: ${selBPs.join(", ")}
검수 항목: ${selChecks.join(", ")}
${commonOn ? "공통 요소: " + selCommon.join(", ") : "공통 요소 검수 없음"}

[여백·간격 보정 규칙 - 반드시 적용]
개발(CSS)은 border-box 아웃라인 기준으로 크기가 결정되고, Figma 디자인은 인라인(content) 기준으로 측정합니다.
- box-sizing:border-box → border와 padding이 element 총 크기에 포함됨. Figma 인라인 크기와 비교 시 content 영역이 더 작아 보일 수 있음
- Figma stroke(아웃라인) outside 설정: 요소간 gap = CSS margin과 동일
- Figma stroke inside 설정: CSS padding에서 border-width만큼 차이 발생 → 실제 오차 아님
- Figma stroke center 설정: border-width/2 만큼 오차 발생
- 판정 기준: ±1px 이내 → 정상(무시), ±2~4px + border 존재 → low(outline 기준 차이), ±5px 이상 → 실제 이슈로 보고
- Retina(HiDPI) 화면: 측정 pixel ÷ devicePixelRatio(2 또는 3)로 실제 CSS 값 환산
- margin/padding 이슈 보고 시 반드시 [outline기준] 또는 [inline기준] 태그를 issue 텍스트에 포함하세요`;

    if (loginEnabled && loginId) {
      prompt += `\n\n[검수용 계정 - 로그인 후 인증 필요 페이지도 검수]
로그인 URL: ${loginUrl || siteUrl + "/login"}
아이디: ${loginId}
비밀번호: ${loginPw}
위 계정으로 로그인 후 마이페이지, 대시보드 등 인증 필요 페이지의 디자인 QA도 수행하세요.`;
    }

    if (compEnabled && compSelector) {
      prompt += `\n\n[특정 컴포넌트 집중 검사]
CSS 선택자: ${compSelector}
컴포넌트명: ${compName || compSelector}
위 컴포넌트에 대해 padding, margin, border, font-size, color, border-radius 값을 Figma와 상세 비교하세요.`;
    }

    prompt += `\nseverity: critical=즉시수정/배포불가, high=빠른수정, medium=다음스프린트, low=여유수정
JSON만 반환:
{"summary":"요약","score":85,"commonIssues":[{"id":1,"component":"헤더","breakpoint":"모바일","severity":"high","element":".header","issue":"설명 [outline기준]","publishedUrl":"${siteUrl}","devAnswer":"","done":false,"spacingNote":"Figma:16px / Dev:18px / 차이:2px(border포함)"}],"pageIssues":[{"id":2,"path":"/home","pageName":"홈","figmaPage":"Home","breakpoint":"모바일","category":"간격·여백 오차","severity":"low","element":".btn","issue":"설명 [inline기준]","publishedUrl":"${siteUrl}/home","devAnswer":"","done":false}]}`;
    return prompt;
  };

  const runQA = async () => {
    if (!siteUrl) { setError("사이트 주소를 입력해주세요."); return; }
    setError(""); setLoading(true); setIssues(null); setStep(2); setView("dashboard");
    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: buildPrompt(), figmaFileUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "분석 오류");
      data.commonIssues = (data.commonIssues || []).map((i: Issue) => ({ ...i, done: !!i.done }));
      data.pageIssues = (data.pageIssues || []).map((i: Issue) => ({ ...i, done: !!i.done }));
      setIssues(data);
    } catch (e: unknown) {
      setError("분석 오류: " + (e instanceof Error ? e.message : String(e)));
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 단위 검사
  const runComponentQA = async () => {
    if (!compSelector) { setCompError("CSS 선택자를 입력하세요."); return; }
    setCompError(""); setCompLoading(true); setCompIssues([]);
    const prompt = `당신은 디자인 QA 전문가입니다.
사이트: ${siteUrl}
검사 대상 컴포넌트: CSS 선택자 "${compSelector}" (이름: ${compName || compSelector})
Figma 파일: ${figmaFileUrl || "없음"}

[여백·간격 보정 규칙]
CSS box-sizing:border-box(아웃라인 기준) vs Figma 인라인 기준 차이를 반드시 구분하세요.
border가 있는 요소는 ±border-width 오차를 정상으로 처리하세요.

해당 컴포넌트의 padding, margin, border, color, font-size, line-height, border-radius, width, height를 Figma와 상세 비교하고 이슈를 JSON 배열로만 반환:
[{"id":1,"severity":"high","element":"${compSelector}","issue":"설명 [outline기준 또는 inline기준]","spacingNote":"Figma:Xpx / Dev:Ypx / 차이:Zpx","devAnswer":"","done":false}]`;

    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, figmaFileUrl, responseType: "array" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "분석 오류");
      const arr = Array.isArray(data) ? data : (data.issues || data.commonIssues || data.pageIssues || []);
      setCompIssues(arr.map((i: Issue) => ({ ...i, done: !!i.done, id: i.id || uid++ })));
      setView("component");
      setStep(2);
    } catch (e: unknown) {
      setCompError("분석 오류: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setCompLoading(false);
    }
  };

  // 스크린샷 비교
  const handleScreenshotUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setScreenshots((prev) => [
          ...prev,
          { name: file.name, dataUrl: ev.target?.result as string, pageUrl: siteUrl },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const runScreenshotCompare = async () => {
    if (!screenshots.length) return;
    setScreenshotLoading(true); setScreenshotResults([]);
    try {
      const res = await fetch("/api/screenshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ screenshots, figmaFileUrl, siteUrl }),
      });
      const data = await res.json();
      setScreenshotResults(data.results || []);
      setView("screenshot");
      setStep(2);
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setScreenshotLoading(false);
    }
  };

  const updateIssue = (type: string, id: number, field: string, val: unknown) => {
    if (type === "component") {
      setCompIssues((p) => p.map((i) => (i.id === id ? { ...i, [field]: val } : i)));
      return;
    }
    const key = type === "common" ? "commonIssues" : "pageIssues";
    setIssues((p) =>
      p ? { ...p, [key]: (p[key as "commonIssues" | "pageIssues"] as Issue[]).map((i) => (i.id === id ? { ...i, [field]: val } : i)) } : null
    );
  };

  const deleteIssue = (type: string, id: number) => {
    if (type === "component") { setCompIssues((p) => p.filter((i) => i.id !== id)); return; }
    const key = type === "common" ? "commonIssues" : "pageIssues";
    setIssues((p) => p ? { ...p, [key]: (p[key as "commonIssues" | "pageIssues"] as Issue[]).filter((i) => i.id !== id) } : null);
  };

  const addIssue = () => {
    const key = addModal === "common" ? "commonIssues" : "pageIssues";
    setIssues((p) =>
      p ? { ...p, [key]: [...(p[key as "commonIssues" | "pageIssues"] as Issue[]), { ...newIssue, id: uid++, done: false, devAnswer: "" }] } : null
    );
    setAddModal(null); setNewIssue({});
  };

  const allIssues = issues ? [...(issues.commonIssues || []), ...(issues.pageIssues || [])] : [];
  const totalDone = allIssues.filter((i) => i.done).length;
  const progress = allIssues.length ? Math.round((totalDone / allIssues.length) * 100) : 0;
  const sevCounts = SEV_KEYS.reduce((a, k) => ({ ...a, [k]: allIssues.filter((i) => i.severity === k).length }), {} as Record<string, number>);

  const applyFilter = (arr: Issue[]) => {
    let r = arr;
    if (filterSev.length) r = r.filter((i) => filterSev.includes(i.severity));
    if (filterDone) r = r.filter((i) => !i.done);
    return r;
  };

  const groupByPath = (arr: Issue[] = []) => {
    const map: Record<string, { path: string; pageName: string; figmaPage: string; issues: Issue[] }> = {};
    arr.forEach((i) => {
      const k = i.path || "/";
      if (!map[k]) map[k] = { path: k, pageName: i.pageName || k, figmaPage: i.figmaPage || "", issues: [] };
      map[k].issues.push(i);
    });
    return Object.values(map);
  };

  const downloadCSV = (type: string) => {
    const envStr = [env.version, env.aos && "AOS_" + env.aos, env.ios && "iOS_" + env.ios].filter(Boolean).join(" / ") || "-";
    const header = ["환경", "심각도", "Figma 페이지", "퍼블리싱 화면", "구분", "이슈 사항", "여백 보정", "개발팀 답변", "완료"];
    const dataRows: (string | number)[][] = [header];

    const toRow = (iss: Issue, label: string) => [
      envStr,
      (SEV[iss.severity] || SEV.low).label,
      figmaFileUrl || "",
      iss.publishedUrl || siteUrl,
      label,
      iss.issue,
      iss.spacingNote || "",
      iss.devAnswer || "",
      iss.done ? "✓" : "",
    ];

    if (type === "common") {
      dataRows.push(["【공통 영역】", "", "", "", "", "", "", "", ""]);
      (issues?.commonIssues || []).forEach((i) => dataRows.push(toRow(i, i.component || "")));
    } else {
      groupByPath(issues?.pageIssues).forEach((g) => {
        dataRows.push([`【${g.pageName} (${g.path})】`, "", "", "", "", "", "", "", ""]);
        g.issues.forEach((i) => dataRows.push(toRow(i, (i.breakpoint || "") + " / " + (i.category || ""))));
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(dataRows);

    // 컬럼 너비 설정
    ws["!cols"] = [
      { wch: 16 }, { wch: 10 }, { wch: 40 }, { wch: 36 },
      { wch: 20 }, { wch: 50 }, { wch: 30 }, { wch: 30 }, { wch: 6 },
    ];

    // 헤더 행 스타일 (배경색)
    header.forEach((_, ci) => {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c: ci })];
      if (cell) {
        cell.s = { font: { bold: true }, fill: { fgColor: { rgb: "2D6A4F" } }, fontColor: { rgb: "FFFFFF" } };
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type === "common" ? "공통 영역" : "페이지별");
    XLSX.writeFile(wb, `${type}_qa.xlsx`);
  };

  const IssueRow = ({ iss, type }: { iss: Issue; type: string }) => {
    const [editAns, setEditAns] = useState(false);
    const [ansDraft, setAnsDraft] = useState(iss.devAnswer || "");
    const [editIss, setEditIss] = useState(false);
    const [issDraft, setIssDraft] = useState(iss.issue || "");
    const op = iss.done ? 0.4 : 1;
    const m = SEV[iss.severity] || SEV.low;
    const label = type === "common" ? iss.component : (iss.breakpoint || "") + " / " + (iss.category || "");
    return (
      <tr style={{ background: iss.done ? "#f8fafc" : "#fff", transition: "background .2s" }}>
        <td style={{ padding: "10px 12px", verticalAlign: "top", borderTop: "1px solid #f1f5f9", minWidth: 100, opacity: op }}>
          <span style={{ background: m.bg, color: m.color, padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, display: "block", width: "fit-content", marginBottom: 3 }}>{m.label}</span>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>{m.sub}</span>
        </td>
        <td style={{ padding: "10px 12px", verticalAlign: "top", borderTop: "1px solid #f1f5f9", minWidth: 90, opacity: op, fontSize: 12 }}>
          {type === "page" && iss.figmaPage ? <div style={{ color: PURPLE, fontWeight: 600 }}>{iss.figmaPage}</div> : <span style={{ color: "#cbd5e1" }}>—</span>}
        </td>
        <td style={{ padding: "10px 12px", verticalAlign: "top", borderTop: "1px solid #f1f5f9", minWidth: 260, opacity: op }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 3 }}>[{label}]</div>
          {editIss ? (
            <div>
              <textarea value={issDraft} onChange={(e) => setIssDraft(e.target.value)} style={{ ...inp, minHeight: 64, resize: "vertical", fontSize: 13 }} />
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <button style={solidBtn(HDR)} onClick={() => { updateIssue(type, iss.id, "issue", issDraft); setEditIss(false); }}>저장</button>
                <button style={ghostBtn("#94a3b8")} onClick={() => setEditIss(false)}>취소</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 4, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-line" }}>{iss.issue}</div>
                {iss.spacingNote && (
                  <div style={{ marginTop: 4, background: "#f0f9ff", borderRadius: 6, padding: "4px 8px", fontSize: 11, color: "#0369a1", fontFamily: "monospace" }}>
                    💡 {iss.spacingNote}
                  </div>
                )}
              </div>
              <button style={{ background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", fontSize: 12, padding: "2px" }} onClick={() => setEditIss(true)}>✏️</button>
            </div>
          )}
        </td>
        <td style={{ padding: "10px 12px", verticalAlign: "top", borderTop: "1px solid #f1f5f9", minWidth: 180, opacity: op }}>
          {editAns ? (
            <div>
              <textarea value={ansDraft} onChange={(e) => setAnsDraft(e.target.value)} style={{ ...inp, minHeight: 64, resize: "vertical", fontSize: 13 }} />
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <button style={solidBtn(HDR)} onClick={() => { updateIssue(type, iss.id, "devAnswer", ansDraft); setEditAns(false); }}>저장</button>
                <button style={ghostBtn("#94a3b8")} onClick={() => setEditAns(false)}>취소</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 4, alignItems: "flex-start" }}>
              <div style={{ color: "#1d6fa4", fontSize: 13, flex: 1, cursor: "pointer", minHeight: 20 }} onClick={() => setEditAns(true)}>
                {iss.devAnswer || <span style={{ color: "#e2e8f0" }}>답변 입력...</span>}
              </div>
              <button style={{ background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", fontSize: 12, padding: "2px" }} onClick={() => setEditAns(true)}>✏️</button>
            </div>
          )}
        </td>
        <td style={{ padding: "10px 12px", verticalAlign: "middle", borderTop: "1px solid #f1f5f9", textAlign: "center", minWidth: 60 }}>
          <input type="checkbox" checked={iss.done} onChange={(e) => updateIssue(type, iss.id, "done", e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer", accentColor: HDR }} />
          <div style={{ marginTop: 4 }}>
            <button onClick={() => deleteIssue(type, iss.id)} style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 13 }}>🗑</button>
          </div>
        </td>
      </tr>
    );
  };

  const TH = ({ children, w }: { children: ReactNode; w?: number }) => (
    <th style={{ padding: "9px 14px", textAlign: "left", color: "#fff", fontWeight: 600, whiteSpace: "nowrap", background: HDR, minWidth: w, borderRight: "1px solid #40916c" }}>{children}</th>
  );

  const TableShell = ({ type, children }: { type: string; children: ReactNode }) => (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 780 }}>
        <thead><tr><TH w={100}>심각도</TH><TH w={90}>Figma</TH><TH w={260}>이슈 내용</TH><TH w={180}>개발팀 답변</TH><TH w={60}>완료</TH></tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );

  const WizardStep = ({ n, title, active, done }: { n: number; title: string; active: boolean; done: boolean }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, background: done ? "#22c55e" : active ? PURPLE : "#e2e8f0", color: done || active ? "#fff" : "#94a3b8", flexShrink: 0 }}>
        {done ? "✓" : n}
      </div>
      <span style={{ fontSize: 13, fontWeight: active ? 700 : 400, color: active ? "#1e293b" : done ? "#22c55e" : "#94a3b8" }}>{title}</span>
    </div>
  );

  const stepTitles = ["사이트·Figma 연결", "검수 페이지 설정", "검수 항목 선택"];

  const FilterBar = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap", background: "#f8fafc", borderRadius: 10, padding: "10px 14px" }}>
      <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>필터</span>
      {SEV_KEYS.map((k) => {
        const m = SEV[k]; const on = filterSev.includes(k);
        return <button key={k} onClick={() => toggle(setFilterSev, k)} style={{ padding: "3px 10px", borderRadius: 12, border: "1px solid", cursor: "pointer", fontSize: 11, fontWeight: 700, borderColor: on ? m.color : "#e2e8f0", background: on ? m.bg : "#fff", color: on ? m.color : "#94a3b8" }}>{m.label}</button>;
      })}
      <button onClick={() => setFilterDone((p) => !p)} style={{ padding: "3px 10px", borderRadius: 12, border: "1px solid", cursor: "pointer", fontSize: 11, borderColor: filterDone ? "#6366f1" : "#e2e8f0", background: filterDone ? "#ede9fe" : "#fff", color: filterDone ? "#6366f1" : "#94a3b8" }}>미완료만</button>
      {(filterSev.length > 0 || filterDone) && <button onClick={() => { setFilterSev([]); setFilterDone(false); }} style={{ padding: "3px 10px", borderRadius: 12, border: "1px solid #e2e8f0", cursor: "pointer", fontSize: 11, color: "#94a3b8" }}>초기화</button>}
      <span style={{ marginLeft: "auto", fontSize: 12, color: "#64748b" }}>완료 <strong style={{ color: HDR }}>{totalDone}</strong> / {allIssues.length}건</span>
    </div>
  );

  const Dashboard = () => {
    if (!issues) return null;
    const criticalHighIssues = allIssues.filter((i) => (i.severity === "critical" || i.severity === "high") && !i.done);
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
          <Card style={{ gridColumn: "span 2" }}>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>전체 진행률</div>
            <div style={{ flex: 1 }}>
              <div style={{ background: "#f1f5f9", borderRadius: 99, height: 10, overflow: "hidden" }}>
                <div style={{ width: progress + "%", height: "100%", background: progress === 100 ? "#22c55e" : HDR, borderRadius: 99, transition: "width .4s" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 12, color: "#64748b" }}>완료 {totalDone}건 / 전체 {allIssues.length}건</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: progress === 100 ? "#22c55e" : HDR }}>{progress}%</span>
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>QA 점수</div>
            <div style={{ fontSize: 42, fontWeight: 700, color: issues.score >= 80 ? "#22c55e" : issues.score >= 60 ? "#f59e0b" : "#ef4444", lineHeight: 1 }}>{issues.score}</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>/ 100점</div>
          </Card>
          <Card>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>즉시 처리 필요</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: criticalHighIssues.length > 0 ? "#A32D2D" : "#22c55e", lineHeight: 1 }}>{criticalHighIssues.length}</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Critical + High 미완료</div>
          </Card>
        </div>


        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 }}>심각도별 현황</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {SEV_KEYS.map((k) => {
              const m = SEV[k]; const cnt = sevCounts[k]; const doneCnt = allIssues.filter((i) => i.severity === k && i.done).length;
              return (
                <div key={k} style={{ background: m.bg, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: m.color, marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: m.color, lineHeight: 1 }}>{cnt}</div>
                  <div style={{ fontSize: 11, color: m.color, opacity: 0.7, marginTop: 4 }}>완료 {doneCnt}/{cnt}</div>
                  {cnt > 0 && <div style={{ marginTop: 6, background: "rgba(255,255,255,.5)", borderRadius: 99, height: 4 }}><div style={{ width: (doneCnt / cnt * 100) + "%", height: "100%", background: m.color, borderRadius: 99 }} /></div>}
                </div>
              );
            })}
          </div>
        </Card>

        {criticalHighIssues.length > 0 && (
          <Card style={{ marginBottom: 20, border: "1px solid #fca5a5" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#A32D2D", marginBottom: 12 }}>🚨 지금 바로 수정해야 할 이슈 ({criticalHighIssues.length}건)</div>
            {criticalHighIssues.slice(0, 5).map((iss) => {
              const type = issues.commonIssues?.find((i) => i.id === iss.id) ? "common" : "page";
              return (
                <div key={iss.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderTop: "1px solid #fee2e2" }}>
                  <SevBadge s={iss.severity} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#1e293b", fontWeight: 500 }}>{iss.issue}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{iss.pageName || iss.component} · {iss.breakpoint}</div>
                  </div>
                  <input type="checkbox" checked={iss.done} onChange={(e) => updateIssue(type, iss.id, "done", e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer", accentColor: HDR, marginTop: 2 }} />
                </div>
              );
            })}
            {criticalHighIssues.length > 5 && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8, textAlign: "center" }}>외 {criticalHighIssues.length - 5}건</div>}
          </Card>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={() => downloadCSV("common")} style={ghostBtn(HDR)}>공통 엑셀</button>
          <button onClick={() => downloadCSV("page")} style={ghostBtn(HDR)}>페이지 엑셀</button>
        </div>
      </div>
    );
  };

  const DesignerView = () => {
    const filteredCommon = applyFilter(issues?.commonIssues || []);
    const groups = groupByPath(applyFilter(issues?.pageIssues || []));
    return (
      <div>
        <FilterBar />
        {commonOn && filteredCommon.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ background: "#8b5cf6", borderRadius: 6, padding: "4px 12px", color: "#fff", fontSize: 13, fontWeight: 700 }}>🧩 공통 영역</div>
              <span style={{ color: "#94a3b8", fontSize: 12 }}>{filteredCommon.length}건</span>
              <button onClick={() => downloadCSV("common")} style={{ ...ghostBtn(HDR), marginLeft: "auto", fontSize: 12 }}>엑셀</button>
            </div>
            <TableShell type="common">{filteredCommon.map((iss) => <IssueRow key={iss.id} iss={iss} type="common" />)}</TableShell>
          </div>
        )}
        {groups.map((g, gi) => (
          <div key={g.path} style={{ marginBottom: gi < groups.length - 1 ? 28 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ background: HDR, borderRadius: 6, padding: "4px 12px", color: "#fff", fontSize: 13, fontWeight: 700 }}>📄 {g.pageName}</div>
              <code style={{ background: "#f1f5f9", color: PURPLE, padding: "3px 10px", borderRadius: 5, fontSize: 12 }}>{g.path}</code>
              {g.figmaPage && <span style={{ background: "#ede9fe", color: PURPLE, padding: "3px 10px", borderRadius: 5, fontSize: 12 }}>✦ {g.figmaPage}</span>}
              <span style={{ color: "#94a3b8", fontSize: 12 }}>{g.issues.length}건</span>
            </div>
            <TableShell type="page">{g.issues.map((iss) => <IssueRow key={iss.id} iss={iss} type="page" />)}</TableShell>
          </div>
        ))}
        <button onClick={() => { setAddModal("page"); setNewIssue({ severity: "medium", breakpoint: selBPs[0] || "모바일", path: "/", pageName: "페이지", category: PAGE_CHECKS[0] }); }} style={{ ...ghostBtn(PURPLE), marginTop: 16 }}>+ 이슈 직접 추가</button>
      </div>
    );
  };

  const PublisherView = () => {
    const myIssues = applyFilter(allIssues);
    const urgent = myIssues.filter((i) => i.severity === "critical" || i.severity === "high");
    const rest = myIssues.filter((i) => i.severity === "medium" || i.severity === "low");
    const IssueCard = ({ iss }: { iss: Issue }) => {
      const type = issues?.commonIssues?.find((i) => i.id === iss.id) ? "common" : "page";
      const m = SEV[iss.severity] || SEV.low;
      const [editAns, setEditAns] = useState(false);
      const [draft, setDraft] = useState(iss.devAnswer || "");
      return (
        <div style={{ background: iss.done ? "#f8fafc" : "#fff", border: "1px solid", borderColor: iss.done ? "#e2e8f0" : iss.severity === "critical" ? "#fca5a5" : iss.severity === "high" ? "#fdba74" : "#e2e8f0", borderRadius: 10, padding: 16, marginBottom: 10, opacity: iss.done ? 0.5 : 1 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ background: m.bg, color: m.color, padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{m.label}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>{iss.pageName || iss.component} {iss.figmaPage && <span style={{ color: PURPLE, fontWeight: 400 }}>· {iss.figmaPage}</span>}</div>
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, whiteSpace: "pre-line" }}>{iss.issue}</div>
              {iss.spacingNote && <div style={{ marginTop: 4, background: "#f0f9ff", borderRadius: 6, padding: "4px 8px", fontSize: 11, color: "#0369a1", fontFamily: "monospace" }}>💡 {iss.spacingNote}</div>}
            </div>
            <input type="checkbox" checked={iss.done} onChange={(e) => updateIssue(type, iss.id, "done", e.target.checked)} style={{ width: 18, height: 18, cursor: "pointer", accentColor: HDR, flexShrink: 0 }} />
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>개발팀 답변</div>
            {editAns ? (
              <div>
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="수정 완료 여부, 처리 방법 등을 입력하세요" style={{ ...inp, minHeight: 56, resize: "vertical", fontSize: 13 }} />
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button style={solidBtn(HDR)} onClick={() => { updateIssue(type, iss.id, "devAnswer", draft); setEditAns(false); }}>저장</button>
                  <button style={ghostBtn("#94a3b8")} onClick={() => setEditAns(false)}>취소</button>
                </div>
              </div>
            ) : (
              <div onClick={() => setEditAns(true)} style={{ fontSize: 13, color: iss.devAnswer ? "#1d6fa4" : "#cbd5e1", cursor: "pointer", padding: "8px 10px", background: "#f8fafc", borderRadius: 6 }}>
                {iss.devAnswer || "여기를 눌러 답변을 입력하세요..."}
              </div>
            )}
          </div>
        </div>
      );
    };
    return (
      <div>
        <FilterBar />
        {urgent.length > 0 && <div style={{ marginBottom: 24 }}><div style={{ fontSize: 14, fontWeight: 700, color: "#A32D2D", marginBottom: 12 }}>🚨 우선 수정 ({urgent.length}건)</div>{urgent.map((i) => <IssueCard key={i.id} iss={i} />)}</div>}
        {rest.length > 0 && <div><div style={{ fontSize: 14, fontWeight: 700, color: "#854F0B", marginBottom: 12 }}>📋 일반 수정 ({rest.length}건)</div>{rest.map((i) => <IssueCard key={i.id} iss={i} />)}</div>}
        {myIssues.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40, fontSize: 14 }}>🎉 모든 이슈가 완료되었어요!</div>}
      </div>
    );
  };

  // 🔬 컴포넌트 검사 뷰
  const ComponentView = () => {
    const doneCnt = compIssues.filter((i) => i.done).length;
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ background: "#0891b2", borderRadius: 8, padding: "4px 14px", color: "#fff", fontSize: 13, fontWeight: 700 }}>🔬 컴포넌트 검사: {compName || compSelector}</div>
          <code style={{ background: "#f1f5f9", color: PURPLE, padding: "3px 10px", borderRadius: 5, fontSize: 12 }}>{compSelector}</code>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>{compIssues.length}건 · 완료 {doneCnt}</span>
          <button onClick={() => { setCompSelector(""); setCompName(""); setCompIssues([]); setStep(1); setWStep(2); }} style={{ ...ghostBtn("#64748b"), marginLeft: "auto", fontSize: 12 }}>다시 설정</button>
        </div>
        {compIssues.length === 0 ? (
          <Card style={{ textAlign: "center", padding: 40 }}><div style={{ fontSize: 32 }}>✅</div><div style={{ fontSize: 15, fontWeight: 600, marginTop: 8 }}>이슈가 없습니다!</div></Card>
        ) : (
          <TableShell type="component">{compIssues.map((iss) => <IssueRow key={iss.id} iss={iss} type="component" />)}</TableShell>
        )}
      </div>
    );
  };

  // 📸 스크린샷 비교 뷰
  const ScreenshotView = () => (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#7c3aed", marginBottom: 16 }}>📸 스크린샷 AI 비교 결과</div>
      {screenshotResults.map((r, i) => (
        <Card key={i} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{r.pageUrl}</div>
            <span style={{ fontSize: 24, fontWeight: 700, color: r.score >= 80 ? "#22c55e" : r.score >= 60 ? "#f59e0b" : "#ef4444" }}>{r.score}점</span>
          </div>
          <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{r.analysis}</div>
        </Card>
      ))}
      {screenshots.length > 0 && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
          {screenshots.map((s, i) => (
            <div key={i} style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", width: 160 }}>
              <img src={s.dataUrl} alt={s.name} style={{ width: "100%", height: 100, objectFit: "cover" }} />
              <div style={{ padding: "6px 8px", fontSize: 11, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const AddModal = () => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setAddModal(null)}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: 480, boxShadow: "0 8px 40px rgba(0,0,0,.15)" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>이슈 추가</h3>
        <div style={{ display: "grid", gap: 12 }}>
          {addModal === "page" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><Label>경로</Label><input value={newIssue.path || "/"} onChange={(e) => setNewIssue((p) => ({ ...p, path: e.target.value }))} style={inp} placeholder="/home" /></div>
              <div><Label>페이지명</Label><input value={newIssue.pageName || ""} onChange={(e) => setNewIssue((p) => ({ ...p, pageName: e.target.value }))} style={inp} /></div>
              <div><Label>Figma 페이지</Label><FigmaSelect pages={figmaPages} value={newIssue.figmaPage || ""} onChange={(v) => setNewIssue((p) => ({ ...p, figmaPage: v }))} /></div>
              <div><Label>화면 크기</Label><select value={newIssue.breakpoint || ""} onChange={(e) => setNewIssue((p) => ({ ...p, breakpoint: e.target.value }))} style={inp}>{breakpoints.map((b) => <option key={b.label}>{b.label}</option>)}</select></div>
              <div style={{ gridColumn: "span 2" }}><Label>검수 항목</Label><select value={newIssue.category || PAGE_CHECKS[0]} onChange={(e) => setNewIssue((p) => ({ ...p, category: e.target.value }))} style={inp}>{PAGE_CHECKS.map((c) => <option key={c}>{c}</option>)}</select></div>
            </div>
          )}
          {addModal === "common" && <div><Label>공통 요소</Label><select value={newIssue.component || "헤더"} onChange={(e) => setNewIssue((p) => ({ ...p, component: e.target.value }))} style={inp}>{COMMON_ELEMENTS.map((c) => <option key={c}>{c}</option>)}</select></div>}
          <div><Label>심각도</Label><select value={newIssue.severity || "medium"} onChange={(e) => setNewIssue((p) => ({ ...p, severity: e.target.value }))} style={inp}>{SEV_KEYS.map((k) => <option key={k} value={k}>{SEV[k].label}</option>)}</select></div>
          <div><Label>이슈 내용</Label><textarea value={newIssue.issue || ""} onChange={(e) => setNewIssue((p) => ({ ...p, issue: e.target.value }))} style={{ ...inp, minHeight: 72, resize: "vertical" }} placeholder="이슈를 상세히 입력하세요" /></div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={() => setAddModal(null)} style={ghostBtn("#94a3b8")}>취소</button>
          <button onClick={addIssue} disabled={!newIssue.issue} style={{ ...solidBtn(PURPLE), opacity: newIssue.issue ? 1 : 0.5 }}>추가</button>
        </div>
      </div>
    </div>
  );

  // 🧩 크롬 확장 프로그램 안내 모달
  const ExtModal = () => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setExtModal(false)}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32, width: 560, boxShadow: "0 16px 60px rgba(0,0,0,.2)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>🧩 크롬 확장 프로그램 설치</div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>실제 브라우저에서 요소를 클릭해 margin/padding을 자동 측정합니다</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {[
            { n: 1, title: "확장 파일 다운로드", desc: "아래 버튼을 눌러 ZIP 파일을 받으세요" },
            { n: 2, title: "Chrome 확장 관리 열기", desc: "주소창에 chrome://extensions 입력 후 [개발자 모드] ON" },
            { n: 3, title: "압축 해제 후 폴더 드래그", desc: "ZIP 압축 해제 → 폴더를 확장 관리 화면에 드래그 앤 드롭" },
            { n: 4, title: "페이지에서 요소 클릭", desc: "🔬 아이콘 클릭 → 검사할 요소 위에 마우스 올리기 → 클릭" },
          ].map((s) => (
            <div key={s.n} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: PURPLE, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{s.n}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "#f8fafc", borderRadius: 10, padding: 16, marginBottom: 20, fontSize: 12, color: "#475569" }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: "#1e293b" }}>🔍 확장 프로그램 기능</div>
          <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 2 }}>
            <li>요소 호버 시 box model (padding/margin/border) 툴팁 표시</li>
            <li>클릭 시 CSS 계산값과 Figma 기준 비교 수치 표시</li>
            <li>outline(border-box) vs inline(content-box) 자동 보정</li>
            <li>Design QA 앱으로 이슈 바로 전송</li>
          </ul>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <a href="/extension/design-qa-extension.zip" download style={{ ...solidBtn(PURPLE), textDecoration: "none", display: "inline-block" }}>⬇️ 확장 ZIP 다운로드</a>
          <button onClick={() => setExtModal(false)} style={ghostBtn("#94a3b8")}>닫기</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "Pretendard, Apple SD Gothic Neo, sans-serif", background: "#f8fafc", minHeight: "100vh", color: "#1e293b" }}>
      {addModal && <AddModal />}
      {extModal && <ExtModal />}


      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>🔍 디자인 QA</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setExtModal(true)} style={{ ...ghostBtn(PURPLE), fontSize: 12 }}>🧩 크롬 확장</button>
            {step === 2 && <button onClick={() => { setStep(1); setWStep(1); }} style={ghostBtn("#64748b")}>← 설정으로</button>}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
        {step === 1 && (
          <div>
            {/* Step indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28, background: "#fff", borderRadius: 12, padding: "16px 24px", border: "1px solid #e2e8f0" }}>
              {stepTitles.map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", flex: i < stepTitles.length - 1 ? 1 : "none" as CSSProperties["flex"] }}>
                  <div onClick={() => setWStep(i + 1)} style={{ cursor: "pointer" }}>
                    <WizardStep n={i + 1} title={t} active={wStep === i + 1} done={wStep > i + 1} />
                  </div>
                  {i < stepTitles.length - 1 && <div style={{ flex: 1, height: 1, background: wStep > i + 1 ? "#22c55e" : "#e2e8f0", margin: "0 12px" }} />}
                </div>
              ))}
            </div>

            {/* Step 1: 사이트·Figma 연결 */}
            {wStep === 1 && (
              <Card>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>사이트와 Figma 파일을 연결하세요</div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>검수할 웹사이트 주소와 디자인 파일을 입력하면 자동으로 비교합니다</div>
                <div style={{ display: "grid", gap: 16 }}>
                  <div>
                    <Label>웹사이트 주소</Label>
                    <input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://your-site.com" style={inp} />
                  </div>
                  <div>
                    <Label>Figma 파일 주소</Label>
                    <input
                      value={figmaFileUrl}
                      onChange={(e) => {
                        setFigmaFileUrl(e.target.value);
                        setFigmaFileName("");
                        setFigmaFetchMsg("");
                      }}
                      onBlur={(e) => fetchFigmaInfo(e.target.value)}
                      onPaste={(e) => {
                        const pasted = e.clipboardData.getData("text");
                        if (pasted.includes("figma.com")) {
                          setTimeout(() => fetchFigmaInfo(pasted), 50);
                        }
                      }}
                      placeholder="https://www.figma.com/file/..."
                      style={inp}
                    />
                    {(figmaFileName || figmaFetchMsg) && (
                      <div style={{ marginTop: 6, fontSize: 12, color: figmaFetchMsg.startsWith("✅") ? "#16a34a" : figmaFetchMsg.startsWith("⚠️") ? "#b45309" : "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                        {figmaFileName && <span style={{ fontWeight: 600 }}>📄 {figmaFileName}</span>}
                        {figmaFetchMsg && <span>{figmaFetchMsg}</span>}
                      </div>
                    )}
                    {/* Figma 액세스 토큰 */}
                    <div style={{ marginTop: 8 }}>
                      <button
                        onClick={() => setShowFigmaToken((v) => !v)}
                        style={{ fontSize: 12, color: "#6366f1", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                      >
                        {showFigmaToken ? "토큰 숨기기 ▲" : "프레임이 안 보이나요? 액세스 토큰 입력 ▼"}
                      </button>
                      {showFigmaToken && (
                        <div style={{ marginTop: 8, padding: 12, background: "#f0f4ff", borderRadius: 8, border: "1px solid #c7d2fe" }}>
                          <div style={{ fontSize: 12, color: "#4338ca", marginBottom: 8 }}>
                            Figma → 설정 → <strong>Personal access tokens</strong> → 토큰 생성 후 붙여넣기
                          </div>
                          <input
                            value={figmaToken}
                            onChange={(e) => {
                              setFigmaToken(e.target.value);
                              localStorage.setItem("figmaToken", e.target.value);
                            }}
                            onBlur={() => { if (figmaToken && figmaFileUrl) fetchFigmaInfo(figmaFileUrl); }}
                            placeholder="figd_..."
                            style={{ ...inp, fontFamily: "monospace", fontSize: 13 }}
                            autoComplete="off"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 🔐 검수용 계정 */}
                  <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16, border: "1px solid #e2e8f0" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: loginEnabled ? 14 : 0 }}>
                      <input type="checkbox" checked={loginEnabled} onChange={(e) => setLoginEnabled(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#0891b2" }} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#0369a1" }}>🔐 검수용 계정 — AI가 로그인 후 인증 페이지까지 검수</span>
                    </label>
                    {loginEnabled && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                        <div style={{ gridColumn: "span 3" }}>
                          <Label>로그인 URL</Label>
                          <input value={loginUrl} onChange={(e) => setLoginUrl(e.target.value)} placeholder={siteUrl ? siteUrl + "/login" : "https://your-site.com/login"} style={inp} />
                        </div>
                        <div>
                          <Label>아이디 / 이메일</Label>
                          <input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="검수용 계정 ID" style={inp} autoComplete="off" />
                        </div>
                        <div>
                          <Label>비밀번호</Label>
                          <div style={{ position: "relative" }}>
                            <input type={showPw ? "text" : "password"} value={loginPw} onChange={(e) => setLoginPw(e.target.value)} placeholder="비밀번호" style={{ ...inp, paddingRight: 40 }} autoComplete="off" />
                            <button onClick={() => setShowPw((p) => !p)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14 }}>{showPw ? "🙈" : "👁"}</button>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "flex-end" }}>
                          <div style={{ background: "#e0f2fe", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#0369a1", lineHeight: 1.5 }}>
                            ℹ️ 검수 전용 계정을 사용하세요.<br />실서비스 계정 사용 금지
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <div><Label sub="(선택)">버전</Label><input value={env.version} onChange={(e) => setEnv({ ...env, version: e.target.value })} placeholder="예) 1.6.2" style={inp} /></div>
                    <div><Label sub="(선택)">AOS</Label><input value={env.aos} onChange={(e) => setEnv({ ...env, aos: e.target.value })} placeholder="예) 240" style={inp} /></div>
                    <div><Label sub="(선택)">iOS</Label><input value={env.ios} onChange={(e) => setEnv({ ...env, ios: e.target.value })} placeholder="예) 140" style={inp} /></div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                  <button onClick={() => setWStep(2)} disabled={!siteUrl || !figmaFileUrl} style={{ ...solidBtn(PURPLE), opacity: siteUrl && figmaFileUrl ? 1 : 0.4, padding: "10px 24px", fontSize: 14 }}>다음 →</button>
                </div>
              </Card>
            )}

            {/* Step 2: 페이지 설정 */}
            {wStep === 2 && (
              <Card>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>어떤 페이지를 검수할까요?</div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>Figma 프레임을 선택하면 아래 목록에 자동으로 추가됩니다</div>

                {/* Figma 파일 정보 표시 */}
                {figmaFileName && (
                  <div style={{ marginBottom: 12, padding: "8px 12px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0", fontSize: 13, color: "#15803d" }}>
                    📄 {figmaFileName} · {figmaFetchMsg}
                  </div>
                )}

                <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 32px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", borderRadius: "10px 10px 0 0" }}>
                    {["페이지 이름", "Figma 프레임", "웹 페이지 주소", ""].map((h, i) => <div key={i} style={{ padding: "9px 14px", fontSize: 12, color: "#64748b", fontWeight: 600 }}>{h}</div>)}
                  </div>
                  {pageRows.map((row, idx) => (
                    <div key={row.id} style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 32px", borderBottom: idx < pageRows.length - 1 ? "1px solid #f8fafc" : "none", alignItems: "center" }}>
                      <div style={{ padding: "6px 8px 6px 14px" }}><input value={row.name} onChange={(e) => setPageRows((p) => p.map((r) => r.id === row.id ? { ...r, name: e.target.value } : r))} placeholder="예) 홈" style={{ ...inp, padding: "7px 10px" }} /></div>
                      <div style={{ padding: "6px 8px" }}><FigmaSelect pages={figmaPages} value={row.figmaPage} onChange={(v) => setPageRows((p) => p.map((r) => r.id === row.id ? { ...r, figmaPage: v } : r))} /></div>
                      <div style={{ padding: "6px 8px" }}><input value={row.url} onChange={(e) => setPageRows((p) => p.map((r) => r.id === row.id ? { ...r, url: e.target.value } : r))} placeholder="https://your-site.com/home" style={{ ...inp, padding: "7px 10px" }} /></div>
                      <div style={{ textAlign: "center" }}>{pageRows.length > 1 && <button onClick={() => setPageRows((p) => p.filter((r) => r.id !== row.id))} style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 14 }}>✕</button>}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setPageRows((p) => [...p, { id: Date.now(), name: "", url: "", figmaPage: "" }])} style={ghostBtn(PURPLE)}>+ 페이지 추가</button>

                {/* 공통 영역 */}
                <div style={{ marginTop: 16, padding: 16, background: "#faf5ff", borderRadius: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: commonOn ? 12 : 0 }}>
                    <input type="checkbox" checked={commonOn} onChange={(e) => setCommonOn(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#8b5cf6" }} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>헤더·푸터·GNB 등 공통 영역도 함께 검수</span>
                  </label>
                  {commonOn && <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{COMMON_ELEMENTS.map((item) => <button key={item} onClick={() => toggle(setSelCommon, item)} style={chip(selCommon.includes(item), "#8b5cf6")}>{item}</button>)}</div>}
                </div>

                {/* 🔬 컴포넌트 단위 검사 */}
                <div style={{ marginTop: 16, padding: 16, background: "#f0fdfa", borderRadius: 10, border: "1px solid #99f6e4" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: compEnabled ? 14 : 0 }}>
                    <input type="checkbox" checked={compEnabled} onChange={(e) => setCompEnabled(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#0891b2" }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#0e7490" }}>🔬 특정 컴포넌트 단위로 집중 검사</span>
                  </label>
                  {compEnabled && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "flex-end" }}>
                      <div>
                        <Label>CSS 선택자</Label>
                        <input value={compSelector} onChange={(e) => setCompSelector(e.target.value)} placeholder=".header, #nav-menu, .btn-primary" style={inp} />
                      </div>
                      <div>
                        <Label>컴포넌트 이름</Label>
                        <input value={compName} onChange={(e) => setCompName(e.target.value)} placeholder="예) 상단 네비게이션" style={inp} />
                      </div>
                      <div>
                        <button onClick={runComponentQA} disabled={compLoading || !compSelector} style={{ ...solidBtn("#0891b2"), opacity: compSelector ? 1 : 0.4, whiteSpace: "nowrap" }}>
                          {compLoading ? "검사 중..." : "🔬 지금 검사"}
                        </button>
                      </div>
                      {compError && <div style={{ gridColumn: "span 3", color: "#ef4444", fontSize: 12 }}>{compError}</div>}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
                  <button onClick={() => setWStep(1)} style={ghostBtn("#94a3b8")}>← 이전</button>
                  <button onClick={() => setWStep(3)} style={{ ...solidBtn(PURPLE), padding: "10px 24px", fontSize: 14 }}>다음 →</button>
                </div>
              </Card>
            )}

            {/* Step 3: 검수 항목 */}
            {wStep === 3 && (
              <Card>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>어떤 항목을 검수할까요?</div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>확인하고 싶은 항목과 화면 크기를 선택하세요</div>
                <div style={{ marginBottom: 20 }}>
                  <Label>화면 크기별 검수</Label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {breakpoints.map((bp) => <button key={bp.label} onClick={() => toggle(setSelBPs, bp.label)} style={chip(selBPs.includes(bp.label), PURPLE)}>{bp.label} <span style={{ opacity: 0.5 }}>{bp.width}px</span></button>)}
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <Label>검수 항목</Label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {PAGE_CHECKS.map((item) => <button key={item} onClick={() => toggle(setSelChecks, item)} style={chip(selChecks.includes(item), "#0891b2")}>{item}</button>)}
                  </div>
                </div>

                {/* 📸 스크린샷 비교 */}
                <div style={{ marginBottom: 20, padding: 16, background: "#faf5ff", borderRadius: 10, border: "1px solid #e9d5ff" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#7c3aed", marginBottom: 8 }}>📸 스크린샷 직접 비교 (선택)</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>개발 화면 스크린샷을 업로드하면 AI가 Figma 디자인과 픽셀 단위로 비교합니다</div>
                  <input ref={screenshotRef} type="file" accept="image/*" multiple onChange={handleScreenshotUpload} style={{ display: "none" }} />
                  <div
                    onClick={() => screenshotRef.current?.click()}
                    style={{ border: "2px dashed #c4b5fd", borderRadius: 10, padding: "20px", textAlign: "center", cursor: "pointer", background: "#faf5ff", transition: "all .15s" }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
                      files.forEach((file) => {
                        const reader = new FileReader();
                        reader.onload = (ev) => setScreenshots((prev) => [...prev, { name: file.name, dataUrl: ev.target?.result as string, pageUrl: siteUrl }]);
                        reader.readAsDataURL(file);
                      });
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 4 }}>🖼️</div>
                    <div style={{ fontSize: 13, color: "#7c3aed", fontWeight: 600 }}>클릭 또는 드래그해서 스크린샷 업로드</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>PNG, JPG, WEBP 지원</div>
                  </div>
                  {screenshots.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{screenshots.length}개 업로드됨</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {screenshots.map((s, i) => (
                          <div key={i} style={{ position: "relative", width: 80 }}>
                            <img src={s.dataUrl} alt={s.name} style={{ width: 80, height: 56, objectFit: "cover", borderRadius: 6, border: "1px solid #e2e8f0" }} />
                            <button onClick={() => setScreenshots((p) => p.filter((_, j) => j !== i))} style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", border: "none", borderRadius: "50%", width: 18, height: 18, color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                            <div style={{ fontSize: 10, color: "#64748b", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                          </div>
                        ))}
                      </div>
                      <button onClick={runScreenshotCompare} disabled={screenshotLoading} style={{ ...solidBtn("#7c3aed"), marginTop: 10, opacity: screenshotLoading ? 0.6 : 1 }}>
                        {screenshotLoading ? "비교 중..." : "📸 스크린샷 비교 실행"}
                      </button>
                    </div>
                  )}
                </div>

                {/* 📐 spacing 보정 안내 */}
                <div style={{ marginBottom: 20, padding: 14, background: "#f0f9ff", borderRadius: 10, border: "1px solid #bae6fd" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0369a1", marginBottom: 6 }}>📐 margin/padding 자동 보정 활성화됨</div>
                  <div style={{ fontSize: 12, color: "#0c4a6e", lineHeight: 1.7 }}>
                    AI가 <strong>개발(border-box 아웃라인 기준)</strong>과 <strong>Figma(인라인 기준)</strong>의 spacing 차이를 자동 보정합니다.<br />
                    border-width 오차 자동 제거 · Retina DPR 보정 · ±1px 이내 무시 · stroke inside/outside 구분
                  </div>
                </div>

                {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</div>}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <button onClick={() => setWStep(2)} style={ghostBtn("#94a3b8")}>← 이전</button>
                  <button onClick={runQA} disabled={loading} style={{ padding: "12px 32px", borderRadius: 10, border: "none", background: loading ? "#e2e8f0" : "linear-gradient(135deg,#6366f1,#0891b2)", color: loading ? "#94a3b8" : "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}>
                    {loading ? "🔄 AI가 검수 중입니다..." : "🚀 검수 시작"}
                  </button>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* STEP 2: RESULTS */}
        {step === 2 && (
          <div>
            {loading && (
              <Card style={{ textAlign: "center", padding: 48 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#374151" }}>AI가 디자인을 검수하고 있어요</div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>margin/padding 보정 · 스크린샷 비교 · 로그인 시나리오 포함</div>
              </Card>
            )}
            {!loading && issues && (
              <>
                {/* 탭 바 */}
                <div style={{ display: "flex", gap: 0, marginBottom: 20, background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  {[
                    ["dashboard", "📊 대시보드"],
                    ["designer", "🎨 디자이너"],
                    ["publisher", "⚙️ 퍼블리셔"],
                    ...(compIssues.length > 0 ? [["component", "🔬 컴포넌트"]] : []),
                    ...(screenshotResults.length > 0 ? [["screenshot", "📸 스크린샷"]] : []),
                  ].map(([v, l], i, arr) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      style={{
                        flex: 1,
                        padding: "13px 0",
                        border: "none",
                        borderRight: i < arr.length - 1 ? "1px solid #e2e8f0" : "none",
                        background: view === v ? (v === "component" ? "#0891b2" : v === "screenshot" ? "#7c3aed" : PURPLE) : "#fff",
                        color: view === v ? "#fff" : "#64748b",
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: view === v ? 700 : 500,
                        transition: "all .15s",
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                {view === "dashboard" && <Dashboard />}
                {view === "designer" && <DesignerView />}
                {view === "publisher" && <PublisherView />}
                {view === "component" && <ComponentView />}
                {view === "screenshot" && <ScreenshotView />}
              </>
            )}
            {!loading && !issues && (
              <>
                {view === "component" && <ComponentView />}
                {view === "screenshot" && <ScreenshotView />}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
