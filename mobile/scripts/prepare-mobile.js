const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../../frontend/dist');
const destDir = path.resolve(__dirname, '../dist');

// Helper to copy directory recursively
function copyDir(src, dest) {
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  fs.mkdirSync(dest, { recursive: true });
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function processFiles() {
  console.log('--- Preparing Standalone Mobile Build ---');
  
  if (!fs.existsSync(srcDir)) {
    console.error(`Error: Source directory "${srcDir}" not found. Please run "npm run build" in the frontend folder first!`);
    process.exit(1);
  }

  // 1. Copy dist folder to local mobile directory
  console.log(`Copying web assets from: ${srcDir}`);
  console.log(`To local mobile assets: ${destDir}`);
  copyDir(srcDir, destDir);
  console.log('✓ Assets copied successfully.');

  // 2. Modify index.html to optimize mobile viewport (prevent zoom)
  const htmlPath = path.join(destDir, 'index.html');
  if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    // Replace viewport tag to prevent zoom
    const standardViewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0" />';
    const mobileViewport = '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />';
    
    if (html.includes(standardViewport)) {
      html = html.replace(standardViewport, mobileViewport);
      fs.writeFileSync(htmlPath, html, 'utf8');
      console.log('✓ Dynamic viewport optimization injected in index.html.');
    } else {
      // Direct replacement if standard tag is slightly different
      html = html.replace(/<meta name="viewport"[^>]*>/, mobileViewport);
      fs.writeFileSync(htmlPath, html, 'utf8');
      console.log('✓ Dynamic viewport optimization injected in index.html.');
    }
  } else {
    console.warn('Warning: index.html not found in build.');
  }

  // 3. Inject safe-area padding to the compiled stylesheet
  const assetsDir = path.join(destDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    const cssFiles = files.filter(f => f.endsWith('.css'));
    
    if (cssFiles.length > 0) {
      cssFiles.forEach(cssFile => {
        const cssPath = path.join(assetsDir, cssFile);
        let cssContent = fs.readFileSync(cssPath, 'utf8');
        
        // Append mobile safe-area paddings to body at the end to override previous stylings
        const safeAreaStyle = '\nbody { padding-top: env(safe-area-inset-top) !important; padding-bottom: env(safe-area-inset-bottom) !important; }\n';
        cssContent += safeAreaStyle;
        
        fs.writeFileSync(cssPath, cssContent, 'utf8');
        console.log(`✓ Safe area layout rules injected into CSS: ${cssFile}`);
      });
    } else {
      console.warn('Warning: No CSS stylesheet found in assets.');
    }
  } else {
    console.warn('Warning: assets directory not found.');
  }
  
  console.log('--- Standalone Mobile Build Ready! ---');
}

processFiles();
