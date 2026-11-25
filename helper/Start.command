#!/bin/bash
cd "$(dirname "$0")" || exit 1
chmod +x "./Deskline-Mac" 2>/dev/null || true
if curl -sf --max-time 1 http://127.0.0.1:47321/health >/dev/null; then
  osascript -e 'display dialog "换屏小助手已经在后台运行。回到网页点「更换屏幕」即可。" buttons {"好"} default button 1 with title "Deskline"'
  exit 0
fi
mkdir -p "$HOME/Library/Logs"
nohup "./Deskline-Mac" >> "$HOME/Library/Logs/deskline-helper.log" 2>&1 &
disown
sleep 0.4
osascript -e 'display dialog "换屏小助手已在后台运行。可以关掉这个窗口，回到网页再点「更换屏幕」。" buttons {"好"} default button 1 with title "Deskline"'
