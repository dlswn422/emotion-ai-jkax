from sqlalchemy import text

KEYWORDS = [
    "신규시설", "유상증자", "투자", "증설",
    "생산능력", "공장", "설비"
]

def get_candidates(db, tenant_id: int, limit: int = 100):
    rows = db.execute(text("""
        select id, corp_code, corp_name, report_nm, rcept_dt
        from dart_disclosures
        where tenant_id = :tenant_id
        order by rcept_dt desc
        limit :limit
    """), {"tenant_id": tenant_id, "limit": limit}).mappings().all()

    result = []

    for r in rows:
        name = r["report_nm"] or ""

        if any(k in name for k in KEYWORDS):
            result.append(dict(r))

    return result