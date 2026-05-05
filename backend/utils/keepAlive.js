
/**
 * Pings the server at a regular interval to prevent it from spinning down.
 * @param {string} url - The full URL of the server to ping.
 * @param {number} intervalMinutes - Interval in minutes (default 14).
 */
const keepAlive = (url, intervalMinutes = 14) => {
    if (!url) {
        console.warn('Keep-alive: No URL provided, skipping pinger.');
        return;
    }

    const protocol = url.startsWith('https') ? require('https') : require('http');
    console.log(`Keep-alive: Scheduled pings for ${url} every ${intervalMinutes} minutes.`);

    setInterval(() => {
        protocol.get(url, (res) => {
            console.log(`Keep-alive: Pinged ${url} - Status: ${res.statusCode}`);
        }).on('error', (err) => {
            console.error(`Keep-alive: Error pinging ${url}:`, err.message);
        });
    }, intervalMinutes * 60 * 1000);
};


module.exports = keepAlive;
