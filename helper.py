#!/usr/bin/env python3
"""本机助手：只监听 127.0.0.1，把页面发来的 PNG 设为 Mac 桌面。"""

import json
import subprocess
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HOST = "127.0.0.1"
PORT = 47321
FOLDER = Path.home() / "Pictures" / "Deskline"
MAX_BYTES = 40 * 1024 * 1024

APPKIT_SCRIPT = r'''
use framework "AppKit"
use scripting additions
on run argv
    set imagePath to item 1 of argv
    set imageURL to current application's NSURL's fileURLWithPath:imagePath
    set workspace to current application's NSWorkspace's sharedWorkspace()
    set screens to current application's NSScreen's screens()
    if (count of screens) is 0 then error "没有找到显示器"
    repeat with sc in screens
        set outcome to workspace's setDesktopImageURL:imageURL forScreen:sc options:(current application's NSDictionary's dictionary()) |error|:(reference)
        set didSet to item 1 of outcome
        if didSet as boolean is false then
            set errObj to item 2 of outcome
            if errObj is missing value then error "系统没有接受这张壁纸"
            error (errObj's localizedDescription() as text)
        end if
    end repeat
end run
'''


def humanize(err: str) -> str:
    text = err or ""
    lowered = text.lower()
    if "-1743" in text or "1002" in text or "不允许" in text or "not authorized" in lowered:
        return "系统拦截了更换壁纸。请允许「终端」或 Python 控制这台 Mac。"
    flat = " ".join(text.split())
    if len(flat) > 280:
        flat = flat[:280] + "…"
    return "更换失败：" + (flat or "未知错误")


def save_wallpaper(data: bytes) -> Path:
    FOLDER.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S")
    path = FOLDER / f"wallpaper-{stamp}.png"
    seq = 1
    while path.exists():
        seq += 1
        path = FOLDER / f"wallpaper-{stamp}-{seq}.png"
    path.write_bytes(data)
    kept = sorted(FOLDER.glob("wallpaper-*.png"), key=lambda item: item.stat().st_mtime)
    for old in kept[:-12]:
        try:
            old.unlink()
        except OSError:
            pass
    return path


def set_wallpaper(path: Path):
    try:
        proc = subprocess.run(
            ["osascript", "-e", APPKIT_SCRIPT, str(path)],
            capture_output=True,
            text=True,
            timeout=45,
        )
    except subprocess.TimeoutExpired:
        return humanize("timeout")
    if proc.returncode == 0:
        return None
    return humanize((proc.stderr or proc.stdout or "").strip())


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        origin = self.headers.get("Origin") or "*"
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, code, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if self.path.split("?", 1)[0] != "/health":
            self._json(404, {"ok": False, "error": "没有这个地址"})
            return
        self._json(200, {"ok": True})

    def do_POST(self):
        if self.path.split("?", 1)[0] != "/wallpaper":
            self._json(404, {"ok": False, "error": "没有这个地址"})
            return
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 8 or length > MAX_BYTES:
            self._json(413, {"ok": False, "error": "图片为空或太大"})
            return
        data = self.rfile.read(length)
        if not data.startswith(b"\x89PNG"):
            self._json(400, {"ok": False, "error": "需要 PNG 图片"})
            return
        path = save_wallpaper(data)
        err = set_wallpaper(path)
        if err:
            self._json(500, {"ok": False, "error": err})
            return
        self._json(200, {"ok": True, "path": str(path)})

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args), flush=True)


def main():
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Deskline 助手  http://{HOST}:{PORT}", flush=True)
    print("保持这个窗口开着，网页上的「更换 Mac 屏幕」才会生效。按 Ctrl+C 停止。", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止。", flush=True)
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
