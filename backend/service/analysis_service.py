from backend.analysis.sentiment import analyze_reviews
from backend.parser.file_parser import extract_reviews_from_file
from fastapi import UploadFile

async def analyze_sentiment_from_file(file: UploadFile):
    reviews = await extract_reviews_from_file(file)
    return analyze_reviews(reviews)

