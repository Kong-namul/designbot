import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { figmaFileKey } = await req.json();

  if (!figmaFileKey) {
    return NextResponse.json({ error: "Figma 파일 키가 필요합니다." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "mcp-client-2025-04-04",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        mcp_servers: [{ type: "url", url: "https://mcp.figma.com/mcp", name: "figma" }],
        messages: [
          {
            role: "user",
            content:
              "Figma 파일 키: " +
              figmaFileKey +
              '\n이 파일의 모든 페이지 이름을 JSON 배열로만 반환: ["Page1","Page2"]',
          },
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || "Figma API 오류" }, { status: res.status });
    }

    const text = data.content
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const si = clean.indexOf("[");
    const ei = clean.lastIndexOf("]");
    const pages = JSON.parse(clean.slice(si, ei + 1));

    return NextResponse.json({ pages });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "불러오기 실패: " + (e instanceof Error ? e.message : String(e)) },
      { status: 500 }
    );
  }
}
