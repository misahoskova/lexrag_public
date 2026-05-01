import fs from 'fs';
import path from 'path';

export function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export function readText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

export function readJson<T = unknown>(filePath: string): T {
  const raw = readText(filePath).replace(/^\uFEFF/, '');
  return JSON.parse(raw) as T;
}

export function writeJson(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export function findInputs(dir: string): { json?: string; html?: string } {
  const files = fs.readdirSync(dir);
  const json = files.find(f => /^Sb_\d{4}_\d+_\d{4}-\d{2}-\d{2}_IZ\.json$/i.test(f));
  const html = files.find(f => /^zakonyprolidi_cs_\d{4}_\d+_v\d+\.html$/i.test(f));
  return {
    json: json ? path.join(dir, json) : undefined,
    html: html ? path.join(dir, html) : undefined,
  };
}

export function parseCisloRok(dir: string, jsonPath?: string): { cislo?: number; rok?: number } {
  const base = path.basename(dir);
  const m = base.match(/^(\d+)_(\d{4})$/);
  if (m) return { cislo: Number(m[1]), rok: Number(m[2]) };
  if (jsonPath) {
    const b = path.basename(jsonPath);
    const mm = b.match(/^Sb_(\d{4})_(\d+)_\d{4}-\d{2}-\d{2}_IZ\.json$/i);
    if (mm) return { rok: Number(mm[1]), cislo: Number(mm[2]) };
  }
  return {};
}

export function writeMarker(dir: string, name: string, payload: any) {
  const file = path.join(dir, name);
  writeJson(file, payload);
}

export function listLawDirs(rawRoot: string, skip: string[]): string[] {
  const all = fs.readdirSync(rawRoot, { withFileTypes: true });
  return all
    .filter(d => d.isDirectory())
    .map(d => path.join(rawRoot, d.name))
    .filter(p => {
      const base = path.basename(p);
      if (base.startsWith('_')) return false;
      if (skip.includes(base)) return false;
      return true;
    });
}

export function moveCrossDeviceSafe(src: string, dst: string) {
  ensureDir(path.dirname(dst));
  try {
    fs.renameSync(src, dst);
  } catch (err: any) {
    if (err?.code === 'EXDEV') {
      fs.copyFileSync(src, dst);
      fs.unlinkSync(src);
    } else {
      throw err;
    }
  }
}
