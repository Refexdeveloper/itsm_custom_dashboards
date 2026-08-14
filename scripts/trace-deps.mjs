import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, '../src');
const exts = ['.jsx', '.js', '.tsx', '.ts', '.css'];

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.') && !spec.startsWith('@/') && !spec.startsWith('@eam/')) return null;
  let base = spec;
  if (spec.startsWith('@/')) base = './' + spec.slice(2);
  if (spec.startsWith('@eam/')) base = './eam/' + spec.slice(6);
  const dir = path.dirname(fromFile);
  let candidate = path.resolve(dir, base);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    for (const ext of exts) {
      const idx = path.join(candidate, 'index' + ext);
      if (fs.existsSync(idx)) return idx;
    }
  }
  if (fs.existsSync(candidate)) return candidate;
  for (const ext of exts) {
    const withExt = candidate + ext;
    if (fs.existsSync(withExt)) return withExt;
  }
  return null;
}

function parseImports(file) {
  const text = fs.readFileSync(file, 'utf8');
  const specs = [];
  const re = /(?:import|export)\s+(?:[\s\S]*?\sfrom\s+)?['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(text))) specs.push(m[1]);
  const sideEffect = /import\s+['"]([^'"]+)['"]/g;
  while ((m = sideEffect.exec(text))) specs.push(m[1]);
  const re2 = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = re2.exec(text))) specs.push(m[1]);
  return [...new Set(specs)];
}

const entries = [
  path.join(srcRoot, 'main.jsx'),
  path.join(srcRoot, 'App.jsx'),
  ...fs.readdirSync(srcRoot).filter((f) => /^IT.*DashboardProject\.jsx$/.test(f)).map((f) => path.join(srcRoot, f)),
];

const queue = [...entries];
const visited = new Set();

while (queue.length) {
  const file = queue.pop();
  if (!file || visited.has(file)) continue;
  visited.add(file);
  if (!fs.existsSync(file)) continue;
  for (const spec of parseImports(file)) {
    const resolved = resolveImport(file, spec);
    if (resolved && resolved.startsWith(srcRoot) && !visited.has(resolved)) queue.push(resolved);
  }
}

const allFiles = walk(srcRoot).filter((f) => /\.(jsx|js|tsx|ts|css)$/.test(f));
const unused = allFiles.filter((f) => !visited.has(f)).sort();

console.log('VISITED', visited.size);
console.log('TOTAL', allFiles.length);
console.log('UNUSED', unused.length);
console.log('---UNUSED---');
unused.forEach((f) => console.log(path.relative(srcRoot, f).replace(/\\/g, '/')));
