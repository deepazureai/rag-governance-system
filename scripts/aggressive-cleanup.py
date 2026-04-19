#!/usr/bin/env python3
import os
import shutil
import subprocess
import sys

project_root = '/vercel/share/v0-project'
print(f"[v0] Starting aggressive cleanup of {project_root}...")

# Directories to remove
dirs_to_remove = [
    os.path.join(project_root, '.next'),
    os.path.join(project_root, '.git'),
    os.path.join(project_root, 'node_modules'),
    os.path.join(project_root, '.turbo'),
    os.path.join(project_root, '.vercel'),
    os.path.join(project_root, 'backend', 'node_modules'),
    os.path.join(project_root, 'backend', 'dist'),
    os.path.join(project_root, 'backend', 'build'),
    os.path.join(project_root, '.next'),
]

for dir_path in dirs_to_remove:
    if os.path.exists(dir_path):
        try:
            print(f"[v0] Removing: {dir_path}")
            # Use subprocess to force remove
            subprocess.run(['rm', '-rf', dir_path], check=True, capture_output=True)
            print(f"[v0] Removed: {dir_path}")
        except Exception as e:
            print(f"[v0] Could not remove {dir_path}: {e}")
    else:
        print(f"[v0] Does not exist: {dir_path}")

print("[v0] Aggressive cleanup completed!")
print("[v0] Project is now lean and ready for download.")
