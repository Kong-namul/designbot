import { NextRequest, NextResponse } from "next/server";

function extractFileKey(url: string): string | null {
  const m = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}

export async function POST(req: NextRequest) {
  const { figmaFileUrl } = await req.json();

  if (!figmaFileUrl) {
    return NextResponse.json({ error: "Figma URL이 필요합니다." }, { status: 400 });
  }

  const fileKey = extractFileKey(figmaFileUrl);
  if (!fileKey) {
    return NextResponse.json({ error: "올바른 Figma URL이 아닙니다." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // 1) Claude + Figma MCP(use_figma) 로 데스크탑에서 직접 프레임 추출
  if (apiKey) {
    try {
      const jsCode = `
const result = figma.root.children.map(page => ({
  id: page.id,
  name: page.name,
  frames: page.children
    .filter(n => n.type === 'FRAME' || n.type === 'COMPONENT' || n.type === 'COMPONENT_SET')
    .map(f => ({ id: f.id, name: f.name }))
}));
result
`.trim();

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "mcp-client-2025-04-04",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2000,
          mcp_servers: [
            {
              type: "url",
              url: "https://mcp.figma.com/mcp",
              name: "figma",
            },
          ],
          messages: [
            {
              role: "user",
              content: `Figma 파일(${figmaFileUrl})이 데스크탑에 열려 있습니다.
use_figma 도구를 사용하여 fileKey "${fileKey}"로 다음 JavaScript를 실행하세요:

${jsCode}

실행 결과를 JSON 배열로만 출력하세요. 설명 없이 JSON만.`,
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = (data.content || [])
          .filter((b: { type: string }) => b.type === "text")
          .map((b: { text: string }) => b.text)
          .join("");

        const si = text.indexOf("[");
        const ei = text.lastIndexOf("]");
        if (si !== -1 && ei !== -1) {
          const pages = JSON.parse(text.slice(si, ei + 1));
          if (Array.isArray(pages) && pages.length > 0) {
            return NextResponse.json({ pages, fileKey, source: "figma-desktop" });
          }
        }
      }
    } catch {
      // Figma 데스크탑 미연결 or 에러 → 다음 폴백으로
    }
  }

  // 2) Figma REST API (FIGMA_TOKEN 환경변수가 있는 경우)
  const token = process.env.FIGMA_TOKEN;
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
            id: c.id,
            name: c.name,
            frames: (c.children || [])
              .filter((n) => n.type === "FRAME" || n.type === "COMPONENT")
              .map((f) => ({ id: f.id, name: f.name })),
          }));
        if (pages.length) {
          return NextResponse.json({ pages, fileName: data.name, fileKey, source: "rest-api" });
        }
      }
    } catch { /* ignore */ }
  }

  // 3) oEmbed으로 파일명만 (폴백)
  try {
    const oRes = await fetch(
      `https://www.figma.com/api/oembed?url=${encodeURIComponent(figmaFileUrl)}`,
      { headers: { "User-Agent": "DesignQA/1.0" } }
    );
    if (oRes.ok) {
      const o = await oRes.json();
      return NextResponse.json({
        pages: [],
        fileName: o.title || "Figma 파일",
        fileKey,
        source: "oembed",
        needsManual: true,
      });
    }
  } catch { /* ignore */ }

  return NextResponse.json({
    pages: [],
    fileName: `Figma 파일 (${fileKey})`,
    fileKey,
    source: "url",
    needsManual: true,
  });
}
