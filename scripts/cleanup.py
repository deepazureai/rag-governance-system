import os
import shutil
import sys

def cleanup_project(project_path="/vercel/share/v0-project"):
    """Remove build artifacts and large directories"""
    
    dirs_to_remove = [
        ".next",
        ".git",
        "node_modules",
        ".turbo",
        ".vercel",
        "coverage",
        "logs",
        "backend/node_modules",
        "backend/dist",
        "backend/build",
    ]
    
    print("[v0] Starting project cleanup...")
    
    for dir_name in dirs_to_remove:
        dir_path = os.path.join(project_path, dir_name)
        
        if os.path.exists(dir_path):
            try:
                print(f"[v0] Removing {dir_name}...")
                shutil.rmtree(dir_path)
                print(f"[v0] Successfully removed {dir_name}")
            except Exception as e:
                print(f"[v0] Error removing {dir_name}: {str(e)}")
        else:
            print(f"[v0] Directory not found: {dir_name}")
    
    print("[v0] Cleanup completed successfully!")
    print("[v0] Project is now ready for download with only source code and config files.")

if __name__ == "__main__":
    cleanup_project()
