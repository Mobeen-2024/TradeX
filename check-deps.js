const fs = require('fs');
const path = require('path');
const imports = new Set();
const walk = dir => {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.vue')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.matchAll(/from\s+['"]([^.\/][a-zA-Z0-9@\/-]+)['"]/g);
      for (const match of matches) {
        imports.add(match[1]);
      }
    }
  });
};
walk('./src');
console.log(Array.from(imports).join('\n'));
