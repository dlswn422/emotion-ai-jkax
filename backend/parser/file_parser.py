from typing import List
import pandas as pd
from fastapi import UploadFile
from io import BytesIO


async def extract_reviews_from_file(file: UploadFile) -> List[str]:
    """
    CSV / XLSX 파일에서 리뷰 텍스트를 추출한다.

    원칙:
    - '리뷰 개수 = 행(row) 개수' 유지 (기존 동작 유지)
    - 설문형(다중 컬럼) 데이터 지원
    - 셀 내부 줄바꿈은 정리하되, 리뷰를 쪼개지는 않음
    """

    content = await file.read()

    # =========================
    # 파일 로드
    # =========================
    if file.filename.lower().endswith(".csv"):
        df = pd.read_csv(BytesIO(content))
    elif file.filename.lower().endswith((".xlsx", ".xls")):
        df = pd.read_excel(BytesIO(content))
    else:
        raise ValueError("지원하지 않는 파일 형식입니다. (csv, xlsx만 가능)")

    reviews: List[str] = []

    # =========================
    # 1️⃣ review 컬럼이 명확히 있는 경우 (최우선)
    # =========================
    if "review" in df.columns:
        for value in df["review"].dropna().astype(str):
            text = value.replace("\n", " ").strip()
            if len(text) > 3:
                reviews.append(text)
        return reviews

    # =========================
    # 2️⃣ 설문형 데이터 대응 (행 기준)
    # =========================
    for _, row in df.iterrows():
        texts = []

        for v in row.values:
            if isinstance(v, str):
                cleaned = v.replace("\n", " ").strip()
                if len(cleaned) > 3:
                    texts.append(cleaned)

        # 👉 한 행 = 하나의 리뷰 (기존 방식 유지)
        if texts:
            reviews.append(" / ".join(texts))

    return reviews