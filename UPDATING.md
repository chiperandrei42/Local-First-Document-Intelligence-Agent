# Updating & Releasing Cetera Desktop Guide

A complete reference for developers and maintainers on how to update, build, package, and redistribute the **Cetera** desktop application.

---

## 1. How to Build the Installer at Any Time

Whenever you update the code and want a fresh installer, run:

```bash
# Step 1: Compile the Next.js production bundle (outputs static assets into /frontend/out)
npm run build:frontend

# Step 2: Package the Electron desktop app into a single installer
npm run pack
```

The output installer (`Cetera Setup 1.0.0.exe`) and unpackaged test folder (`dist/win-unpacked/Cetera.exe`) will be generated inside the `/dist` directory.

---

## 2. Day-to-Day Development Workflow

When actively modifying or testing changes locally:

### Option A: Full Desktop Development Mode (Recommended)
Run all three processes (Backend + Frontend + Electron) concurrently from the project root:
```bash
npm run dev:desktop
```
- **Backend:** `http://127.0.0.1:8000` (FastAPI with auto-reload)
- **Frontend:** `http://localhost:3000` (Next.js with Turbopack hot reload)
- **Desktop Window:** Native Electron window attached to the live dev server

### Option B: Fast Browser Testing
If you only need to adjust UI layouts, Markdown styling, or chat logic:
```bash
# Terminal 1 (Backend)
cd backend
python main.py

# Terminal 2 (Frontend)
cd frontend
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 3. Key Files to Know When Updating

| Component | Files / Location | Description |
| :--- | :--- | :--- |
| **Desktop Shell** | [electron/main.js](file:///e:/programare/Local-First%20Document%20Intelligence%20Agent/electron/main.js) | Window dimensions, child process manager, hardware IPC, external link handlers |
| **Desktop Bridge** | [electron/preload.js](file:///e:/programare/Local-First%20Document%20Intelligence%20Agent/electron/preload.js) | Context-isolated API exposed to renderer (`window.electronAPI`) |
| **First-Boot Wizard** | [frontend/components/OnboardingModal.tsx](file:///e:/programare/Local-First%20Document%20Intelligence%20Agent/frontend/components/OnboardingModal.tsx) | 5-step hardware checks, Ollama detector, and model download progress |
| **Chat Interface** | [frontend/components/ChatInterface.tsx](file:///e:/programare/Local-First%20Document%20Intelligence%20Agent/frontend/components/ChatInterface.tsx) | Streaming chat, input bar, dynamic greetings, stop generation button |
| **Message & Citations**| [frontend/components/MessageBubble.tsx](file:///e:/programare/Local-First%20Document%20Intelligence%20Agent/frontend/components/MessageBubble.tsx) | Markdown rendering (`react-markdown`) and clickable citation pills |
| **Source Inspector** | [frontend/components/SourceInspectorModal.tsx](file:///e:/programare/Local-First%20Document%20Intelligence%20Agent/frontend/components/SourceInspectorModal.tsx) | Slide-in drawer showing exact retrieved context chunk and match scores |
| **Document Manager** | [frontend/components/DocumentSidebar.tsx](file:///e:/programare/Local-First%20Document%20Intelligence%20Agent/frontend/components/DocumentSidebar.tsx) | Drag-and-drop dropzone, 1-click sample dataset, folder indexer, doc deletion |
| **Quick Notes Modal** | [frontend/components/NewNoteModal.tsx](file:///e:/programare/Local-First%20Document%20Intelligence%20Agent/frontend/components/NewNoteModal.tsx) | Direct text note & meeting minutes ingestion dialog |
| **API Endpoints** | [backend/api/routes.py](file:///e:/programare/Local-First%20Document%20Intelligence%20Agent/backend/api/routes.py) | REST routes (`/status`, `/documents`, `/ingest`, `/system`, `/models/pull`, `/chat`) |
| **RAG Prompts & Logic**| [backend/services/rag_service.py](file:///e:/programare/Local-First%20Document%20Intelligence%20Agent/backend/services/rag_service.py) | System prompt template, context grounding, citation formatting |
| **Document Ingestion** | [backend/services/ingestion_service.py](file:///e:/programare/Local-First%20Document%20Intelligence%20Agent/backend/services/ingestion_service.py) | PyMuPDF/PyPDF parser, text chunking parameters (chunk size & overlap) |
| **Vector Database** | [backend/database/vector_store.py](file:///e:/programare/Local-First%20Document%20Intelligence%20Agent/backend/database/vector_store.py) | Persistent ChromaDB HNSW cosine index (`./backend/chroma_db`) |

---

## 4. How to Release a New Version

When releasing an update (e.g. `1.0.0` -> `1.0.1`):

1. **Bump the Version Number** in the root [package.json](file:///e:/programare/Local-First%20Document%20Intelligence%20Agent/package.json):
   ```json
   {
     "name": "cetera-desktop",
     "version": "1.0.1",
     ...
   }
   ```
   *(Optionally also update `version="1.0.1"` in `backend/main.py` and `frontend/package.json`).*

2. **Run Quality & Verification Checks**:
   ```bash
   # Test Backend
   cd backend
   python -m pytest tests
   cd ..

   # Test Frontend Build
   npm run build:frontend
   ```

3. **Build the New Installer**:
   ```bash
   npm run pack
   ```
   This automatically generates:
   - `dist/Cetera Setup 1.0.1.exe`
   - `dist/Cetera Setup 1.0.1.exe.blockmap`

4. **Distribute to Users**:
   Upload `Cetera Setup 1.0.1.exe` to your distribution channel (GitHub Releases, website, internal drive, etc.).

---

## 5. Adding New Dependencies

### Frontend Dependencies:
```bash
cd frontend
npm install <package-name>
cd ..
```

### Backend Dependencies:
```bash
cd backend
pip install <package-name>
# Keep requirements.txt in sync
cd ..
```
*Always add the new package to [backend/requirements.txt](file:///e:/programare/Local-First%20Document%20Intelligence%20Agent/backend/requirements.txt).*

### Desktop / Build Tools:
```bash
# In project root
npm install <tool-name> -D
```

---

## 6. Standalone Backend (Zero-Python End Users)

If distributing to users who **do not have Python installed on their machines**, you can bundle the Python runtime into a self-contained executable:

```bash
# In project root
cd backend
python -m PyInstaller --noconfirm --onedir --name "backend" --add-data "services;services" --add-data "database;database" --add-data "api;api" main.py
cd ..

