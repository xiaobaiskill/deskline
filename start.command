#!/bin/bash
cd "$(dirname "$0")" || exit 1
if [[ -x helpers/Deskline-Mac ]]; then
  exec helpers/Deskline-Mac
fi
exec /usr/bin/python3 helper.py
