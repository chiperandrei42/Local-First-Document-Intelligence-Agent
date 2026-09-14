const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const http = require('http');

let mainWindow = null;
let pythonProcess = null;
let staticServer = null;
const isDev = process.env.NODE_ENV !== 'production';

// MIME types for the production static server
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
};

// Locate the static frontend export directory across dev and packaged distributions
function getStaticFrontendDir() {
  const candidates = [
    path.join(__dirname, '..', 'frontend', 'out'),
    path.join(process.resourcesPath, 'app', 'frontend', 'out'),
    path.join(process.resourcesPath, 'frontend', 'out'),
    path.join(app.getAppPath(), 'frontend', 'out'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }
  return path.join(__dirname, '..', 'frontend', 'out');
}

// Locate backend directory across dev and packaged app distributions
function getBackendDir() {
  if (app.isPackaged) {
    const packagedBackend = path.join(process.resourcesPath, 'backend');
    if (fs.existsSync(packagedBackend)) {
      return packagedBackend;
    }
  }
  return path.join(__dirname, '..', 'backend');
}

// Locate working Python executable on Windows
function findPythonCmd() {
  if (process.platform !== 'win32') return 'python3';

  // Check known reliable Windows paths first
  const explicitCandidates = [
    'C:\\Program Files\\PyManager\\python.exe',
    'C:\\Windows\\py.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Python', 'bin', 'python.exe'),
  ];
  for (const exe of explicitCandidates) {
    if (fs.existsSync(exe)) return exe;
  }

  // Check PATH with 'where' avoiding the dummy WindowsApps redirector
  try {
    const out = execSync('where.exe python', { encoding: 'utf-8' });
    const lines = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (!line.toLowerCase().includes('windowsapps') && fs.existsSync(line)) {
        return line;
      }
    }
  } catch {}

  // Check LocalAppData Python installations
  const localAppData = process.env.LOCALAPPDATA || '';
  if (localAppData) {
    const pyProgDir = path.join(localAppData, 'Programs', 'Python');
    if (fs.existsSync(pyProgDir)) {
      try {
        const subdirs = fs.readdirSync(pyProgDir);
        for (const sub of subdirs) {
          const exe = path.join(pyProgDir, sub, 'python.exe');
          if (fs.existsSync(exe)) return exe;
        }
      } catch {}
    }
  }

  return 'python';
}

// Locate Ollama binary on the host system
function findOllamaExecutable() {
  const localAppData = process.env.LOCALAPPDATA || '';
  const candidates = [
    path.join(localAppData, 'Programs', 'Ollama', 'ollama.exe'),
    path.join(localAppData, 'Programs', 'Ollama', 'ollama app.exe'),
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Ollama', 'ollama.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Ollama', 'ollama.exe'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }

  try {
    const whichCmd = process.platform === 'win32' ? 'where.exe ollama' : 'which ollama';
    const found = execSync(whichCmd, { encoding: 'utf-8' }).trim().split(/\r?\n/)[0];
    if (found && fs.existsSync(found)) return found;
  } catch {}

  return 'ollama';
}

// Native Ollama daemon launcher right from Electron
async function launchOllamaNative() {
  const isUp = await checkPort('http://127.0.0.1:11434/api/tags', 1000);
  if (isUp) {
    return { success: true, message: 'Ollama is already online', running: true };
  }

  const exe = findOllamaExecutable();
  console.log(`[Electron] Auto-launching native Ollama daemon: ${exe}`);
  try {
    const child = spawn(exe, ['serve'], {
      detached: true,
      stdio: 'ignore',
      shell: false,
    });
    child.unref();

    // Poll for up to 5 seconds for daemon readiness
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await checkPort('http://127.0.0.1:11434/api/tags', 500)) {
        console.log('[Electron] Ollama daemon is now online on port 11434.');
        return { success: true, message: 'Ollama daemon launched successfully', running: true };
      }
    }
    return { success: true, message: 'Ollama launch triggered', running: false };
  } catch (err) {
    console.warn('[Electron] Could not launch Ollama binary:', err.message);
    return { success: false, message: `Could not launch Ollama: ${err.message}`, running: false };
  }
}

