import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { figmaFileKey, figmaToken } = await req.json();

  if (!figmaFileKey) {
    return NextResponse.json({ error: "Figma 파일 키가 필요합니다." }, { status: 400 });
  }

  // 환경변수 또는 클라이언트에서 전달된 토큰 사용
  const token = figmaToken || process.env.FIGMA_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "FIGMA_TOKEN이 없습니다. Figma Personal Access Token을 입력해주세요." },
      { status: 401 }
    );
  }

  try {
    // Figma REST API 직접 호출 (MCP 우회) - depth=1로 최상위만 가져와 빠름
    const res = await fetch(`https://api.figma.com/v1/files/${figmaFileKey}?depth=1`, {
      headers: {
        "X-Figma-Token": token,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 403) {
        return NextResponse.json({ error: "Figma 토큰이 유효하지 않거나 파일 접근 권한이 없습니다." }, { status: 403 });
      }
      if (res.status === 404) {
        return NextResponse.json({ error: "Figma 파일을 찾을 수 없습니다. URL을 확인해주세요." }, { status: 404 });
      }
      return NextResponse.json({ error: err.message || `Figma API 오류 (${res.status})` }, { status: res.status });
    }

    const data = await res.json();

    // document.children = 페이지 목록 (type: CANVAS)
    const pages: string[] = (data.document?.children || [])
      .filter((c: { type: string }) => c.type === "CANVAS")
      .map((c: { name: string }) => c.name);

    if (!pages.length) {
      return NextResponse.json({ error: "페이지를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ pages, fileName: data.name });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "불러오기 실패: " + (e instanceof Error ? e.message : String(e)) },
      { status: 500 }
    );
  }
}
