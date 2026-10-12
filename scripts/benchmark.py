"""Authenticated local read benchmark, not a production capacity claim."""
import argparse
import concurrent.futures
import json
import os
import statistics
import time
import urllib.request
import urllib.error
import http.cookiejar

parser = argparse.ArgumentParser()
parser.add_argument("--base-url", default="http://127.0.0.1:8017")
parser.add_argument("--requests", type=int, default=100)
parser.add_argument("--concurrency", type=int, default=5)
args = parser.parse_args()
password = os.environ["BENCH_PASSWORD"]
jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
base = args.base_url.rstrip("/") + "/api/v1/"
token = json.load(opener.open(base + "auth/csrf/"))["csrfToken"]
payload = json.dumps({"username": os.environ.get("BENCH_USERNAME", "demo.auditor"), "password": password}).encode()
opener.open(urllib.request.Request(base + "auth/login/", data=payload, headers={"Content-Type": "application/json", "X-CSRFToken": token})).close()
cookies = "; ".join(f"{c.name}={c.value}" for c in jar)
def one(index):
    start = time.perf_counter()
    request = urllib.request.Request(base + "cases/?page_size=20", headers={"Cookie": cookies})
    with urllib.request.urlopen(request, timeout=10) as response:
        data = json.load(response)
        return (time.perf_counter() - start) * 1000, data["count"]
with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as executor:
    results = list(executor.map(one, range(args.requests)))
times = sorted(ms for ms, _ in results)
print(json.dumps({"requests": len(times), "concurrency": args.concurrency, "records": results[0][1], "median_ms": round(statistics.median(times), 2), "p95_ms": round(times[min(len(times)-1, int(len(times)*.95))], 2), "max_ms": round(max(times), 2), "scope": "local read endpoint only"}, indent=2))

