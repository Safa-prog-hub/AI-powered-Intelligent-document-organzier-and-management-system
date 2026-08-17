# AI-Powered Intelligent Document Organizer & Management System

A multi-tiered, microservices-driven document intelligence platform that automates the entire
lifecycle of document handling: secure ingestion → OpenCV preprocessing → Tesseract OCR →
entity extraction → semantic grouping → an interactive dashboard with expiry alerts.

This repository is a complete, working implementation of the 8-phase development blueprint:

| Phase | Layer | Stack | Key deliverables |
|-------|-------|-------|------------------|
| 1 | Database | MongoDB + Mongoose | `backend/src/db/db.js`, `models/User.js`, `models/Document.js` |
| 2 | API gateway | Node.js + Express | JWT auth, Multer ingestion, AI dispatch, error pipeline |
| 3 | CV preprocessing | Python + FastAPI + OpenCV | Blur detection, 2× upscale, adaptive binarization |
| 4 | OCR engine | Tesseract LSTM (`--oem 1 --psm 6`, `eng+hin`) | Async, non-blocking extraction |
| 5 | Entity extraction | ftfy + regex + correction dictionaries | PAN / Aadhaar / dates / names |
| 6 | Semantic grouping | sentence-transformers (`all-MiniLM-L6-v2`) | Embeddings, cosine similarity, clustering, filenames |
| 7 | Frontend | React + Tailwind (Vite) | UploadZone, DocumentGrid, SmartSearch, ExpiryAlerts |
| 8 | Deployment | Docker + docker-compose | 4 services, isolated bridge network, named volumes |

---

## Architecture

```
                        ┌────────────────────────────────────────────────┐
  Browser / Mobile ────►│  frontend  (React + nginx :80 / Vite :5173)    │
                        │        │  /api  (same-origin proxy)            │
                        ▼        ▼                                       │
                        ┌────────────────────────────────────────────┐   │
                        │  node-api  (Express gateway :5000)          │   │
                        │  JWT auth · multer · orchestration          │   │
                        └───────┬────────────────────┬────────────────┘   │
                                │                    │                    │
                    MongoDB     │                    │ multipart POST     │
                ┌───────────────▼──┐          ┌──────▼──────────────────┐  │
                │ mongo-db (:27017)│          │ python-ai (FastAPI :8000)│ │
                │ schemas+indexes  │          │ OpenCV → Tesseract →     │ │
                └──────────────────┘          │ NLP → embeddings         │ │
                                              └──────────────────────────┘ │
                        All services on the isolated `doc-net` bridge.     │
                        python-ai is never exposed to the public internet. │
                        └──────────────────────────────────────────────────┘
```

**Data flow of a single upload**

1. `POST /api/documents/upload` — JWT middleware → Multer (MIME allow-list
   `image/jpeg | image/png | application/pdf`, 15 MB cap) → temp disk cache.
2. The gateway forwards the file to `python-ai` via `multipart/form-data`
   (`http://python-ai:8000/process-document`), along with existing document
   embeddings for semantic cluster-joining.
3. Python: decode → Laplacian-variance blur check (rejects `< 50.0`) →
   bicubic 2× upscale → 3×3 Gaussian blur → adaptive Gaussian binarization
   → Tesseract LSTM (`--oem 1 --psm 6`, `lang=eng+hin`, via `asyncio.to_thread`).
4. `extractor.py` repairs encodings (ftfy), classifies (PAN/Aadhaar), and
   extracts entities with OCR-error-correction dictionaries + strict regex.
5. `semantic.py` embeds the cleaned text, computes cosine similarity against
   existing vectors, joins/creates a cluster tag, and synthesizes a
   standardized filename (`Aadhaar_Card_Rahul_Sharma_2026-08-17.jpg`).
6. The gateway persists everything into the `Document` schema (compound +
   text indexes) and returns the enriched document to the React dashboard.

---

## Quick start (Docker — production topology)

```bash
docker compose up --build -d
```

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:3000 |
| API gateway | http://localhost:5000 (`/health`) |
| MongoDB | `mongodb://localhost:27017` (internal only) |
| Python AI | internal only (`http://python-ai:8000` inside `doc-net`) |

Register an account from the login screen, then upload a sharp photo/scan of a
document (Aadhaar, PAN, passport, invoice, policy…) and watch the pipeline run.

> **Important**: OCR quality depends on input sharpness. The service rejects
> blurry documents with `400 Document is too blurry for processing
> (Laplacian variance X.XX < 50.0)` — re-capture with steady lighting.

---

## Local development (no Docker)

### 0. Prerequisites

- Node.js ≥ 18, MongoDB (local `mongod` or `docker run -d -p 27017:27017 mongo:7`)
- Python 3.10+ and the Tesseract binary + `eng`/`hin` traineddata
  (`sudo apt-get install -y tesseract-ocr tesseract-ocr-eng tesseract-ocr-hin poppler-utils`)

### 1. Python AI microservice

```bash
cd ai-service
python3 -m venv .venv && .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Node.js API gateway

```bash
cd backend
npm install
cp .env.example .env          # defaults target localhost services
npm run dev                   # http://localhost:5000
```

### 3. React dashboard

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173 (proxies /api → :5000)
```

### 4. Tests

