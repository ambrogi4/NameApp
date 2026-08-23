#!/bin/bash
# sync_extension.sh - Run from WSL on Windows Thinkpad
# Copies Chrome extension from Linux laptop to Windows Desktop

scp -r -P 2222 ambrogi4@100.121.134.27:/home/ambrogi4/myDir/gcli/NameApp/extension /mnt/c/Users/mambrogi/Desktop/

echo "Done! Reload extension in Chrome (chrome://extensions → Reload)"
