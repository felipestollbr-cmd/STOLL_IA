import { spawn } from 'child_process';
import path from 'path';

interface DesktopClickParams {
  x: number;
  y: number;
}

interface DesktopTypeParams {
  text: string;
}

export async function desktopClick(params: DesktopClickParams): Promise<string> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '..', '..', 'tools', 'desktop.py');
    const python = spawn('python3', [scriptPath, 'click', String(params.x), String(params.y)]);
    let stdout = '', stderr = '';
    python.stdout.on('data', d => stdout += d);
    python.stderr.on('data', d => stderr += d);
    python.on('close', code => {
      if (code !== 0) reject(new Error(stderr || 'Erro no script Python'));
      else resolve(stdout.trim() || '✅ Clique executado');
    });
  });
}

export async function desktopType(params: DesktopTypeParams): Promise<string> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '..', '..', 'tools', 'desktop.py');
    const python = spawn('python3', [scriptPath, 'type', params.text]);
    let stdout = '', stderr = '';
    python.stdout.on('data', d => stdout += d);
    python.stderr.on('data', d => stderr += d);
    python.on('close', code => {
      if (code !== 0) reject(new Error(stderr || 'Erro no script Python'));
      else resolve(stdout.trim() || '✅ Texto digitado');
    });
  });
}

export async function desktopScreenshot(): Promise<{ output: string; imagePath?: string }> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, '..', '..', 'tools', 'desktop.py');
    const python = spawn('python3', [scriptPath, 'screenshot']);
    let stdout = '', stderr = '';
    python.stdout.on('data', d => stdout += d);
    python.stderr.on('data', d => stderr += d);
    python.on('close', code => {
      if (code !== 0) reject(new Error(stderr || 'Erro no script Python'));
      else {
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(parsed);
        } catch {
          resolve({ output: stdout.trim() || '✅ Screenshot salvo' });
        }
      }
    });
  });
}