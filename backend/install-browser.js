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
            buildId: '147.0.7727.57', // Exact version from your error
            cacheDir: cacheDir,
            unpack: true
        });
        console.log('--- DOWNLOAD COMPLETE ---');
        console.log('Executable Path:', result.executablePath);
    } catch (err) {
        console.error('--- DOWNLOAD FAILED ---');
        console.error(err);
        process.exit(1);
    }
}

download();
