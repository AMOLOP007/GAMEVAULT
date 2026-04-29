const { Jimp } = require('jimp');

async function processMask() {
  const imgPath = 'public/controller_new.png';
  const img = await Jimp.read(imgPath);
  
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  
  // We want to create a new image that is solid white inside the controller, and transparent everywhere else.
  // The original image has black lines and a white background.
  // Step 1: Flood fill the outside from (0,0) with RED.
  // Step 2: Anything that is RED becomes transparent. Anything else (black lines, white inside) becomes SOLID WHITE!
  
  // Create a 1D visited array
  const visited = new Uint8Array(w * h);
  const queue = [{x: 0, y: 0}];
  visited[0] = 1;
  
  // To check if a pixel is "white background", we check its color.
  // Black lines will not be added to the queue, acting as the boundary.
  while(queue.length > 0) {
    const {x, y} = queue.shift();
    
    // Check neighbors
    const neighbors = [
      {nx: x+1, ny: y}, {nx: x-1, ny: y},
      {nx: x, ny: y+1}, {nx: x, ny: y-1}
    ];

    for (let {nx, ny} of neighbors) {
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const idx = ny * w + nx;
        if (!visited[idx]) {
          // Check color. We assume RGBA.
          // In Jimp, bitmap.data is a flat array of RGBA bytes.
          const dataIdx = (ny * w + nx) * 4;
          const r = img.bitmap.data[dataIdx];
          const g = img.bitmap.data[dataIdx+1];
          const b = img.bitmap.data[dataIdx+2];
          
          // If it's light (background), it's traversable.
          if (r > 200 && g > 200 && b > 200) {
            visited[idx] = 1;
            queue.push({x: nx, y: ny});
          }
        }
      }
    }
  }

  // Now create the final mask image
  const mask = new Jimp({ width: w, height: h, color: 0x00000000 });
  
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const dataIdx = (y * w + x) * 4;
      if (!visited[idx]) {
        // This is either the outline or the inside of the controller!
        // We want it to be solid white.
        mask.bitmap.data[dataIdx] = 255; // R
        mask.bitmap.data[dataIdx+1] = 255; // G
        mask.bitmap.data[dataIdx+2] = 255; // B
        mask.bitmap.data[dataIdx+3] = 255; // A
      } else {
        // Outside, make it transparent
        mask.bitmap.data[dataIdx] = 0;
        mask.bitmap.data[dataIdx+1] = 0;
        mask.bitmap.data[dataIdx+2] = 0;
        mask.bitmap.data[dataIdx+3] = 0;
      }
    }
  }

  // Also crop the bottom watermark by just making the bottom 15% transparent
  const cropY = Math.floor(h * 0.88);
  for (let y = cropY; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dataIdx = (y * w + x) * 4;
      mask.bitmap.data[dataIdx+3] = 0;
    }
  }

  // Save the mask
  await mask.write('public/controller_solid.png');
  console.log('Mask generated successfully!');
}

processMask().catch(e => console.log(e));
