from flask import Flask, render_template, request, redirect, url_for, send_from_directory, abort
import os
import time
import json
from database import get_db, init_db

app = Flask(__name__)
RECORDINGS_DIR = os.path.join(app.static_folder, 'recordings')
COVERS_DIR = os.path.join(app.static_folder, 'covers')
ALLOWED_IMAGE_EXTS = {'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'}


def allowed_image(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTS


@app.route('/')
def index():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, title, created_at, cover_image FROM songs ORDER BY created_at DESC")
    songs = cur.fetchall()
    cur.close()
    conn.close()
    return render_template('index.html', songs=songs)


@app.route('/sw.js')
def service_worker():
    resp = app.send_static_file('sw.js')
    resp.headers['Cache-Control'] = 'no-cache'
    return resp


@app.route('/songs/new')
def new_song():
    return render_template('new_song.html')


@app.route('/songs', methods=['POST'])
def create_song():
    title = request.form.get('title', '').strip()
    sections_raw = request.form.get('sections', '')
    if not title:
        try:
            for sec in json.loads(sections_raw):
                for line in sec.get('lyrics', '').strip().split('\n'):
                    line = line.strip()
                    if line:
                        title = line[:200]
                        break
                if title:
                    break
        except Exception:
            pass
        title = title or 'Untitled'
    sections_json = sections_raw if sections_raw else None
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO songs (title, sections) VALUES (%s, %s) RETURNING id",
        (title, sections_json)
    )
    song_id = cur.fetchone()[0]
    conn.commit()

    cover = request.files.get('cover_image')
    if cover and cover.filename and allowed_image(cover.filename):
        ext = cover.filename.rsplit('.', 1)[1].lower()
        filename = f"{song_id}_{int(time.time())}.{ext}"
        cover.save(os.path.join(COVERS_DIR, filename))
        cur.execute("UPDATE songs SET cover_image=%s WHERE id=%s", (filename, song_id))
        conn.commit()

    cur.close()
    conn.close()
    return redirect(url_for('song', song_id=song_id))


@app.route('/songs/<int:song_id>')
def song(song_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, title, lyrics, chords, recording, created_at, cover_image, sections FROM songs WHERE id = %s",
        (song_id,)
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    if row is None:
        abort(404)
    sections = None
    if row[7]:
        try:
            sections = json.loads(row[7])
        except Exception:
            pass
    s = {'id': row[0], 'title': row[1], 'lyrics': row[2],
         'chords': row[3], 'recording': row[4], 'created_at': row[5],
         'cover_image': row[6], 'sections': sections}
    return render_template('song.html', song=s)


@app.route('/songs/<int:song_id>/edit', methods=['POST'])
def edit_song(song_id):
    title = request.form.get('title', '').strip()
    sections_raw = request.form.get('sections', '')
    if not title:
        try:
            for sec in json.loads(sections_raw):
                for line in sec.get('lyrics', '').strip().split('\n'):
                    line = line.strip()
                    if line:
                        title = line[:200]
                        break
                if title:
                    break
        except Exception:
            pass
        title = title or 'Untitled'
    sections_json = sections_raw if sections_raw else None
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE songs SET title=%s, lyrics=NULL, chords=NULL, sections=%s, updated_at=NOW() WHERE id=%s",
        (title, sections_json, song_id)
    )

    cover = request.files.get('cover_image')
    if cover and cover.filename and allowed_image(cover.filename):
        cur.execute("SELECT cover_image FROM songs WHERE id=%s", (song_id,))
        old_row = cur.fetchone()
        if old_row and old_row[0]:
            old_path = os.path.join(COVERS_DIR, old_row[0])
            if os.path.exists(old_path):
                os.remove(old_path)
        ext = cover.filename.rsplit('.', 1)[1].lower()
        filename = f"{song_id}_{int(time.time())}.{ext}"
        cover.save(os.path.join(COVERS_DIR, filename))
        cur.execute("UPDATE songs SET cover_image=%s WHERE id=%s", (filename, song_id))

    conn.commit()
    cur.close()
    conn.close()
    return redirect(url_for('song', song_id=song_id))


@app.route('/songs/<int:song_id>/delete', methods=['POST'])
def delete_song(song_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT recording, cover_image FROM songs WHERE id=%s", (song_id,))
    row = cur.fetchone()
    if row:
        if row[0]:
            p = os.path.join(RECORDINGS_DIR, row[0])
            if os.path.exists(p):
                os.remove(p)
        if row[1]:
            p = os.path.join(COVERS_DIR, row[1])
            if os.path.exists(p):
                os.remove(p)
    cur.execute("DELETE FROM songs WHERE id=%s", (song_id,))
    conn.commit()
    cur.close()
    conn.close()
    return redirect(url_for('index'))


@app.route('/songs/bulk-delete', methods=['POST'])
def bulk_delete():
    ids = request.form.getlist('song_ids')
    if not ids:
        return redirect(url_for('index'))
    conn = get_db()
    cur = conn.cursor()
    for song_id in ids:
        cur.execute("SELECT recording, cover_image FROM songs WHERE id=%s", (song_id,))
        row = cur.fetchone()
        if row:
            if row[0]:
                p = os.path.join(RECORDINGS_DIR, row[0])
                if os.path.exists(p):
                    os.remove(p)
            if row[1]:
                p = os.path.join(COVERS_DIR, row[1])
                if os.path.exists(p):
                    os.remove(p)
        cur.execute("DELETE FROM songs WHERE id=%s", (song_id,))
    conn.commit()
    cur.close()
    conn.close()
    return redirect(url_for('index'))


@app.route('/songs/<int:song_id>/recording', methods=['POST'])
def upload_recording(song_id):
    audio = request.files.get('audio')
    if not audio:
        return 'no audio', 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT recording FROM songs WHERE id=%s", (song_id,))
    row = cur.fetchone()
    if row and row[0]:
        old = os.path.join(RECORDINGS_DIR, row[0])
        if os.path.exists(old):
            os.remove(old)
    orig_name = audio.filename or 'recording.webm'
    ext = orig_name.rsplit('.', 1)[1].lower() if '.' in orig_name else 'webm'
    if ext not in ('webm', 'mp4', 'ogg', 'm4a'):
        ext = 'webm'
    filename = f"{song_id}_{int(time.time())}.{ext}"
    audio.save(os.path.join(RECORDINGS_DIR, filename))
    cur.execute("UPDATE songs SET recording=%s, updated_at=NOW() WHERE id=%s", (filename, song_id))
    conn.commit()
    cur.close()
    conn.close()
    return filename, 200


@app.route('/recordings/<path:filename>')
def serve_recording(filename):
    return send_from_directory(RECORDINGS_DIR, filename)


@app.route('/covers/<path:filename>')
def serve_cover(filename):
    return send_from_directory(COVERS_DIR, filename)


# Run on startup (whether via gunicorn or python app.py)
os.makedirs(RECORDINGS_DIR, exist_ok=True)
os.makedirs(COVERS_DIR, exist_ok=True)
init_db()

if __name__ == '__main__':
    app.run(debug=True, port=5001)