```bash
# Python (AI service) — 36 tests: extraction, CV pipeline, semantic math
cd ai-service && .venv/bin/python -m pytest app/tests -v

# Node (gateway) — auth middleware, multer filter, error mapping
cd backend && npm test

# Frontend — production build sanity check
cd frontend && npm run build
```

### Demo mode (no MongoDB / no Python)

```bash
node tools/mock-api.mjs       # DEMO stub of the gateway on :5000
cd frontend && npm run dev    # full UI flow with seeded sample documents
```

Log in with `demo@example.com` (any password) or register a new account.

---

## API reference

All endpoints except `/health` and `/api/auth/*` require
`Authorization: Bearer <token>`.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Create account → `{ token, user }` |
| `POST` | `/api/auth/login` | Login → `{ token, user }` |
| `GET` | `/api/auth/me` | Resolve token to user profile |
| `POST` | `/api/documents/upload` | Multipart `file` → AI pipeline → saved document |
| `GET` | `/api/documents` | List (supports `?search=&category=&limit=&skip=`) |
| `GET` | `/api/documents/expiring` | Documents expiring within 30 days |
| `GET` | `/api/documents/:id` | Single document |
| `DELETE` | `/api/documents/:id` | Delete record + stored artifact |

**AI service** — `POST /process-document` (internal) accepts
`image/jpeg | image/png | application/pdf` and an optional
`existing_embeddings` JSON form field, returning:

```json
{
  "originalFilename": "IMG_9912.jpg",
  "mimeType": "image/jpeg",
  "fileSize": 482134,
  "extractedText": "UIDAI\nGovernment of India\n...",
  "cleanedTextArray": ["UIDAI", "Government of India", "..."],
  "documentType": "Aadhaar",
  "metadata": {
    "documentCategory": "ID Proof",
    "idNumber": "2345 6789 0123",
    "name": "Priya Patel",
    "issueDate": "2018-04-12",
    "expiryDate": null,
    "autoGeneratedFilename": "Aadhaar_Priya_Patel_2026-08-17.jpg"
  },
  "tags": ["Aadhaar"],
  "embedding": [0.021, -0.043, "..."],
  "clusterTag": "Aadhaar",
  "similarityScore": 0.9134
}
```

---

## Repository layout

```
├── docker-compose.yml          # Phase 8: 4 services, bridge net, volumes
├── backend/                    # Phases 1–2: Express gateway + Mongoose
│   ├── Dockerfile              # node:18-alpine
│   ├── src/
│   │   ├── db/db.js            # backoff retry + connection listeners
│   │   ├── models/             # User.js, Document.js (compound + text indexes)
│   │   ├── middleware/         # auth.js, multerConfig.js, errorHandler.js
│   │   ├── controllers/        # authController.js, documentController.js
│   │   ├── routes/             # authRoutes.js, documentRoutes.js
│   │   └── services/aiService.js  # multipart dispatch to python-ai
│   └── tests/                  # node:test suite
├── ai-service/                 # Phases 3–6: FastAPI intelligence engine
│   ├── Dockerfile              # python:3.10-slim + tesseract/opencv system libs
│   ├── app/
│   │   ├── main.py             # POST /process-document orchestration
│   │   ├── preprocessing.py    # blur detection + adaptive binarization
│   │   ├── ocr.py              # pytesseract LSTM (eng+hin, async)
│   │   ├── extractor.py        # ftfy + regex + OCR correction dicts
│   │   ├── semantic.py         # embeddings, cosine sim, clustering, filenames
│   │   └── tests/              # 36 pytest cases
│   └── requirements.txt
├── frontend/                   # Phase 7: React + Tailwind dashboard
│   ├── Dockerfile              # multi-stage: node build → nginx:alpine
│   ├── nginx.conf              # SPA + /api reverse proxy
│   └── src/
│       ├── api/client.js       # axios instance w/ JWT interceptor
│       ├── context/DocumentContext.jsx
│       ├── hooks/useDebounce.js
│       └── components/         # UploadZone, DocumentGrid, SmartSearch, ExpiryAlerts, …
└── tools/mock-api.mjs          # DEMO-ONLY gateway stub (not in compose)
```

---

## Design notes & production considerations

- **Stateless gateway, scalable workers.** JWTs carry identity; any
  `node-api` replica can serve any request. MongoDB text-search + compound
  indexes keep read paths at O(log n).
- **Event-loop safety.** File streaming (Multer disk storage, Axios streams)
  and `asyncio.to_thread` for Tesseract keep both runtimes responsive under
  concurrent uploads.
- **Graceful degradation.** If the embedding model is unavailable, the AI
  service falls back to deterministic hashing embeddings (logged); semantic
  clustering is best-effort and never blocks ingestion.
- **Security posture.** MIME allow-list + 15 MB cap; randomized storage
  filenames; passwords bcrypt-hashed and excluded from projections; the
  Python service is unreachable from outside the Docker bridge network.
- **Going further.** Swap regex extraction for vision-LLM extraction by
  replacing `extractor.py` internals — the endpoint contract stays identical;
  add S3/MinIO for object storage by pointing `UPLOAD_DIR`/`storagePath` at a
  bucket; wire the notification preferences into an email/SMS worker.

## License

MIT — provided as a reference implementation of the published blueprint.
