# 📊 CX Nexus – Review Insight Platform

고객 리뷰 및 설문 데이터를 업로드하면  
AI가 감성 분석, 핵심 키워드, 종합 요약을 제공하는 웹 서비스입니다.

---

## 🧩 프로젝트 구성

```text
emotion-ai/
├── backend/        # FastAPI + GPT 분석
│   ├── main.py
│   ├── analysis.py
│   ├── file_parser.py
│   └── requirements.txt
│
├── frontend/       # Next.js (App Router)
│   ├── app/
│   │   ├── page.tsx        # 메인
│   │   ├── upload/page.tsx # 업로드
│   │   └── dashboard/page.tsx
│   ├── package.json
│   └── tailwind.config.js
│
└── README.md
