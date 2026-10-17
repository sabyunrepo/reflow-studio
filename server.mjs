import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const here = fileURLToPath(new URL('.', import.meta.url));
const samplePath = join(here, 'assets', 'sample-real-banner.ai');
const port = Number(process.env.PORT || 4173);
const maxBytes = 15 * 1024 * 1024;

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

async function convertAi(inputPath) {
  const dir = await mkdtemp(join(tmpdir(), 'design-reflow-'));
  try {
    const output = join(dir, 'converted.svg');
    await execFileAsync('pdftocairo', ['-svg', '-f', '1', '-l', '1', inputPath, output], { timeout: 20000, maxBuffer: 1024 * 1024 });
    return await readFile(output, 'utf8');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET' && url.pathname === '/runtime-config.mjs') {
      return send(res, 200, 'export const aiConvertEndpoint = "./api/convert";\n', 'text/javascript; charset=utf-8');
    }
    if (req.method === 'POST' && url.pathname === '/api/convert') {
      const length = Number(req.headers['content-length'] || 0);
      if (length > maxBytes) return send(res, 413, JSON.stringify({ error: '파일은 15MB 이하만 사용할 수 있습니다.' }), 'application/json; charset=utf-8');
      const filename = decodeURIComponent(String(req.headers['x-file-name'] || ''));
      if (extname(filename).toLowerCase() !== '.ai') return send(res, 415, JSON.stringify({ error: '.ai 파일만 지원합니다.' }), 'application/json; charset=utf-8');
      const chunks = []; let received = 0;
      for await (const chunk of req) {
        received += chunk.length;
        if (received > maxBytes) { send(res, 413, JSON.stringify({ error: '파일은 15MB 이하만 사용할 수 있습니다.' }), 'application/json; charset=utf-8'); req.destroy(); return; }
        chunks.push(chunk);
      }
      if (!received) return send(res, 400, JSON.stringify({ error: 'AI 파일을 선택해 주세요.' }), 'application/json; charset=utf-8');
      const dir = await mkdtemp(join(tmpdir(), 'design-reflow-upload-'));
      try {
        const inputPath = join(dir, 'input.ai');
        await writeFile(inputPath, Buffer.concat(chunks));
        const svg = await convertAi(inputPath);
        return send(res, 200, svg, 'image/svg+xml; charset=utf-8');
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    }
    if (req.method === 'GET' && url.pathname === '/api/sample') {
      const svg = await convertAi(samplePath);
      return send(res, 200, svg, 'image/svg+xml; charset=utf-8');
    }

    const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    const safePath = normalize(join(here, relative));
    if (!safePath.startsWith(here) || relative.includes('..')) return send(res, 403, 'Forbidden');
    let data;
    try { data = await readFile(safePath); }
    catch { return send(res, 404, 'Not found'); }
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.ai': 'application/postscript' };
    send(res, 200, data, types[extname(safePath)] || 'application/octet-stream');
  } catch (error) {
    const detail = String(error?.stderr || error?.message || '변환에 실패했습니다.');
    const hint = 'PDF 호환 정보가 포함된 AI 파일인지 확인해 주세요. Illustrator에서 저장할 때 “PDF 호환 파일 만들기”를 켜야 합니다.';
    send(res, 422, JSON.stringify({ error: `${hint}\n\n${detail.slice(0, 400)}` }), 'application/json; charset=utf-8');
  }
});

server.listen(port, '127.0.0.1', () => console.log(`Design Reflow MVP: http://localhost:${port}`));
