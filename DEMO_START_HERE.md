# RANANO — Demo setup (macOS)

This is an assembled project snapshot from the folders you uploaded. It does not include secrets or trained checkpoints that were not in the upload.

## 1. API keys
Create `backend/.env` from `backend/.env.example`. The inspected code uses:
- `GROQ_API_KEY` — conversational AI assistant (optional but required for full AI responses).
- `HF_TOKEN` — Hugging Face image generation/enhancement and voice generation in this uploaded snapshot.
- `GEMINI_API_KEY` — optional background-generation feature.

Never put keys in frontend files.

Example (fill in your own values):
```dotenv
GROQ_API_KEY=
HF_TOKEN=
GEMINI_API_KEY=
```

## 2. Install backend dependencies (one-time)
From the project root:
```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
```
On Apple Silicon, PyTorch/TensorFlow installation can be large and may need extra setup. If your existing `ranano-venv` already works, use it instead.

## 3. Start backend (Terminal 1)
```bash
./start-backend.sh
```
Backend: http://127.0.0.1:8001
API docs: http://127.0.0.1:8001/docs

## 4. Start frontend (Terminal 2)
```bash
./start-frontend.sh
```
Frontend Vite URL: http://127.0.0.1:5173

Keep both terminals open.

## 5. Demo checklist
- Test chat with a typed prompt before relying on microphone.
- Test browser microphone permission in Chrome. The voice input in this snapshot uses browser speech recognition, not raw audio streaming to FastAPI.
- Test image generation with one prompt.
- Test enhancement with a small image.
- Test video generation with 2 images and short narration.
- Keep pre-generated images/video as backup.

## Known limitation
The voice input is browser SpeechRecognition (speech-to-text) and sends recognized text to `/api/chat`. It is not a raw-audio upload/transcription pipeline. Browser speech recognition support/network behavior can vary.

## Contents
- `backend/`, `frontend/`, `models/`, `modules/`, `data/`, `tools/`
- `outputs/` and `uploads/` retained from uploaded archives
- Training and test scripts included
- Windows-only `.exe`/`.dll` files and macOS ZIP metadata removed from this Mac-oriented bundle
