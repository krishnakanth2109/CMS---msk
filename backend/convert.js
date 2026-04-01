import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = ['ai.js', 'documents.js', 'email.js', 'report.js'];
files.forEach(f => {
  const filePath = path.join(__dirname, 'services', f);
  if (!fs.existsSync(filePath)) return;
  let c = fs.readFileSync(filePath, 'utf-8');
  c = c.replace(/const\s+([a-zA-Z0-9_]+)\s*=\s*require\(['"]([^'"]+)['"]\);/g, 'import $1 from \'$2\';');
  c = c.replace(/const\s+\{([^}]+)\}\s*=\s*require\(['"]([^'"]+)['"]\);/g, 'import { $1 } from \'$2\';');
  c = c.replace(/module\.exports\s*=\s*\{([\s\S]+?)\};/g, 'export { $1 };');
  fs.writeFileSync(filePath, c);
  console.log('Processed', f);
});
