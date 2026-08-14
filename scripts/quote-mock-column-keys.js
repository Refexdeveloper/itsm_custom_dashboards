import fs from 'node:fs';

const files = [
  'src/mocks/itServiceRequests.js',
  'src/mocks/itAdminTasks.js',
  'src/mocks/itManagerTasks.js',
];

for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace(/^(\s+)(?!['"])(Column_[^:\n]+)(:)/gm, "$1'$2'$3");
  fs.writeFileSync(file, text);
  console.log(`quoted keys in ${file}`);
}
