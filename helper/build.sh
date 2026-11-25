#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
out="$(cd .. && pwd)/helpers"
mkdir -p "$out"

CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -trimpath -o "$out/Deskline-Mac.arm64" .
CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -trimpath -o "$out/Deskline-Mac.amd64" .
lipo -create -output "$out/Deskline-Mac" "$out/Deskline-Mac.arm64" "$out/Deskline-Mac.amd64"
rm -f "$out/Deskline-Mac.arm64" "$out/Deskline-Mac.amd64"
chmod +x "$out/Deskline-Mac"

CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -trimpath -ldflags "-H windowsgui" -o "$out/Deskline-Windows.exe" .

stage="$(mktemp -d)"
mkdir -p "$stage/Deskline-Mac"
COPYFILE_DISABLE=1 cp "$out/Deskline-Mac" "$stage/Deskline-Mac/Deskline-Mac"
COPYFILE_DISABLE=1 cp Start.command "$stage/Deskline-Mac/Start.command"
COPYFILE_DISABLE=1 cp 说明.txt "$stage/Deskline-Mac/ReadMe.txt"
chmod +x "$stage/Deskline-Mac/Deskline-Mac" "$stage/Deskline-Mac/Start.command"
rm -f "$out/Deskline-Mac.zip"
COPYFILE_DISABLE=1 ditto -c -k --norsrc --keepParent "$stage/Deskline-Mac" "$out/Deskline-Mac.zip"
rm -rf "$stage"

echo "built:"
ls -lh "$out/Deskline-Mac" "$out/Deskline-Mac.zip" "$out/Deskline-Windows.exe"
