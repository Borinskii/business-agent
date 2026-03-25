const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function captureScrollAnimation() {
  console.log('Starting Puppeteer...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set a standard desktop viewport
  await page.setViewport({ width: 1280, height: 800 });
  
  const url = process.argv[2] || 'http://localhost:5173';
  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Give React/Vite some time to hydrate the initial frame
  await new Promise(r => setTimeout(r, 2000));

  // Create frames directory
  const framesDir = path.join(__dirname, 'frames');
  if (!fs.existsSync(framesDir)) {
    fs.mkdirSync(framesDir);
  } else {
    // Clear old frames
    const files = fs.readdirSync(framesDir);
    for (const file of files) {
      fs.unlinkSync(path.join(framesDir, file));
    }
  }

  // Scroll parameters
  const scrollStep = 50;
  const maxScroll = 1500;
  let currentScroll = 0;
  let frameCount = 0;

  console.log('Capturing frames...');
  
  // Create an HTML file to easily view the frames as an animation scrubber
  let htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Animation Viewer</title>
    <style>
      body { margin: 0; background: #111; color: white; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; }
      #viewer { margin-top: 20px; border: 2px solid #333; max-width: 90vw; }
      #slider { width: 90vw; margin: 20px; }
      .controls { padding: 20px; text-align: center; }
    </style>
  </head>
  <body>
    <div class="controls">
      <h2>Scroll Animation Scrubber</h2>
      <input type="range" id="slider" min="0" value="0" step="1">
      <div id="scrollLabel">Scroll: 0px</div>
    </div>
    <img id="viewer" src="frame_0000.png" />
    
    <script>
      const slider = document.getElementById('slider');
      const viewer = document.getElementById('viewer');
      const label = document.getElementById('scrollLabel');
      
      const frameCount = {__FRAME_COUNT__};
      const scrollStep = ${scrollStep};
      slider.max = frameCount - 1;
      
      // Preload images
      const images = [];
      for(let i=0; i<frameCount; i++) {
         const img = new Image();
         img.src = 'frame_' + i.toString().padStart(4, '0') + '.png';
         images.push(img);
      }
      
      slider.addEventListener('input', (e) => {
         const idx = parseInt(e.target.value);
         viewer.src = images[idx].src;
         label.innerText = 'Scroll: ' + (idx * scrollStep) + 'px';
      });
      
      // Auto-play initially
      let autoPlayIdx = 0;
      let interval = setInterval(() => {
         autoPlayIdx++;
         if(autoPlayIdx >= frameCount) {
             clearInterval(interval);
         } else {
             slider.value = autoPlayIdx;
             viewer.src = images[autoPlayIdx].src;
             label.innerText = 'Scroll: ' + (autoPlayIdx * scrollStep) + 'px';
         }
      }, 50); // 20fps
    </script>
  </body>
  </html>
  `;

  while (currentScroll <= maxScroll) {
    // Scroll the page
    await page.evaluate((scrollY) => {
      window.scrollTo(0, scrollY);
    }, currentScroll);

    // Give react/framer/d3 a tiny moment to render the frame
    await new Promise(r => setTimeout(r, 50));

    // Capture screenshot
    const frameName = `frame_${frameCount.toString().padStart(4, '0')}.png`;
    await page.screenshot({ path: path.join(framesDir, frameName) });
    
    currentScroll += scrollStep;
    frameCount++;
    
    // Print progress
    process.stdout.write(`\rCaptured ${frameCount} frames (${currentScroll}px)`);
  }
  
  console.log('\nGenerating viewer...');
  htmlContent = htmlContent.replace('{__FRAME_COUNT__}', frameCount);
  fs.writeFileSync(path.join(framesDir, 'index.html'), htmlContent);

  console.log(`\nDone! Open file://${path.join(framesDir, 'index.html')} to scrub through the animation.`);
  await browser.close();
}

captureScrollAnimation().catch(console.error);
