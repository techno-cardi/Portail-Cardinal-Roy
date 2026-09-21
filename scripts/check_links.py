#!/usr/bin/env python3
import base64
import html
import json
import re
import socket
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "link-health.json"

texts = []
parts = sorted(ROOT.glob("body-part-*.txt"))
if parts:
    encoded = "".join(p.read_text(encoding="utf-8") for p in parts)
    try:
        texts.append(base64.b64decode(re.sub(r"\s+", "", encoded)).decode("utf-8", "replace"))
    except Exception as exc:
        print(f"WARNING: impossible de décoder le contenu historique: {exc}")

sources = [
    *ROOT.glob("source-patches*.js"), ROOT / "after-ui.js", ROOT / "ui-polish.js",
    ROOT / "global-search-flash.js", ROOT / "procedure-links.js", ROOT / "depannage-resource.js",
    ROOT / "portal-integrity.js", ROOT / "search-easter-egg.js", ROOT / "search-easter-eggs-extra.js",
    ROOT / "news-ticker.js", ROOT / "portal-updates-curated.json", ROOT / "news-feed.json", ROOT / "index.html",
]
for path in sources:
    if path.exists():
        texts.append(path.read_text(encoding="utf-8", errors="replace"))

joined = "\n".join(texts)
raw_urls = re.findall(r"https?://[^\s'\"`<>]+", joined)
urls = sorted({html.unescape(url).rstrip("),.;]}") for url in raw_urls})
image_ext = re.compile(r"\.(?:png|jpe?g|gif|svg|webp|ico)(?:[?#].*)?$", re.I)
ignored_origins = {"https://fonts.googleapis.com", "https://fonts.gstatic.com"}
urls = [url for url in urls if not image_ext.search(url) and "encrypted-tbn0.gstatic.com/images?" not in url and url.rstrip("/") not in {origin.rstrip("/") for origin in ignored_origins}]

broken = []
warnings = []


def check(url):
    request = Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; Cardinal-Roy-Link-Checker/2.0)",
        "Accept": "text/html,application/xhtml+xml,application/pdf,*/*;q=0.8",
    })
    try:
        with urlopen(request, timeout=20) as response:
            return getattr(response, "status", 200), response.geturl(), None
    except HTTPError as exc:
        return exc.code, exc.geturl(), None
    except (URLError, socket.timeout, TimeoutError) as exc:
        return None, None, str(exc)


print(f"{len(urls)} liens externes uniques à vérifier.")
for url in urls:
    code = final = network_error = None
    for attempt in range(2):
        code, final, network_error = check(url)
        if code is not None or attempt == 1:
            break
        time.sleep(2)
    if code in (404, 410):
        broken.append({"url": url, "code": code, "final_url": final or ""})
        print(f"BROKEN {code}: {url}")
    elif network_error:
        warnings.append({"url": url, "reason": network_error[:240]})
        print(f"WARNING réseau: {url} -> {network_error}")
    elif code is not None and code >= 500:
        warnings.append({"url": url, "reason": f"HTTP {code}"})
        print(f"WARNING serveur {code}: {url}")
    elif code in (401, 403):
        print(f"PROTECTED {code}: {url}")
    else:
        print(f"OK {code}: {url}" + (f" -> {final}" if final and final != url else ""))

local_refs = set()
for match in re.findall(r"(?:href|src)=[\"']([^\"']+)[\"']", joined, flags=re.I):
    value = html.unescape(match).strip()
    if not value or "${" in value or "}" in value or value.startswith(("#", "http://", "https://", "mailto:", "tel:", "data:", "javascript:")):
        continue
    value = value.split("?", 1)[0].split("#", 1)[0].lstrip("/")
    if value:
        local_refs.add(value)

for value in sorted(local_refs):
    if not (ROOT / value).exists():
        broken.append({"url": value, "code": "LOCAL", "final_url": ""})
        print(f"BROKEN local: {value}")

status = "broken" if broken else ("warning" if warnings else "ok")
payload = {
    "version": 1,
    "checked_at": datetime.now(timezone.utc).isoformat(),
    "status": status,
    "checked_external_links": len(urls),
    "broken_count": len(broken),
    "warning_count": len(warnings),
    "broken": broken[:100],
    "warnings": warnings[:100],
}
OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"\nRésumé: {len(broken)} brisé(s), {len(warnings)} avertissement(s).")
print(f"Rapport écrit dans {OUTPUT.name}.")