// Spin up a local loopback server to serve Next.js export with full CSS/JS/font fidelity
function startStaticServer(baseDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const parsedUrl = new URL(req.url, 'http://127.0.0.1');
        let pathname = decodeURIComponent(parsedUrl.pathname);
        if (pathname === '/' || pathname === '') {
          pathname = '/index.html';
        }

        // Prevent path traversal
        const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
        let filePath = path.join(baseDir, safePath);

        // Directory check
        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
          filePath = path.join(filePath, 'index.html');
        } else if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
          filePath = filePath + '.html';
        }

        // Fallback for SPA routing
        if (!fs.existsSync(filePath)) {
          const fallback = path.join(baseDir, 'index.html');
          if (fs.existsSync(fallback)) {
            filePath = fallback;
          } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
          }
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (err, data) => {
          if (err) {
            console.error(`[Static Server] Error reading ${filePath}:`, err.message);
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
            }
            res.end('500 Internal Server Error');
            return;
          }

          res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': data.length,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
          });
          res.end(data);
        });
      } catch (err) {
        console.error('[Static Server] Request handling error:', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
        }
        res.end('500 Internal Server Error');
      }
    });

    // Port 0 lets the OS kernel allocate any available ephemeral loopback port
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const url = `http://127.0.0.1:${port}`;
      console.log(`[Electron] Embedded static frontend server online at ${url} (root: ${baseDir})`);
      resolve({ server, port, url });
    });

    server.on('error', (err) => {
      console.error('[Electron] Static server startup failed:', err);
      reject(err);
    });
  });
}

// Helper to check if an HTTP endpoint is currently reachable
function checkPort(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const req = http.get(
        {
          hostname: parsed.hostname,
          port: parsed.port,
          path: parsed.pathname,
          timeout: timeoutMs,
        },
        (res) => {
          resolve(res.statusCode >= 200 && res.statusCode < 500);
        }
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

// Spawns FastAPI backend if not already active
async function startBackendIfNeeded() {
  const isBackendUp = await checkPort('http://127.0.0.1:8000/api/status', 1000);
  if (isBackendUp) {
    console.log('[Electron] Existing FastAPI backend detected on port 8000.');
    return;
  }

  const backendDir = getBackendDir();
  console.log(`[Electron] Launching local FastAPI backend from directory: ${backendDir}`);

  // Persistent storage directory in userData for user vectors & files
  const userDataPath = app.getPath('userData');
  const chromaDir = app.isPackaged ? path.join(userDataPath, 'chroma_db') : path.join(backendDir, 'chroma_db');
  const dataDir = app.isPackaged ? path.join(userDataPath, 'data') : path.join(__dirname, '..', 'data');
  const exampleDataDir = app.isPackaged ? path.join(process.resourcesPath, 'example-data') : path.join(__dirname, '..', 'example-data');

  // Check if running from packaged app with frozen backend executable
  const packagedExe = path.join(process.resourcesPath, 'backend', process.platform === 'win32' ? 'backend.exe' : 'backend');

  const env = {
    ...process.env,
    PYTHONUNBUFFERED: '1',
    PYTHONPATH: backendDir,
    CHROMA_PERSIST_DIR: chromaDir,
    DATA_DIR: dataDir,
    EXAMPLE_DATA_DIR: exampleDataDir,
    PORT: '8000',
    HOST: '127.0.0.1',
  };

  try {
    if (app.isPackaged && fs.existsSync(packagedExe)) {
      console.log(`[Electron] Starting packaged backend executable: ${packagedExe}`);
      pythonProcess = spawn(packagedExe, [], {
        cwd: path.dirname(packagedExe),
        env,
        stdio: 'pipe',
      });
    } else {
      const pythonCmd = findPythonCmd();
      const mainPy = path.join(backendDir, 'main.py');
      console.log(`[Electron] Starting backend: ${pythonCmd} "${mainPy}"`);
      pythonProcess = spawn(pythonCmd, [mainPy], {
        cwd: backendDir,
        env,
        stdio: 'pipe',
      });
    }

    // Persist backend logs to %APPDATA%/Cetera/backend.log for easy troubleshooting
    try {
      const logPath = path.join(userDataPath, 'backend.log');
      const logStream = fs.createWriteStream(logPath, { flags: 'a' });
      pythonProcess.stdout?.pipe(logStream);
      pythonProcess.stderr?.pipe(logStream);
    } catch {}

    pythonProcess.stdout?.on('data', (data) => {
      console.log(`[FastAPI stdout] ${data.toString().trim()}`);
    });

    pythonProcess.stderr?.on('data', (data) => {
      console.error(`[FastAPI stderr] ${data.toString().trim()}`);
    });

    pythonProcess.on('error', (err) => {
      console.error('[Electron] Failed to start Python backend:', err.message);
    });

    pythonProcess.on('exit', (code, signal) => {
      console.log(`[Electron] Python backend exited with code ${code} signal ${signal}`);
      pythonProcess = null;
    });

    // Wait up to 3 seconds for backend port 8000 to become active
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await checkPort('http://127.0.0.1:8000/api/status', 500)) {
        console.log('[Electron] FastAPI backend confirmed online at http://127.0.0.1:8000');
        break;
      }
    }
  } catch (err) {
    console.error('[Electron] Error spawning Python:', err);
  }
}

