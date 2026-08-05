# מגירת שירים 🎵

A web app for storing original songs — write lyrics, add chords, and record yourself playing, all in one place.

## Features

- **Add songs** — title, lyrics, and chord progression
- **Record audio** directly in the browser (no extra software needed)
- **Play back** recordings on the song page
- **Edit & delete** songs
- Persistent storage in PostgreSQL

## Tech Stack

- **Backend:** Python (Flask)
- **Database:** PostgreSQL
- **Frontend:** HTML, CSS, Vanilla JavaScript
- **Audio:** Web Audio API (MediaRecorder)

## How to Run

**Prerequisites:** Python 3, PostgreSQL

1. Clone the repo and install dependencies:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. Create a `.env` file with your database credentials:
   ```
   PGUSER=your_user
   PGPASSWORD=your_password
   PGDATABASE=songdrawer
   ```

3. Create the database:
   ```bash
   createdb songdrawer
   ```

4. Run the app:
   ```bash
   python app.py
   ```

5. Open `http://localhost:5000` in your browser.

## Planned Features

- Automatic chord detection from audio recordings using signal analysis (librosa)
- Manual correction of detected chords
- Song search and filtering
