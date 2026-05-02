const { install, detectBrowserPlatform } = require('@puppeteer/browsers');
const path = require('path');
const fs = require('fs');

async function download() {
    console.log('--- Puppeteer Browser Installation Start ---');
    
    const cacheDir = path.join(process.cwd(), '.cache', 'puppeteer');
    console.log(`Cache Directory: ${cacheDir}`);
    
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    try {
        const platform = detectBrowserPlatform();
        console.log(`Detected Platform: ${platform}`);
        
        console.log('Downloading Chrome...');
        const result = await install({
            browser: 'chrome',
            cacheDir: cacheDir,
            buildId: '124.0.6367.201', // Using a specific stable version
            unpack: true
        });
        
        console.log('--- Installation Complete ---');
        console.log('Executable Path:', result.executablePath);
        
        // List files in cache to verify structure
        const allFiles = fs.readdirSync(cacheDir, { recursive: true });
        console.log('Files in cache:', JSON.stringify(allFiles.slice(0, 20))); // Show first 20 files
        
        // Save the path to an environment file or just rely on it being in cache
        // On Render, we might want to set PUPPETEER_EXECUTABLE_PATH
    } catch (err) {
        console.error('--- Installation Failed ---');
        console.error(err);
        process.exit(1);
    }
}

download();
