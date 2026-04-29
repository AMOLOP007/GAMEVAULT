const { Jimp } = require('jimp');

async function extractShape() {
  console.log('Reading image...');
  const imgPath = 'C:\\Users\\amolt\\.gemini\\antigravity\\brain\\f8222641-4e7f-4d27-99d0-3eb061e5595a\\media__1777190289444.png';
  const img = await Jimp.read(imgPath);
  
  const width = img.bitmap.width;
  const height = img.bitmap.height;
  
  // Crop the watermark at the bottom (approx bottom 15%)
  const w = img.bitmap.width;
  const h = img.bitmap.height;

  console.log('Thresholding...');
  // Convert to binary: black outline, white everything else
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const hex = img.getPixelColor(x, y);
      const rgba = Jimp.intToRGBA(hex);
      // if dark, make it pure black. if light, pure white.
      if (rgba.r < 150 && rgba.g < 150 && rgba.b < 150) {
        img.setPixelColor(Jimp.rgbaToInt(0, 0, 0, 255), x, y);
      } else {
        img.setPixelColor(Jimp.rgbaToInt(255, 255, 255, 255), x, y);
      }
    }
  }

  console.log('Flood filling outside...');
  // BFS flood fill from (0,0) to turn outside white into black.
  // We assume (0,0) is outside the controller.
  const visited = new Uint8Array(w * h);
  const queue = [{x: 0, y: 0}];
  visited[0] = 1;
  
  const targetColorHex = Jimp.rgbaToInt(255, 255, 255, 255);
  const replacementColorHex = Jimp.rgbaToInt(0, 0, 0, 255); // black means transparent in our mask later

  // add other corners to queue just in case
  queue.push({x: w-1, y: 0});
  queue.push({x: 0, y: h-1});
  queue.push({x: w-1, y: h-1});
  
  for(let q of queue) {
      visited[q.y * w + q.x] = 1;
  }

  let head = 0;
  while(head < queue.length) {
    const {x, y} = queue[head++];
    
    // Set to replacement color
    img.setPixelColor(replacementColorHex, x, y);

    // check neighbors
    const neighbors = [
      {nx: x+1, ny: y}, {nx: x-1, ny: y},
      {nx: x, ny: y+1}, {nx: x, ny: y-1}
    ];

    for (let {nx, ny} of neighbors) {
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const idx = ny * w + nx;
        if (!visited[idx]) {
          visited[idx] = 1;
          const color = img.getPixelColor(nx, ny);
          if (color === targetColorHex) {
            queue.push({x: nx, y: ny});
          }
        }
      }
    }
  }

  console.log('Creating solid mask...');
  // Now, the outside is black (0), the outline is black (0), the inside is white (255).
  // This means the inside is opaque, and outside is transparent! This is a PERFECT MASK.
  // But wait, the outline itself is black, so it will be transparent in the mask.
  // We want the outline AND the inside to be solid white for the mask.
  // We can do this by just reading the original thresholded image again.
  // The mask should be: outside = transparent, inside/outline = solid.
  // So anything that was NOT reached by flood-fill (visited=0) should be white!
  
  const mask = new Jimp(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (visited[idx]) {
        // outside
        mask.setPixelColor(Jimp.rgbaToInt(0, 0, 0, 0), x, y); // transparent
      } else {
        // inside or outline
        mask.setPixelColor(Jimp.rgbaToInt(255, 255, 255, 255), x, y); // white opaque
      }
    }
  }
  
  await mask.writeAsync('public/controller_mask.png');

  // We also want a clean version of the image (without white background, just black lines)
  // to overlay on top of our solid color controller.
  const outline = new Jimp(w, h);
  const origImg = await Jimp.read(imgPath);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const hex = origImg.getPixelColor(x, y);
      const rgba = Jimp.intToRGBA(hex);
      if (rgba.r > 200 && rgba.g > 200 && rgba.b > 200) {
        outline.setPixelColor(Jimp.rgbaToInt(0, 0, 0, 0), x, y); // transparent
      } else {
        outline.setPixelColor(Jimp.rgbaToInt(0, 0, 0, 255), x, y); // black line
      }
    }
  }
  await outline.writeAsync('public/controller_outline_clean.png');

  console.log('Done!');
}

extractShape().catch(e => console.log(e.message || e));
