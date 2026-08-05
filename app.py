from flask import Flask, render_template, request, redirect, url_for, send_from_directory, abort
import os
import time
from database import get_db, init_db

app = Flask(__name__)
RECORDINGS_DIR = os.path.join(app.static_folder, 'recordings')


@app.route('/')
def index():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, title, created_at FROM songs ORDER BY created_at DESC")
    songs = cur.fetchall()
    cur.close()
    conn.close()
    return render_template('index.html', songs=songs)


@app.route('/songs/new')
def new_song():
    return render_template('new_song.html')


@app.route('/songs', methods=['POST'])
def create_song():
    title = request.form.get('title', '').strip()
    lyrics = request.form.get('lyrics', '').strip()
    chords = request.form.get('chords', '').strip()
    if not title:
        return redirect(url_for('new_song'))
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO songs (title, lyrics, chords) VALUES (%s, %s, %s) RETURNING id",
        (title, lyrics, chords)
    )
    song_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return redirect(url_for('song', song_id=song_id))


@app.route('/songs/<int:song_id>')
def song(song_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, title, lyrics, chords, recording, created_at FROM songs WHERE id = %s",
        (song_id,)
    )
    row = cur.fetchone()
    cur.close()
    conn.close()
    if row is None:
        abort(404)
    s = {'id': row[0], 'title': row[1], 'lyrics': row[2],
         'chords': row[3], 'recording': row[4], 'created_at': row[5]}
    return render_template('song.html', song=s)


@app.route('/songs/<int:song_id>/edit', methods=['POST'])
def edit_song(song_id):
    title = request.form.get('title', '').strip()
    lyrics = request.form.get('lyrics', '').strip()
    chords = request.form.get('chords', '').strip()
    if not title:
        return redirect(url_for('song', song_id=song_id))
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE songs SET title=%s, lyrics=%s, chords=%s, updated_at=NOW() WHERE id=%s",
        (title, lyrics, chords, song_id)
    )
    conn.commit()
    cur.close()
    conn.close()
    return redirect(url_for('song', song_id=song_id))


@app.route('/songs/<int:song_id>/delete', methods=['POST'])
def delete_song(song_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT recording FROM songs WHERE id=%s", (song_id,))
    row = cur.fetchone()
    if row and row[0]:
        filepath = os.path.join(RECORDINGS_DIR, row[0])
        if os.path.exists(filepath):
            os.remove(filepath)
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
        cur.execute("SELECT recording FROM songs WHERE id=%s", (song_id,))
        row = cur.fetchone()
        if row and row[0]:
            filepath = os.path.join(RECORDINGS_DIR, row[0])
            if os.path.exists(filepath):
                os.remove(filepath)
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
    filename = f"{song_id}_{int(time.time())}.webm"
    audio.save(os.path.join(RECORDINGS_DIR, filename))
    cur.execute("UPDATE songs SET recording=%s, updated_at=NOW() WHERE id=%s", (filename, song_id))
    conn.commit()
    cur.close()
    conn.close()
    return filename, 200


@app.route('/recordings/<path:filename>')
def serve_recording(filename):
    return send_from_directory(RECORDINGS_DIR, filename)


if __name__ == '__main__':
    os.makedirs(RECORDINGS_DIR, exist_ok=True)
    init_db()
    app.run(debug=True)
