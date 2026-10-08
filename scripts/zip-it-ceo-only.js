import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const distPath = path.resolve(ROOT, 'dist');
const appPath = path.resolve(ROOT, 'src/App.jsx');
const originalApp = fs.readFileSync(appPath, 'utf8');
const name = 'ITCEODashboardProject';

function buildAppSnippet(componentName) {
  return `import ${componentName} from './${componentName}.jsx'

function App() {
  return (
    <div className="rootDiv">
      <${componentName} />
    </div>
  )
}

export default App
`;
}

function buildProject() {
  execSync('npx vite build', {
    stdio: 'inherit',
    cwd: ROOT,
    env: {
      ...process.env,
      ZIP_BUILD: '1',
      KF_MANIFEST_CATEGORY: 'Component',
    },
  });
}

async function zipDistFolder(zipFilePath) {
  if (fs.existsSync(zipFilePath)) fs.unlinkSync(zipFilePath);
  const output = fs.createWriteStream(zipFilePath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);
  archive.glob('**/*', {
    cwd: distPath,
    ignore: ['**/*.map'],
  });
  await archive.finalize();
  await new Promise((resolve, reject) => {
    output.on('close', resolve);
    output.on('error', reject);
  });
}

try {
  fs.writeFileSync(appPath, buildAppSnippet(name), 'utf8');
  if (fs.existsSync(distPath)) fs.rmSync(distPath, { recursive: true, force: true });
  console.log(`\n▶ Building ${name}.zip`);
  buildProject();
  await zipDistFolder(path.resolve(ROOT, `${name}.zip`));
  console.log(`✓ ${name}.zip`);
} finally {
  fs.writeFileSync(appPath, originalApp, 'utf8');
  console.log('\nRestored src/App.jsx');
}
