import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { screenshots, figmaFileUrl, siteUrl } = await req.json();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." }, { status: 500 });

  try {
    const results = [];
    for (const screenshot of screenshots) {
      const base64Data = screenshot.dataUrl.split(",")[1];
      const mediaType = screenshot.dataUrl.split(";")[0].split(":")[1] || "image/png";

      const body = {
        model: "claude-opus-4-5",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64Data },
              },
              {
                type: "text",
                text: `당신은 디자인 QA 전문가입니다. 이 스크린샷을 분석해서 Figma 디자인과 비교해주세요.

사이트: ${siteUrl}
Figma 파일: ${figmaFileUrl || "없음"}
스크린샷 파일명: ${screenshot.name}

[여백·간격 보정 규칙]
- CSS box-sizing:border-box (아웃라인 기준) vs Figma 인라인 기준 차이를 반드시 구분
- ±1px 이내: 정상. ±2~4px + border 존재: low 이슈(outline 기준 차이). ±5px 이상: 실제 이슈
- Retina(HiDPI) 화면: 픽셀 ÷ devicePixelRatio로 실제 CSS 값 환산
- 이슈마다 [outline기준] 또는 [inline기준] 태그 포함

다음 항목을 검사하세요:
1. spacing/여백: padding, margin이 Figma와 일치하는지 (outline vs inline 구분)
2. 색상: 텍스트, 배경, 테두리 색상
3. 타이포그래피: font-size, font-weight, line-height
4. 컴포넌트 크기: width, height, border-radius
5. 정렬: flex/grid 정렬 상태

JSON 형식으로만 응답:
{"score": 85, "analysis": "전체 분석 내용 (마크다운 형식)", "issues": [{"severity": "high", "category": "간격·여백", "element": ".btn", "issue": "버튼 padding이 Figma 16px보다 4px 작음 [inline기준]", "spacingNote": "Figma:16px / Dev:12px / 차이:4px"}]}`,
              },
            ],
          },
        ],
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
      if (!res.ok) throw new Error(data.error?.message || "API 오류");

      const text = data.content.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
      const clean = text.replace(/```json|```/g, "").trim();
      const si = clean.indexOf("{"); const ei = clean.lastIndexOf("}");
      const parsed = JSON.parse(clean.slice(si, ei + 1));
      results.push({ pageUrl: screenshot.pageUrl || siteUrl, name: screenshot.name, ...parsed });
    }

    return NextResponse.json({ results });
  } catch (e: unknown) {
    return NextResponse.json({ error: "분석 오류: " + (e instanceof Error ? e.message : String(e)) }, { status: 500 });
  }
}
