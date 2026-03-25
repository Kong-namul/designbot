import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { prompt, figmaFileUrl, responseType } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const body: Record<string, unknown> = {
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || "API 오류" }, { status: res.status });
    }

    const text = data.content
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");
    const clean = text.replace(/```json|```/g, "").trim();

    // 컴포넌트 검사처럼 배열 응답이 필요한 경우
    if (responseType === "array") {
      const si = clean.indexOf("[");
      const ei = clean.lastIndexOf("]");
      if (si !== -1 && ei !== -1) {
        const result = JSON.parse(clean.slice(si, ei + 1));
        return NextResponse.json(result);
      }
    }

    const si = clean.indexOf("{");
    const ei = clean.lastIndexOf("}");
    const result = JSON.parse(clean.slice(si, ei + 1));

    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "분석 오류: " + (e instanceof Error ? e.message : String(e)) },
      { status: 500 }
    );
  }
}