# Package installer with frozen backend
npm run pack
```

> **How it works:**
> [electron/main.js](file:///e:/programare/Local-First%20Document%20Intelligence%20Agent/electron/main.js) automatically checks if `resources/backend/backend.exe` exists:
> - If `backend.exe` exists: It runs the compiled binary (no Python needed).
> - If `backend.exe` is absent: It falls back to running `python backend/main.py`.

---

## 7. Troubleshooting & Gotchas

- **Executable Icon on Windows**: Windows requires real `.ico` headers (`00 00 01 00`). The valid multi-resolution icon is located at `frontend/public/icon.ico`. Never rename a `.png` directly to `.ico`.
- **Static Asset Serving & Next.js CSS Loading in Electron**: Next.js App Router static exports generate root-relative asset URLs (`/_next/...`). Loading raw HTML via `file://` causes Chromium to search the filesystem root (`C:/_next/...`), breaking all styling. In production, [electron/main.js](file:///e:/programare/Local-First%20Document%20Intelligence%20Agent/electron/main.js) automatically starts an internal loopback static server on `127.0.0.1` on an ephemeral OS-assigned port, guaranteeing 100% CSS, font, image, and hydration fidelity.
- **Windows File Lock During Packaging**: If `npm run pack` errors with `EBUSY: resource busy or locked`, ensure no previously running instance of `Cetera.exe` is open in the background (check Task Manager or run `taskkill /F /IM Cetera.exe`).
- **Data Persistence Across Updates**: User vector data and uploaded files are stored in `backend/chroma_db` and `data/`. When users install an update over an existing version, the NSIS installer preserves user databases and settings.
