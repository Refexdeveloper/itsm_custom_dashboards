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
const outDir = path.resolve(ROOT, 'ceo-finance');

const TARGETS = [
  {
    importPath: './ceo-finance/TravelCeoDashboardProject.jsx',
    name: 'TravelCeoDashboardProject',
    zipName: 'travel-ceo-dashboard.zip',
    folderName: 'travel-ceo-dashboard',
  },
  {
    importPath: './ceo-finance/ExpenseCeoDashboardProject.jsx',
    name: 'ExpenseCeoDashboardProject',
    zipName: 'expense-ceo-dashboard.zip',
    folderName: 'expense-ceo-dashboard',
  },
  {
    importPath: './ceo-finance/SolarCeoDashboardProject.jsx',
    name: 'SolarCeoDashboardProject',
    zipName: 'solar-ceo-dashboard.zip',
    folderName: 'solar-ceo-dashboard',
  },
];

function buildAppSnippet(importPath, componentName) {
  return `import ${componentName} from '${importPath}'

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

function copyDistFolder(folderName) {
  const dest = path.resolve(outDir, folderName);
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(distPath, dest, { recursive: true });
}

async function buildZipFor({ importPath, name, zipName, folderName }) {
  const zipFilePath = path.resolve(outDir, zipName);
  fs.writeFileSync(appPath, buildAppSnippet(importPath, name), 'utf8');
  if (fs.existsSync(distPath)) fs.rmSync(distPath, { recursive: true, force: true });
  console.log(`\n▶ Building ${zipName}`);
  buildProject();
  copyDistFolder(folderName);
  await zipDistFolder(zipFilePath);
  console.log(`✓ ${zipFilePath}`);
  console.log(`✓ ${path.resolve(outDir, folderName)}`);
}

try {
  fs.mkdirSync(outDir, { recursive: true });
  for (const target of TARGETS) {
    await buildZipFor(target);
  }
} finally {
  fs.writeFileSync(appPath, originalApp, 'utf8');
  console.log('\nRestored src/App.jsx');
}
