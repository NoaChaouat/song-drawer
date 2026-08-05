import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DB_NAME = os.environ.get('PGDATABASE', 'songdrawer')
DB_USER = os.environ.get('PGUSER', 'postgres')
DB_HOST = os.environ.get('PGHOST', 'localhost')
DB_PASS = os.environ.get('PGPASSWORD', '')


def get_db():
    return psycopg2.connect(dbname=DB_NAME, user=DB_USER, host=DB_HOST, password=DB_PASS)


def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS songs (
            id         SERIAL PRIMARY KEY,
            title      VARCHAR(200) NOT NULL,
            lyrics     TEXT,
            chords     TEXT,
            recording  VARCHAR(500),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)
    conn.commit()
    cur.close()
    conn.close()
