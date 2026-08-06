import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()


def get_db():
    # Render (and Railway) provide DATABASE_URL; fall back to individual vars for local dev
    url = os.environ.get('DATABASE_URL')
    if url:
        # psycopg2 requires postgresql://, Render gives postgres://
        url = url.replace('postgres://', 'postgresql://', 1)
        return psycopg2.connect(url)
    return psycopg2.connect(
        dbname=os.environ.get('PGDATABASE', 'songdrawer'),
        user=os.environ.get('PGUSER', 'postgres'),
        host=os.environ.get('PGHOST', 'localhost'),
        password=os.environ.get('PGPASSWORD', ''),
    )


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
            cover_image VARCHAR(500),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)
    cur.execute("""
        ALTER TABLE songs ADD COLUMN IF NOT EXISTS cover_image VARCHAR(500)
    """)
    cur.execute("""
        ALTER TABLE songs ADD COLUMN IF NOT EXISTS sections TEXT
    """)
    conn.commit()
    cur.close()
    conn.close()
