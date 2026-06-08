const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

let browserInstance = null;
let launchPromise = null;
let activePages = 0;
let idleTimeout = null;
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const getBrowserOptions = async () => {
    const isWindows = process.platform === 'win32';
    let chromium;

    if (!isWindows) {
        try {
            chromium = require('@sparticuz/chromium');
        } catch (e) {
            console.log('[BrowserManager] @sparticuz/chromium not found, falling back to puppeteer-core');
        }
    }

    const launchOptions = {
        args: chromium ? chromium.args : (
            isWindows ? [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
            ] : [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote',
                '--single-process'
            ]
        ),
        defaultViewport: chromium ? chromium.defaultViewport : null,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
        headless: chromium ? chromium.headless : true,
    };

    if (!launchOptions.executablePath) {
        // 1. Check local cache (installed by scripts/install-chrome.js) in robust paths
        const possibleCacheDirs = [
            path.join(__dirname, '..', '.cache', 'puppeteer'),
            path.join(process.cwd(), '.cache', 'puppeteer'),
            path.join(process.cwd(), 'backend', '.cache', 'puppeteer')
        ];

        const findChrome = (dir) => {
            if (!fs.existsSync(dir)) return null;
            try {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    if (fs.statSync(fullPath).isDirectory()) {
                        const found = findChrome(fullPath);
                        if (found) return found;
                    } else if (file === 'chrome' || file === 'chrome.exe') {
                        return fullPath;
                    }
                }
            } catch (e) {
                console.error("[BrowserManager] Error reading cache dir:", dir, e.message);
            }
            return null;
        };

        for (const cacheDir of possibleCacheDirs) {
            console.log(`[BrowserManager] Checking cache dir: ${cacheDir}`);
            const foundPath = findChrome(cacheDir);
            if (foundPath) {
                console.log(`[BrowserManager] Found Chromium at: ${foundPath}`);
                launchOptions.executablePath = foundPath;
                break;
            }
        }

        // 2. If still not found, check platform-specific options
        if (!launchOptions.executablePath) {
            if (chromium) {
                try {
                    launchOptions.executablePath = await chromium.executablePath();
                    console.log('[BrowserManager] Using @sparticuz/chromium executable path:', launchOptions.executablePath);
                } catch (err) {
                    console.error('[BrowserManager] Error getting @sparticuz/chromium executable path:', err.message);
                }
            } else if (isWindows) {
                const commonPaths = [
                    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                    path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe')
                ];
                for (const p of commonPaths) {
                    if (fs.existsSync(p)) {
                        launchOptions.executablePath = p;
                        break;
                    }
                }
            }
        }
    }

    return launchOptions;
};

const getBrowser = async () => {
    // Clear idle timeout when a browser request comes in
    if (idleTimeout) {
        clearTimeout(idleTimeout);
        idleTimeout = null;
    }

    if (browserInstance && browserInstance.isConnected()) {
        return browserInstance;
    }

    if (launchPromise) {
        return launchPromise;
    }

    launchPromise = (async () => {
        try {
            const launchOptions = await getBrowserOptions();
            console.log('[BrowserManager] Launching Puppeteer browser with path:', launchOptions.executablePath || 'BUNDLED');
            browserInstance = await puppeteer.launch(launchOptions);
            console.log('[BrowserManager] Puppeteer browser launched successfully and cached.');

            browserInstance.on('disconnected', () => {
                console.log('[BrowserManager] Puppeteer browser disconnected.');
                browserInstance = null;
                launchPromise = null;
            });

            return browserInstance;
        } catch (error) {
            console.error('[BrowserManager] BROWSER LAUNCH FAILURE:', error.message);
            browserInstance = null;
            launchPromise = null;
            throw error;
        }
    })();

    return launchPromise;
};

const createPage = async () => {
    const browser = await getBrowser();
    activePages++;
    console.log(`[BrowserManager] Creating new page. Active pages: ${activePages}`);
    try {
        const page = await browser.newPage();
        return page;
    } catch (err) {
        activePages--;
        console.error('[BrowserManager] Failed to create page:', err.message);
        throw err;
    }
};

const releasePage = async (page) => {
    if (page) {
        try {
            await page.close();
        } catch (err) {
            console.error('[BrowserManager] Error closing page:', err.message);
        }
    }
    activePages--;
    console.log(`[BrowserManager] Page released. Active pages: ${activePages}`);
    if (activePages <= 0) {
        activePages = 0;
        resetIdleTimeout();
    }
};

const resetIdleTimeout = () => {
    if (idleTimeout) {
        clearTimeout(idleTimeout);
    }
    idleTimeout = setTimeout(async () => {
        if (activePages === 0 && browserInstance) {
            console.log('[BrowserManager] Browser idle for 5 minutes. Closing to free memory...');
            await closeBrowser();
        }
    }, IDLE_TIMEOUT_MS);
};

const closeBrowser = async () => {
    if (idleTimeout) {
        clearTimeout(idleTimeout);
        idleTimeout = null;
    }
    if (browserInstance) {
        try {
            await browserInstance.close();
            console.log('[BrowserManager] Browser closed successfully.');
        } catch (err) {
            console.error('[BrowserManager] Error closing browser:', err.message);
        }
        browserInstance = null;
        launchPromise = null;
    }
};

module.exports = {
    getBrowser,
    createPage,
    releasePage,
    closeBrowser
};
