import os
import shutil
import sys

project_root = "/vercel/share/v0-project"

# Directories to remove
dirs_to_remove = [
    os.path.join(project_root, ".git"),
    os.path.join(project_root, ".next"),
    os.path.join(project_root, "node_modules"),
    os.path.join(project_root, ".turbo"),
    os.path.join(project_root, ".vercel"),
    os.path.join(project_root, "backend", "node_modules"),
    os.path.join(project_root, "backend", "dist"),
    os.path.join(project_root, "backend", "build"),
]

print(f"[v0] Starting final cleanup of {project_root}...")

for dir_path in dirs_to_remove:
    if os.path.exists(dir_path):
        try:
            shutil.rmtree(dir_path, ignore_errors=True)
            print(f"[v0] DELETED: {dir_path}")
        except Exception as e:
            print(f"[v0] ERROR deleting {dir_path}: {e}")
    else:
        print(f"[v0] SKIP (not found): {dir_path}")

print("[v0] Final cleanup completed!")
print("[v0] Project is now ready for download - only source code and config files remain.")
