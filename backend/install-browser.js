const { install } = require('@puppeteer/browsers');
const path = require('path');
const fs = require('fs');

async function download() {
    console.log('--- STARTING BROWSER DOWNLOAD ---');
    const cacheDir = path.join(__dirname, 'chrome_browser');
    
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    try {
        const result = await install({
            browser: 'chrome',
            buildId: '147.0.7727.57', 
            cacheDir: cacheDir,
            unpack: true
        });
        console.log('--- DOWNLOAD COMPLETE ---');
        console.log('Executable Path:', result.executablePath);
        
        // List files to verify
        if (fs.existsSync(result.executablePath)) {
            console.log('VERIFIED: Browser executable exists at target path.');
        } else {
            console.log('WARNING: Executable not found at returned path. Searching...');
            const allFiles = fs.readdirSync(cacheDir, { recursive: true });
            console.log('All files in cacheDir:', allFiles.join(', '));
        }
    } catch (err) {
        console.error('--- DOWNLOAD FAILED ---');
        console.error(err);
        process.exit(1);
    }
}

download();
