from fastapi import APIRouter, UploadFile, File, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from datetime import date
import os
import json

from openai import OpenAI

from backend.db.session import get_db
from backend.db.models import GoogleReview
from backend.service.analysis_service import analyze_sentiment_from_file

router = APIRouter(
    prefix="/analysis",
    tags=["analysis"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# =========================================================
# 1️⃣ 파일 업로드 기반 감성 분석 (기존 유지)
# =========================================================
@router.post("/file")
async def analyze_file(
    file: UploadFile = File(...)
):
    return await analyze_sentiment_from_file(file)


# =========================================================
# 2️⃣ CX 대시보드 분석 API (🔥 LLM 포함)
# =========================================================
@router.get("/cx-dashboard")
def analyze_cx_dashboard(
    store_id: str = Query(...),
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    db: Session = Depends(get_db),
):
    """
    매장 + 기간 기준 CX 분석 (LLM 기반)

    - GoogleReview 테이블에서 리뷰 조회
    - 리뷰 텍스트만 LLM 전달
    - 대시보드 전용 JSON 응답
    """

    # 1️⃣ 기간 내 리뷰 조회
    reviews = (
        db.query(GoogleReview)
        .filter(
            GoogleReview.store_id == store_id,
            GoogleReview.created_at_google >= from_date,
            GoogleReview.created_at_google <= to_date,
        )
        .all()
    )

    if not reviews:
        raise HTTPException(
            status_code=404,
            detail="해당 기간에 분석할 리뷰가 없습니다.",
        )

    review_texts = [
        r.text.strip()
        for r in reviews
        if r.text
    ]

    if not review_texts:
        raise HTTPException(
            status_code=404,
            detail="분석 가능한 리뷰 텍스트가 없습니다.",
        )

    # 2️⃣ LLM 프롬프트
    prompt = f"""
너는 외식업 고객경험(CX) 분석 전문가다.

아래는 특정 매장의 Google 리뷰 텍스트 목록이다.
이 리뷰들을 분석해서 반드시 JSON 형식으로만 응답해라.

요구 결과 스키마:
{{
  "summary": "한 문단 요약",
  "rating": number (0~5),
  "nps": number (0~10),
  "sentiment": {{
    "positive": number,
    "neutral": number,
    "negative": number
  }},
  "keywords": [string, string, ...],
  "drivers": [
    {{ "label": string, "value": number }}
  ],
  "improvements": [
    {{ "label": string, "value": number }}
  ],
  "insights": [
    {{ "title": string, "desc": string }}
  ],
  "actionPlan": [
    {{ "area": string, "action": string }}
  ]
}}

리뷰 텍스트:
{json.dumps(review_texts, ensure_ascii=False)}
"""

    # 3️⃣ OpenAI 호출
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a CX analytics expert."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
    )

    content = response.choices[0].message.content

    # 4️⃣ JSON 파싱
    try:
        result = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="LLM 응답을 JSON으로 파싱할 수 없습니다.",
        )

    return result