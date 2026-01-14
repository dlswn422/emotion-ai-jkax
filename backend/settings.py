import os

# backend 폴더 기준
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

COLLECTORS_DIR = os.path.join(BASE_DIR, "collectors")

TOKEN_FILE = os.path.join(COLLECTORS_DIR, "token.pickle")
CLIENT_SECRET_FILE = os.path.join(COLLECTORS_DIR, "client_secret.json")