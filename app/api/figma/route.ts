import { NextRequest, NextResponse } from "next/server";

// Figma URL에서 file key 추출
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

  // 1) Figma REST API 시도 (FIGMA_TOKEN 환경변수가 있는 경우)
  const token = process.env.FIGMA_TOKEN;
  if (token) {
    try {
      const res = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=1`, {
        headers: { "X-Figma-Token": token },
      });
      if (res.ok) {
        const data = await res.json();
        const pages: string[] = (data.document?.children || [])
          .filter((c: { type: string }) => c.type === "CANVAS")
          .map((c: { name: string }) => c.name);
        if (pages.length) {
          return NextResponse.json({ pages, fileName: data.name, source: "api" });
        }
      }
    } catch {
      // REST API 실패 시 다음 방법으로
    }
  }

  // 2) Figma oEmbed로 파일 제목만 가져오기 (인증 불필요)
  try {
    const oembedRes = await fetch(
      `https://www.figma.com/api/oembed?url=${encodeURIComponent(figmaFileUrl)}`,
      { headers: { "User-Agent": "DesignQA/1.0" } }
    );
    if (oembedRes.ok) {
      const oData = await oembedRes.json();
      return NextResponse.json({
        pages: [],
        fileName: oData.title || "Figma 파일",
        source: "oembed",
        fileKey,
        message: "페이지를 직접 입력해주세요",
      });
    }
  } catch {
    // oEmbed도 실패 시
  }

  // 3) URL에서 파일 키만 반환 (최소 폴백)
  return NextResponse.json({
    pages: [],
    fileName: `Figma 파일 (${fileKey})`,
    source: "url",
    fileKey,
    message: "페이지를 직접 입력해주세요",
  });
}
