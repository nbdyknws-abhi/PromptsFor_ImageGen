#!/usr/bin/env python3
"""
Ultra-lightweight 24/7 Keep-Alive Script (Python)
Zero dependencies - uses built-in urllib.
Pings the target URL using lightweight HEAD requests to keep servers alive infinitely.

Usage:
    python3 keepalive.py [URL] [INTERVAL_MINUTES]
"""

import sys
import time
import urllib.request
import urllib.error
from datetime import datetime

TARGET_URL = sys.argv[1] if len(sys.argv) > 1 else "https://imagegenprompt.onrender.com/"
INTERVAL_MINUTES = float(sys.argv[2]) if len(sys.argv) > 2 else 10.0
INTERVAL_SECONDS = max(60, int(INTERVAL_MINUTES * 60))

class HeadRequest(urllib.request.Request):
    def get_method(self):
        return "HEAD"

def ping():
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    req = HeadRequest(
        TARGET_URL,
        headers={"User-Agent": "KeepAliveBot/1.0 (Zero-Load HealthCheck)"}
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            print(f"[{timestamp}] Pinged {TARGET_URL} - Status: {response.status}")
    except urllib.error.HTTPError as e:
        print(f"[{timestamp}] Pinged {TARGET_URL} - HTTP Status: {e.code}")
    except Exception as e:
        print(f"[{timestamp}] Ping error: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("  Zero-Load 24/7 Python Keep-Alive Bot Started")
    print(f"  Target URL : {TARGET_URL}")
    print(f"  Interval   : Every {INTERVAL_MINUTES} minutes")
    print("=" * 60)
    
    while True:
        ping()
        time.sleep(INTERVAL_SECONDS)
