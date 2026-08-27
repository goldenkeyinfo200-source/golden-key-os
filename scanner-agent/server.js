import express from 'express';
import cors from 'cors';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 17831);
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS ||
    'https://crm-production-eced.up.railway.app,http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
);

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin рухсат этилмаган: ${origin}`));
    },
  })
);

app.use(express.json({ limit: '64kb' }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    name: 'Golden Key Scanner Agent',
    platform: process.platform,
  });
});

app.get('/scanners', async (_req, res) => {
  if (process.platform !== 'win32') {
    return res.status(501).json({ error: 'Scanner Agent фақат Windows учун тайёрланган.' });
  }

  try {
    const script = path.join(__dirname, 'scripts', 'list-scanners.ps1');
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script],
      { windowsHide: true, timeout: 20000 }
    );

    const items = JSON.parse(stdout || '[]');
    return res.json({ items: Array.isArray(items) ? items : [items] });
  } catch (error) {
    return res.status(500).json({
      error: 'Сканерлар рўйхатини олиб бўлмади.',
      details: error.stderr || error.message,
    });
  }
});

app.post('/scan', async (req, res) => {
  if (process.platform !== 'win32') {
    return res.status(501).json({ error: 'Scanner Agent фақат Windows учун тайёрланган.' });
  }

  const dpi = Math.max(100, Math.min(600, Number(req.body?.dpi || 300)));
  const colorMode = ['color', 'grayscale'].includes(req.body?.colorMode)
    ? req.body.colorMode
    : 'color';

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'golden-key-scan-'));
  const outputPath = path.join(tempDir, 'scan.jpg');

  try {
    const script = path.join(__dirname, 'scripts', 'scan.ps1');

    await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile',
        '-STA',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        script,
        '-OutputPath',
        outputPath,
        '-Dpi',
        String(dpi),
        '-ColorMode',
        colorMode,
      ],
      {
        windowsHide: false,
        timeout: 180000,
        maxBuffer: 1024 * 1024,
      }
    );

    const file = await readFile(outputPath);

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', 'inline; filename="scan.jpg"');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(file);
  } catch (error) {
    return res.status(500).json({
      error: 'Сканерлаш амалга ошмади ёки фойдаланувчи бекор қилди.',
      details: error.stderr || error.message,
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Golden Key Scanner Agent: http://127.0.0.1:${PORT}`);
  console.log(`Allowed origins: ${[...ALLOWED_ORIGINS].join(', ')}`);
});
