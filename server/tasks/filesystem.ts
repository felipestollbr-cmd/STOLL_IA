import fs from 'fs';
import path from 'path';
import os from 'os';

export function listFiles(dirPath?: string): string {
  const target = dirPath || os.homedir();
  if (!fs.existsSync(target)) return `❌ Não encontrado: ${target}`;
  const files = fs.readdirSync(target)
    .filter(f => !f.startsWith('.'))
    .map(f => {
      const full = path.join(target, f);
      try {
        const s = fs.statSync(full);
        return `${s.isDirectory() ? '📁' : '📄'} ${f}`;
      } catch { return `❓ ${f}`; }
    });
  return files.length ? `📂 ${target}\n${files.join('\n')}\n📊 ${files.length} itens` : `📂 ${target}\n(pasta vazia)`;
}

export function organizeFiles(dirPath?: string): string {
  const target = dirPath || path.join(os.homedir(), 'Desktop');
  if (!fs.existsSync(target)) return `❌ Não encontrado: ${target}`;
  const categories: Record<string, string[]> = {
    '📷 Imagens': ['.jpg', '.jpeg', '.png', '.gif'],
    '📄 Documentos': ['.pdf', '.docx', '.txt'],
    '💻 Código': ['.js', '.py', '.html'],
    '📁 Outros': [],
  };
  Object.keys(categories).forEach(c => {
    const p = path.join(target, c);
    if (!fs.existsSync(p)) fs.mkdirSync(p);
  });
  let count = 0;
  fs.readdirSync(target).forEach(f => {
    const fp = path.join(target, f);
    if (fs.statSync(fp).isDirectory() || f.startsWith('.')) return;
    const ext = path.extname(f).toLowerCase();
    for (const [cat, exts] of Object.entries(categories)) {
      if (exts.includes(ext)) {
        fs.renameSync(fp, path.join(target, cat, f));
        count++;
        return;
      }
    }
    fs.renameSync(fp, path.join(target, '📁 Outros', f));
    count++;
  });
  return `📁 ${target}\n📊 ${count} arquivos organizados`;
}

export function createFile(name: string, content?: string, dirPath?: string): string {
  const p = path.join(dirPath || os.homedir(), name || 'arquivo.txt');
  fs.writeFileSync(p, content || 'Criado pelo STOLL.');
  return `✅ Arquivo criado: ${p}`;
}

export function getSystemInfo(): string {
  const cpus = os.cpus();
  return [
    `🖥️ SO: ${os.type()} ${os.release()}`,
    `💻 Hostname: ${os.hostname()}`,
    `👤 Usuário: ${os.userInfo().username}`,
    `🧠 CPU: ${cpus[0]?.model || 'N/A'}`,
    `🔢 Núcleos: ${cpus.length}`,
    `💾 RAM Total: ${(os.totalmem() / 1024 ** 3).toFixed(2)} GB`,
    `💾 RAM Livre: ${(os.freemem() / 1024 ** 3).toFixed(2)} GB`,
  ].join('\n');
}