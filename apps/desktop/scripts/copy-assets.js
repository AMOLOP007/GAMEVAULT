const fs = require('fs');
const path = require('path');

const files = [
  { src: 'src/main/preload.cjs', dest: 'dist/main/preload.cjs' },
  { src: 'src/renderer/overlay.html', dest: 'dist/renderer/overlay.html' }
];

files.forEach(f => {
  const destDir = path.dirname(f.dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(f.src, f.dest);
  console.log(`Copied ${f.src} to ${f.dest}`);
});

// Remove any lingering package.json from previous ESM attempts
const mainPkgPath = path.join('dist/main', 'package.json');
if (fs.existsSync(mainPkgPath)) {
  fs.unlinkSync(mainPkgPath);
}
