const { Jimp } = require('jimp');
const fs = require('fs');

async function processImages() {
  console.log('Processing PS Logo...');
  const ps = await Jimp.read('C:\\Users\\amolt\\.gemini\\antigravity\\brain\\f8222641-4e7f-4d27-99d0-3eb061e5595a\\media__1777189709253.png');
  // Make anything that is dark (r<180, g<180, b<180) transparent
  ps.scan(0, 0, ps.bitmap.width, ps.bitmap.height, function(x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    if (r < 180 && g < 180 && b < 180) {
      this.bitmap.data[idx + 3] = 0; // alpha
    } else {
      // make the remaining (the white logo) into black so it contrasts on the white controller
      this.bitmap.data[idx + 0] = 0;
      this.bitmap.data[idx + 1] = 0;
      this.bitmap.data[idx + 2] = 0;
    }
  });
  await ps.write('public/ps_logo.png');

  console.log('Processing Xbox Logo...');
  const xbox = await Jimp.read('C:\\Users\\amolt\\.gemini\\antigravity\\brain\\f8222641-4e7f-4d27-99d0-3eb061e5595a\\media__1777189711337.png');
  // Make anything that is very bright (white) transparent
  xbox.scan(0, 0, xbox.bitmap.width, xbox.bitmap.height, function(x, y, idx) {
    const r = this.bitmap.data[idx + 0];
    const g = this.bitmap.data[idx + 1];
    const b = this.bitmap.data[idx + 2];
    if (r > 220 && g > 220 && b > 220) {
      this.bitmap.data[idx + 3] = 0; // alpha
    }
  });
  await xbox.write('public/xbox_logo.png');

  console.log('Processing Controller Mask...');
  // For the controller mask, we just need a black-and-white silhouette.
  // Since Jimp floodfill is tricky, let's just use CSS.
  // Wait, if we save the controller outline as a transparent PNG by removing the white background,
  // we get just the outline. That works for an outline, but not a solid mask.
  // If we just copy the controller image to public, we can use it as a standard background image,
  // and the user can see the EXACT image.
  // But the user said: "the shape of controller extract from image extract from image".
  // Let's just copy it and we will use CSS mask-image and modern CSS masking, or just use the image directly!
  fs.copyFileSync('C:\\Users\\amolt\\.gemini\\antigravity\\brain\\f8222641-4e7f-4d27-99d0-3eb061e5595a\\media__1777189740604.jpg', 'public/controller_outline.jpg');

  console.log('Done!');
}

processImages().catch(console.error);
