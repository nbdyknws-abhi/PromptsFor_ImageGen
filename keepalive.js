#!/usr/bin/env node

/**
 * Ultra-lightweight 24/7 Keep-Alive Script
 * Pings your web server with zero load (using HEAD/GET requests)
 * to prevent cloud hosting (Render, Koyeb, Glitch, etc.) from sleeping.
 *
 * Usage:
 *   node keepalive.js [URL] [INTERVAL_MINUTES]
 * Example:
 *   node keepalive.js https://imagegenprompt.onrender.com/ 10
 */

const https = require('https');
const http = require('http');

const TARGET_URL = process.argv[2] || process.env.TARGET_URL || 'https://imagegenprompt.onrender.com/';
const INTERVAL_MIN = parseFloat(process.argv[3] || process.env.INTERVAL_MIN || '10');
const INTERVAL_MS = Math.max(1, INTERVAL_MIN) * 60 * 1000;

function pingServer() {
  const parsed = new URL(TARGET_URL);
  const client = parsed.protocol === 'https:' ? https : http;

  const req = client.request(
    TARGET_URL,
    {
      method: 'HEAD',
      headers: {
        'User-Agent': 'KeepAliveBot/1.0 (Zero-Load HealthCheck)',
      },
      timeout: 15000,
    },
    (res) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] Pinged ${TARGET_URL} - Status: ${res.statusCode}`);
      // Consume response data to free up memory
      res.resume();
    }
  );

  req.on('timeout', () => {
    console.warn(`[${new Date().toISOString()}] Warning: Request timed out for ${TARGET_URL}`);
    req.destroy();
  });

  req.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] Ping error:`, err.message);
  });

  req.end();
}

console.log('='.repeat(60));
console.log('  Zero-Load 24/7 Keep-Alive Bot Started');
console.log(`  Target URL : ${TARGET_URL}`);
console.log(`  Interval   : Every ${INTERVAL_MIN} minutes`);
console.log('='.repeat(60));

// Initial immediate ping
pingServer();

// Continuous infinite loop
setInterval(pingServer, INTERVAL_MS);
