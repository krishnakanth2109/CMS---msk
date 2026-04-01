import fs from 'fs';
import path from 'path';

let content = fs.readFileSync('../../ai_mock/src/server.js', 'utf8');

// replace requires for core libraries
content = content.replace(/const ([a-zA-Z0-9_]+) = require\(["'](crypto|fs|path|cors|dotenv|express|multer|uuid)["']\);/g, "import $1 from '$2';");
content = content.replace(/const \{([^}]+)\} = require\(["'](uuid|mongodb)["']\);/g, "import { $1 } from '$2';");

// imports for services
content = content.replace(/const \{\s*([a-zA-Z0-9_,\s]+)\s*\} = require\(["']\.\/services\/([a-zA-Z0-9_]+)["']\);/g, "import { $1 } from '../services/$2.js';");
content = content.replace(/const \{[^}]+\} = require\("\.\/db"\);/, '');

// basic replacements
content = content.replace(/const app = express\(\);/, "import { Router } from 'express';\nimport mongoose from 'mongoose';\nconst router = Router();\n\nfunction getCollections() {\n  return {\n    candidates: mongoose.connection.db.collection('candidates'),\n    interviews: mongoose.connection.db.collection('interviews'),\n    answers: mongoose.connection.db.collection('answers'),\n    admins: mongoose.connection.db.collection('admins'),\n    interviewSessions: mongoose.connection.db.collection('interview_sessions')\n  };\n}\n");

// replace route methods
content = content.replace(/app\.(get|post|put|delete|use)\(/g, "router.$1(");

// remove app.listen entirely
content = content.replace(/const PORT.*?app\.listen[\s\S]*\}\);/g, '');

content += "\nexport default router;\n";

fs.writeFileSync('routes/aiMockRoutes.js', content);
console.log('Conversion successful!');