// Clean termination of child backend process and static server
function cleanupBackend() {
  if (staticServer) {
    try {
      console.log('[Electron] Stopping local static server...');
      staticServer.close();
    } catch (e) {
      console.error('[Electron] Error stopping static server:', e.message);
    }
    staticServer = null;
  }

  if (pythonProcess && pythonProcess.pid) {
    console.log('[Electron] Terminating background Python server...');
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${pythonProcess.pid} /f /t`);
      } else {
        pythonProcess.kill('SIGTERM');
      }
    } catch (e) {
      console.error('[Electron] Error during process cleanup:', e.message);
    }
    pythonProcess = null;
  }
}

async function createWindow() {
  const iconCandidates = [
    path.join(__dirname, '..', 'frontend', 'public', 'icon.png'),
    path.join(__dirname, '..', 'frontend', 'out', 'icon.png'),
    path.join(__dirname, '..', 'frontend', 'public', 'cetera-icon-transparent.png'),
  ];
  const windowIcon = iconCandidates.find((p) => fs.existsSync(p));

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: '#060607',
    title: 'Cetera — Local-First Document Intelligence',
    icon: windowIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Remove default top menu bar for clean modern aesthetic
  Menu.setApplicationMenu(null);
  mainWindow.setMenuBarVisibility(false);

  // In packaged/production mode, serve static Next.js output over local loopback server
  if (app.isPackaged || process.env.NODE_ENV === 'production') {
    try {
      if (!staticServer) {
        const staticDir = getStaticFrontendDir();
        const { server, url } = await startStaticServer(staticDir);
        staticServer = server;
        mainWindow.loadURL(url);
      } else {
        const port = staticServer.address().port;
        mainWindow.loadURL(`http://127.0.0.1:${port}`);
      }
    } catch (err) {
      console.error('[Electron] Failed to serve static frontend:', err);
    }
  } else {
    const targetUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
    mainWindow.loadURL(targetUrl).catch((err) => {
      console.warn(`[Electron] Could not immediately reach ${targetUrl}. Retrying in 2s...`, err.message);
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(targetUrl);
        }
      }, 2000);
    });
  }

  // Open external links in user default browser rather than inside Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Prevent multiple concurrent desktop instances
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// System specs handler for renderer
ipcMain.handle('get-system-specs', () => {
  const totalRamGb = parseFloat((os.totalmem() / 1024 ** 3).toFixed(1));
  const freeRamGb = parseFloat((os.freemem() / 1024 ** 3).toFixed(1));
  const cpus = os.cpus();
  return {
    total_ram_gb: totalRamGb,
    available_ram_gb: freeRamGb,
    cpu_count: cpus.length,
    cpu_model: cpus[0]?.model || 'Unknown',
    os_platform: process.platform,
    arch: process.arch,
    is_vram_safe: true,
    ram_status: totalRamGb >= 15.0 ? 'optimal' : totalRamGb >= 7.5 ? 'compatible' : 'limited',
  };
});

// IPC handlers for Ollama & backend lifecycle
ipcMain.handle('start-ollama', async () => {
  return await launchOllamaNative();
});

ipcMain.handle('check-ollama', async () => {
  return await checkPort('http://127.0.0.1:11434/api/tags', 1000);
});

ipcMain.handle('check-backend', async () => {
  return await checkPort('http://127.0.0.1:8000/api/status', 1000);
});

ipcMain.handle('open-external', (_event, url) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle('window-close', () => {
  mainWindow?.close();
});

// App Lifecycle
app.whenReady().then(async () => {
  // Proactively check / start Ollama natively in background if installed
  launchOllamaNative().catch((err) => {
    console.log('[Electron] Background Ollama check:', err.message);
  });

  // Start FastAPI backend
  await startBackendIfNeeded();

  // Create UI window
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  cleanupBackend();
});

app.on('window-all-closed', () => {
  cleanupBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
