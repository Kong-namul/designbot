"use client";

import { useState, useRef, useEffect, CSSProperties, ReactNode } from "react";

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

const Card = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => (
  <div
    style={{
      background: "#fff",
      borderRadius: 14,
      padding: 24,
      border: "1px solid #e2e8f0",
      ...style,
    }}
  >
    {children}
  </div>
);

const Label = ({ children, sub }: { children: ReactNode; sub?: string }) => (
  <div style={{ marginBottom: 8 }}>
    <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{children}</span>
    {sub && (
      <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 6 }}>{sub}</span>
    )}
  </div>
);

const SevBadge = ({ s }: { s: string }) => {
  const m = SEV[s] || SEV.low;
  return (
    <span
      style={{
        background: m.bg,
        color: m.color,
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {m.label}
    </span>
  );
};

function FigmaSelect({
  pages,
  value,
  onChange,
}: {
  pages: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const filtered = pages.filter((p) => p.toLowerCase().includes(q.toLowerCase()));
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          ...inp,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ color: value ? "#1e293b" : "#94a3b8" }}>{value || "Figma 페이지 선택"}</span>
        <span style={{ fontSize: 10, color: "#94a3b8" }}>▼</span>
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            zIndex: 300,
            boxShadow: "0 8px 24px rgba(0,0,0,.1)",
          }}
        >
          <div style={{ padding: 8, borderBottom: "1px solid #f1f5f9" }}>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="검색..."
              style={{ ...inp, padding: "6px 10px", fontSize: 13 }}
            />
          </div>
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            <div
              onClick={() => {
                onChange("");
                setOpen(false);
                setQ("");
              }}
              style={{ padding: "8px 14px", cursor: "pointer", fontSize: 13, color: "#94a3b8" }}
            >
              — 선택 안 함
            </div>
            {filtered.map((p) => (
              <div
                key={p}
                onClick={() => {
                  onChange(p);
                  setOpen(false);
                  setQ("");
                }}
                style={{
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontSize: 13,
                  background: p === value ? "#f0f4ff" : "transparent",
                  color: p === value ? PURPLE : "#1e293b",
                }}
              >
                {p}
              </div>
            ))}
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
  const [figmaLoading, setFigmaLoading] = useState(false);
  const [figmaErr, setFigmaErr] = useState("");
  const [pageRows, setPageRows] = useState<PageRow[]>([{ id: 1, name: "", url: "", figmaPage: "" }]);
  const [commonOn, setCommonOn] = useState(true);
  const [selCommon, setSelCommon] = useState(["헤더", "푸터", "GNB"]);
  const [breakpoints, setBPs] = useState<Breakpoint[]>(DEFAULT_BREAKPOINTS);
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

  // suppress unused warning
  void setBPs;

  const toggle = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, val: T) =>
    setter((p) => (p.includes(val) ? p.filter((x) => x !== val) : [...p, val]));

  const loadFigma = async () => {
    if (!figmaFileUrl.trim()) {
      setFigmaErr("Figma URL을 입력하세요.");
      return;
    }
    setFigmaLoading(true);
    setFigmaErr("");
    setFigmaPages([]);
    try {
      const m = figmaFileUrl.match(/figma\.com\/(?:file|design)\/([A-Za-z0-9]+)/);
      if (!m) throw new Error("유효한 Figma URL이 아닙니다.");
      const res = await fetch("/api/figma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ figmaFileKey: m[1] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "불러오기 실패");
      setFigmaPages(data.pages);
    } catch (e: unknown) {
      setFigmaErr("불러오기 실패: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setFigmaLoading(false);
    }
  };

  const buildPrompt = () => {
    const rows = pageRows.filter((r) => r.url.trim());
    const pageList = rows
      .map(
        (r, i) =>
          i +
          1 +
          ". " +
          (r.name || r.url) +
          " | URL: " +
          r.url +
          (r.figmaPage ? " | Figma: " + r.figmaPage : "")
      )
      .join("\n");
    return `당신은 디자인 QA 전문가입니다. Figma 디자인과 퍼블리싱 결과물을 비교 검수하세요.
Figma 파일: ${figmaFileUrl || "없음"}
페이지 목록:\n${pageList || "1. " + siteUrl}
화면 크기: ${selBPs.join(", ")}
검수 항목: ${selChecks.join(", ")}
${commonOn ? "공통 요소: " + selCommon.join(", ") : "공통 요소 검수 없음"}
severity: critical=즉시수정/배포불가, high=빠른수정, medium=다음스프린트, low=여유수정
JSON만 반환:
{"summary":"요약","score":85,"commonIssues":[{"id":1,"component":"헤더","breakpoint":"모바일","severity":"high","element":".header","issue":"설명","publishedUrl":"${siteUrl}","devAnswer":"","done":false}],"pageIssues":[{"id":2,"path":"/home","pageName":"홈","figmaPage":"Home","breakpoint":"모바일","category":"색상·폰트 불일치","severity":"high","element":".btn","issue":"설명","publishedUrl":"${siteUrl}/home","devAnswer":"","done":false}]}`;
  };

  const runQA = async () => {
    if (!siteUrl) {
      setError("사이트 주소를 입력해주세요.");
      return;
    }
    setError("");
    setLoading(true);
    setIssues(null);
    setStep(2);
    setView("dashboard");
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

  const updateIssue = (type: string, id: number, field: string, val: unknown) => {
    const key = type === "common" ? "commonIssues" : "pageIssues";
    setIssues((p) =>
      p ? { ...p, [key]: p[key as keyof IssuesData] instanceof Array
        ? (p[key as "commonIssues" | "pageIssues"] as Issue[]).map((i) =>
            i.id === id ? { ...i, [field]: val } : i
          )
        : p[key as keyof IssuesData] } : null
    );
  };

  const deleteIssue = (type: string, id: number) => {
    const key = type === "common" ? "commonIssues" : "pageIssues";
    setIssues((p) =>
      p ? { ...p, [key]: (p[key as "commonIssues" | "pageIssues"] as Issue[]).filter((i) => i.id !== id) } : null
    );
  };

  const addIssue = () => {
    const key = addModal === "common" ? "commonIssues" : "pageIssues";
    setIssues((p) =>
      p
        ? {
            ...p,
            [key]: [
              ...(p[key as "commonIssues" | "pageIssues"] as Issue[]),
              { ...newIssue, id: uid++, done: false, devAnswer: "" },
            ],
          }
        : null
    );
    setAddModal(null);
    setNewIssue({});
  };

  const allIssues = issues ? [...(issues.commonIssues || []), ...(issues.pageIssues || [])] : [];
  const totalDone = allIssues.filter((i) => i.done).length;
  const progress = allIssues.length ? Math.round((totalDone / allIssues.length) * 100) : 0;
  const sevCounts = SEV_KEYS.reduce(
    (a, k) => ({ ...a, [k]: allIssues.filter((i) => i.severity === k).length }),
    {} as Record<string, number>
  );

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
    const q = (v: unknown) => '"' + String(v || "").replace(/"/g, '""') + '"';
    const envStr =
      [env.version, env.aos && "AOS_" + env.aos, env.ios && "iOS_" + env.ios].filter(Boolean).join("\n") || "-";
    const rows = [["환경", "Figma 페이지", "퍼블리싱 화면", "시나리오 / 이슈 사항", "개발팀 답변", "완료"].map(q).join(",")];
    const render = (iss: Issue, label: string) =>
      [
        q(envStr + "\n[" + (SEV[iss.severity] || SEV.low).label + "]"),
        q(figmaFileUrl || ""),
        q(iss.publishedUrl || siteUrl),
        q("[" + label + "]\n" + iss.issue),
        q(iss.devAnswer || ""),
        q(iss.done ? "✓" : ""),
      ].join(",");
    if (type === "common") {
      rows.push([q("【공통 영역】"), "", "", "", "", ""].join(","));
      (issues?.commonIssues || []).forEach((i) => rows.push(render(i, i.component || "")));
    } else {
      groupByPath(issues?.pageIssues).forEach((g) => {
        rows.push([q("【" + g.pageName + " (" + g.path + ")】"), "", "", "", "", ""].join(","));
        g.issues.forEach((i) => rows.push(render(i, (i.breakpoint || "") + " / " + (i.category || ""))));
      });
    }
    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = type + "_qa.csv";
    a.click();
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
          {type === "page" && iss.figmaPage ? (
            <div style={{ color: PURPLE, fontWeight: 600 }}>{iss.figmaPage}</div>
          ) : (
            <span style={{ color: "#cbd5e1" }}>—</span>
          )}
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
              <div style={{ color: "#475569", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-line", flex: 1 }}>{iss.issue}</div>
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
        <thead>
          <tr>
            <TH w={100}>심각도</TH>
            <TH w={90}>Figma</TH>
            <TH w={260}>이슈 내용</TH>
            <TH w={180}>개발팀 답변</TH>
            <TH w={60}>완료</TH>
          </tr>
        </thead>
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
        const m = SEV[k];
        const on = filterSev.includes(k);
        return (
          <button key={k} onClick={() => toggle(setFilterSev, k)} style={{ padding: "3px 10px", borderRadius: 12, border: "1px solid", cursor: "pointer", fontSize: 11, fontWeight: 700, borderColor: on ? m.color : "#e2e8f0", background: on ? m.bg : "#fff", color: on ? m.color : "#94a3b8" }}>{m.label}</button>
        );
      })}
      <button onClick={() => setFilterDone((p) => !p)} style={{ padding: "3px 10px", borderRadius: 12, border: "1px solid", cursor: "pointer", fontSize: 11, borderColor: filterDone ? "#6366f1" : "#e2e8f0", background: filterDone ? "#ede9fe" : "#fff", color: filterDone ? "#6366f1" : "#94a3b8" }}>미완료만</button>
      {(filterSev.length > 0 || filterDone) && (
        <button onClick={() => { setFilterSev([]); setFilterDone(false); }} style={{ padding: "3px 10px", borderRadius: 12, border: "1px solid #e2e8f0", cursor: "pointer", fontSize: 11, color: "#94a3b8" }}>초기화</button>
      )}
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
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ background: "#f1f5f9", borderRadius: 99, height: 10, overflow: "hidden" }}>
                  <div style={{ width: progress + "%", height: "100%", background: progress === 100 ? "#22c55e" : HDR, borderRadius: 99, transition: "width .4s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>완료 {totalDone}건 / 전체 {allIssues.length}건</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: progress === 100 ? "#22c55e" : HDR }}>{progress}%</span>
                </div>
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
              const m = SEV[k];
              const cnt = sevCounts[k];
              const doneCnt = allIssues.filter((i) => i.severity === k && i.done).length;
              return (
                <div key={k} style={{ background: m.bg, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: m.color, marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: m.color, lineHeight: 1 }}>{cnt}</div>
                  <div style={{ fontSize: 11, color: m.color, opacity: 0.7, marginTop: 4 }}>완료 {doneCnt}/{cnt}</div>
                  {cnt > 0 && (
                    <div style={{ marginTop: 6, background: "rgba(255,255,255,.5)", borderRadius: 99, height: 4 }}>
                      <div style={{ width: (cnt ? (doneCnt / cnt) * 100 : 0) + "%", height: "100%", background: m.color, borderRadius: 99 }} />
                    </div>
                  )}
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
            {criticalHighIssues.length > 5 && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8, textAlign: "center" }}>외 {criticalHighIssues.length - 5}건 — 상세 보기에서 확인하세요</div>}
          </Card>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setView("designer")} style={solidBtn(PURPLE)}>🎨 디자이너 검수 뷰</button>
          <button onClick={() => setView("publisher")} style={solidBtn(HDR)}>⚙️ 퍼블리셔 수정 뷰</button>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={() => downloadCSV("common")} style={ghostBtn(HDR)}>공통 CSV</button>
            <button onClick={() => downloadCSV("page")} style={ghostBtn(HDR)}>페이지 CSV</button>
          </div>
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
              <button onClick={() => downloadCSV("common")} style={{ ...ghostBtn(HDR), marginLeft: "auto", fontSize: 12 }}>CSV</button>
            </div>
            <TableShell type="common">
              {filteredCommon.map((iss) => <IssueRow key={iss.id} iss={iss} type="common" />)}
            </TableShell>
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
            <TableShell type="page">
              {g.issues.map((iss) => <IssueRow key={iss.id} iss={iss} type="page" />)}
            </TableShell>
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
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>
                {iss.pageName || iss.component} {iss.figmaPage && <span style={{ color: PURPLE, fontWeight: 400 }}>· {iss.figmaPage}</span>}
              </div>
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, whiteSpace: "pre-line" }}>{iss.issue}</div>
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
        {urgent.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#A32D2D", marginBottom: 12 }}>🚨 우선 수정 ({urgent.length}건)</div>
            {urgent.map((i) => <IssueCard key={i.id} iss={i} />)}
          </div>
        )}
        {rest.length > 0 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#854F0B", marginBottom: 12 }}>📋 일반 수정 ({rest.length}건)</div>
            {rest.map((i) => <IssueCard key={i.id} iss={i} />)}
          </div>
        )}
        {myIssues.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40, fontSize: 14 }}>🎉 모든 이슈가 완료되었어요!</div>}
      </div>
    );
  };

  const AddModal = () => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setAddModal(null)}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: 480, boxShadow: "0 8px 40px rgba(0,0,0,.15)" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>이슈 추가</h3>
        <div style={{ display: "grid", gap: 12 }}>
          {addModal === "page" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><Label>경로</Label><input value={newIssue.path || "/"} onChange={(e) => setNewIssue((p) => ({ ...p, path: e.target.value }))} style={inp} placeholder="/home" /></div>
              <div><Label>페이지명</Label><input value={newIssue.pageName || ""} onChange={(e) => setNewIssue((p) => ({ ...p, pageName: e.target.value }))} style={inp} /></div>
              <div>
                <Label>Figma 페이지</Label>
                {figmaPages.length > 0 ? (
                  <FigmaSelect pages={figmaPages} value={newIssue.figmaPage || ""} onChange={(v) => setNewIssue((p) => ({ ...p, figmaPage: v }))} />
                ) : (
                  <input value={newIssue.figmaPage || ""} onChange={(e) => setNewIssue((p) => ({ ...p, figmaPage: e.target.value }))} style={inp} placeholder="페이지명" />
                )}
              </div>
              <div>
                <Label>화면 크기</Label>
                <select value={newIssue.breakpoint || ""} onChange={(e) => setNewIssue((p) => ({ ...p, breakpoint: e.target.value }))} style={inp}>
                  {breakpoints.map((b) => <option key={b.label}>{b.label}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <Label>검수 항목</Label>
                <select value={newIssue.category || PAGE_CHECKS[0]} onChange={(e) => setNewIssue((p) => ({ ...p, category: e.target.value }))} style={inp}>
                  {PAGE_CHECKS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}
          {addModal === "common" && (
            <div>
              <Label>공통 요소</Label>
              <select value={newIssue.component || "헤더"} onChange={(e) => setNewIssue((p) => ({ ...p, component: e.target.value }))} style={inp}>
                {COMMON_ELEMENTS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          )}
          <div>
            <Label>심각도</Label>
            <select value={newIssue.severity || "medium"} onChange={(e) => setNewIssue((p) => ({ ...p, severity: e.target.value }))} style={inp}>
              {SEV_KEYS.map((k) => <option key={k} value={k}>{SEV[k].label}</option>)}
            </select>
          </div>
          <div>
            <Label>이슈 내용</Label>
            <textarea value={newIssue.issue || ""} onChange={(e) => setNewIssue((p) => ({ ...p, issue: e.target.value }))} style={{ ...inp, minHeight: 72, resize: "vertical" }} placeholder="이슈를 상세히 입력하세요" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={() => setAddModal(null)} style={ghostBtn("#94a3b8")}>취소</button>
          <button onClick={addIssue} disabled={!newIssue.issue} style={{ ...solidBtn(PURPLE), opacity: newIssue.issue ? 1 : 0.5 }}>추가</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "Pretendard, Apple SD Gothic Neo, sans-serif", background: "#f8fafc", minHeight: "100vh", color: "#1e293b" }}>
      {addModal && <AddModal />}

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 32px" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>🔍 디자인 QA</span>
            {step === 2 && issues && (
              <div style={{ display: "flex", gap: 4, marginLeft: 16 }}>
                {([["dashboard", "📊 대시보드"], ["designer", "🎨 디자이너"], ["publisher", "⚙️ 퍼블리셔"]] as const).map(([v, l]) => (
                  <button key={v} onClick={() => setView(v)} style={{ padding: "4px 12px", borderRadius: 6, border: "none", background: view === v ? PURPLE : "transparent", color: view === v ? "#fff" : "#64748b", cursor: "pointer", fontSize: 13, fontWeight: view === v ? 700 : 400 }}>{l}</button>
                ))}
              </div>
            )}
          </div>
          {step === 2 && <button onClick={() => { setStep(1); setWStep(1); }} style={ghostBtn("#64748b")}>← 설정으로</button>}
        </div>
      </div>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "28px 24px" }}>
        {/* STEP 1: WIZARD */}
        {step === 1 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28, background: "#fff", borderRadius: 12, padding: "16px 24px", border: "1px solid #e2e8f0" }}>
              {stepTitles.map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", flex: i < stepTitles.length - 1 ? 1 : undefined }}>
                  <div onClick={() => setWStep(i + 1)} style={{ cursor: "pointer" }}>
                    <WizardStep n={i + 1} title={t} active={wStep === i + 1} done={wStep > i + 1} />
                  </div>
                  {i < stepTitles.length - 1 && <div style={{ flex: 1, height: 1, background: wStep > i + 1 ? "#22c55e" : "#e2e8f0", margin: "0 12px" }} />}
                </div>
              ))}
            </div>

            {/* Step 1 */}
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
                    <Label sub="(선택)">Figma 파일 주소</Label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={figmaFileUrl} onChange={(e) => { setFigmaFileUrl(e.target.value); setFigmaPages([]); }} placeholder="https://www.figma.com/file/..." style={{ ...inp, flex: 1 }} />
                      <button onClick={loadFigma} disabled={figmaLoading} style={{ ...solidBtn(PURPLE), whiteSpace: "nowrap", opacity: figmaLoading ? 0.6 : 1 }}>{figmaLoading ? "불러오는 중..." : "페이지 불러오기"}</button>
                    </div>
                    {figmaErr && <div style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{figmaErr}</div>}
                    {figmaPages.length > 0 && (
                      <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: "#64748b" }}>페이지 {figmaPages.length}개 발견:</span>
                        {figmaPages.map((p) => <span key={p} style={{ fontSize: 12, background: "#ede9fe", color: PURPLE, padding: "2px 8px", borderRadius: 10 }}>{p}</span>)}
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
                  <button onClick={() => setWStep(2)} disabled={!siteUrl} style={{ ...solidBtn(PURPLE), opacity: siteUrl ? 1 : 0.4, padding: "10px 24px", fontSize: 14 }}>다음 →</button>
                </div>
              </Card>
            )}

            {/* Step 2 */}
            {wStep === 2 && (
              <Card>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>어떤 페이지를 검수할까요?</div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>Figma의 페이지와 실제 웹페이지를 짝지어 주세요</div>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 32px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    {["페이지 이름", "Figma 페이지", "웹 페이지 주소", ""].map((h, i) => (
                      <div key={i} style={{ padding: "9px 14px", fontSize: 12, color: "#64748b", fontWeight: 600 }}>{h}</div>
                    ))}
                  </div>
                  {pageRows.map((row, idx) => (
                    <div key={row.id} style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 32px", borderBottom: idx < pageRows.length - 1 ? "1px solid #f8fafc" : "none", alignItems: "center" }}>
                      <div style={{ padding: "6px 8px 6px 14px" }}>
                        <input value={row.name} onChange={(e) => setPageRows((p) => p.map((r) => r.id === row.id ? { ...r, name: e.target.value } : r))} placeholder="예) 홈" style={{ ...inp, padding: "7px 10px" }} />
                      </div>
                      <div style={{ padding: "6px 8px" }}>
                        {figmaPages.length > 0 ? (
                          <FigmaSelect pages={figmaPages} value={row.figmaPage} onChange={(v) => setPageRows((p) => p.map((r) => r.id === row.id ? { ...r, figmaPage: v } : r))} />
                        ) : (
                          <input value={row.figmaPage} onChange={(e) => setPageRows((p) => p.map((r) => r.id === row.id ? { ...r, figmaPage: e.target.value } : r))} placeholder="직접 입력" style={{ ...inp, padding: "7px 10px" }} />
                        )}
                      </div>
                      <div style={{ padding: "6px 8px" }}>
                        <input value={row.url} onChange={(e) => setPageRows((p) => p.map((r) => r.id === row.id ? { ...r, url: e.target.value } : r))} placeholder="https://your-site.com/home" style={{ ...inp, padding: "7px 10px" }} />
                      </div>
                      <div style={{ textAlign: "center" }}>
                        {pageRows.length > 1 && <button onClick={() => setPageRows((p) => p.filter((r) => r.id !== row.id))} style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 14 }}>✕</button>}
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setPageRows((p) => [...p, { id: Date.now(), name: "", url: "", figmaPage: "" }])} style={ghostBtn(PURPLE)}>+ 페이지 추가</button>
                <div style={{ marginTop: 20, padding: 16, background: "#faf5ff", borderRadius: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: commonOn ? 12 : 0 }}>
                    <input type="checkbox" checked={commonOn} onChange={(e) => setCommonOn(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#8b5cf6" }} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>헤더·푸터·GNB 등 공통 영역도 함께 검수</span>
                  </label>
                  {commonOn && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {COMMON_ELEMENTS.map((item) => <button key={item} onClick={() => toggle(setSelCommon, item)} style={chip(selCommon.includes(item), "#8b5cf6")}>{item}</button>)}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
                  <button onClick={() => setWStep(1)} style={ghostBtn("#94a3b8")}>← 이전</button>
                  <button onClick={() => setWStep(3)} style={{ ...solidBtn(PURPLE), padding: "10px 24px", fontSize: 14 }}>다음 →</button>
                </div>
              </Card>
            )}

            {/* Step 3 */}
            {wStep === 3 && (
              <Card>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>어떤 항목을 검수할까요?</div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>확인하고 싶은 항목과 화면 크기를 선택하세요</div>
                <div style={{ marginBottom: 20 }}>
                  <Label>화면 크기별 검수</Label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {breakpoints.map((bp) => (
                      <button key={bp.label} onClick={() => toggle(setSelBPs, bp.label)} style={chip(selBPs.includes(bp.label), PURPLE)}>
                        {bp.label} <span style={{ opacity: 0.5 }}>{bp.width}px</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <Label>검수 항목</Label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {PAGE_CHECKS.map((item) => <button key={item} onClick={() => toggle(setSelChecks, item)} style={chip(selChecks.includes(item), "#0891b2")}>{item}</button>)}
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
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>페이지 수에 따라 1~2분 정도 걸릴 수 있어요</div>
              </Card>
            )}
            {!loading && issues && (
              <>
                {view === "dashboard" && <Dashboard />}
                {view === "designer" && <DesignerView />}
                {view === "publisher" && <PublisherView />}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
