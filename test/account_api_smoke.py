"""Minimal REST contract smoke test for the file-backed account adapter."""

import json
import time
import urllib.error
import urllib.request
from http.cookiejar import CookieJar


base = "http://127.0.0.1:3000"
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))
username = f"smoke_{int(time.time() * 1000) % 100000000}"
password = "correct horse battery staple"


def request(path, method="GET", payload=None):
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        base + path,
        data=body,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with opener.open(req, timeout=10) as response:
            raw = response.read()
            return response.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        raw = error.read()
        try:
            body = json.loads(raw) if raw else None
        except json.JSONDecodeError:
            body = {"raw": raw.decode("utf-8", errors="replace")}
        return error.code, body


status, registered = request("/api/auth/register", "POST", {"username": username, "password": password})
assert status == 201, (status, registered)
assert len(registered["recoveryCodes"]) == 6
assert registered["user"]["username"] == username

status, current = request("/api/auth/me")
assert status == 200 and current["user"]["username"] == username, (status, current)

status, empty_save = request("/api/campaign")
assert status == 200 and empty_save is None, (status, empty_save)

payload = {
    "floor": 3,
    "level": 4,
    "xp": 800,
    "attributes": {"vitality": 30, "arcana": 22, "focus": 25, "haste": 20, "mastery": 18},
    "bag": [],
}
status, saved = request("/api/campaign", "PUT", {"payload": payload, "revision": 0})
assert status == 200 and saved["revision"] == 1, (status, saved)

status, conflict = request("/api/campaign", "PUT", {"payload": payload, "revision": 0})
assert status == 409 and "changed elsewhere" in conflict["message"], (status, conflict)

status, _ = request("/api/auth/logout", "POST")
assert status == 204
status, _ = request("/api/auth/me")
assert status == 401

status, _ = request("/api/auth/login", "POST", {"username": username, "password": password})
assert status == 200
status, deleted = request("/api/auth/account", "DELETE", {"password": password})
assert status == 204, (status, deleted)

print("Account REST contract smoke passed.")
