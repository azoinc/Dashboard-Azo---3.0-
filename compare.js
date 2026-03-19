const fs = require('fs');
const path = require('path');

function compareDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (fs.existsSync(destPath)) {
        compareDir(srcPath, destPath);
      } else {
        console.log(`Only in ${src}: ${entry.name}`);
      }
    } else {
      if (fs.existsSync(destPath)) {
        const srcContent = fs.readFileSync(srcPath, 'utf8');
        const destContent = fs.readFileSync(destPath, 'utf8');
        if (srcContent !== destContent) {
          console.log(`Different: ${srcPath}`);
        }
      } else {
        console.log(`Only in ${src}: ${entry.name}`);
      }
    }
  }
}

compareDir('/temp-repo/src', '/src');
