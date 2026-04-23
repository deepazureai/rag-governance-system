@echo off
REM Source Code Export Script for Windows
REM Creates a clean ZIP file excluding node_modules, build artifacts, and cache files

setlocal enabledelayedexpansion

echo ================================
echo   Source Code Export Script
echo ================================
echo.

REM Check if we're in the project directory
if not exist "package.json" (
    echo Error: package.json not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

REM Check if 7-Zip or WinRAR is installed
where 7z >nul 2>nul
if %ERRORLEVEL% == 0 (
    set ZIPPER=7z
    set ZIPPER_NAME=7-Zip
) else (
    where rar >nul 2>nul
    if !ERRORLEVEL! == 0 (
        set ZIPPER=rar
        set ZIPPER_NAME=WinRAR
    ) else (
        echo Error: Neither 7-Zip nor WinRAR found!
        echo Please install one of these tools:
        echo   - 7-Zip: https://www.7-zip.org/
        echo   - WinRAR: https://www.rarlab.com/
        pause
        exit /b 1
    )
)

echo Using: !ZIPPER_NAME!
echo.
echo Excluding:
echo   - node_modules
echo   - .next
echo   - dist
echo   - build
echo   - coverage
echo   - .git
echo   - .env files
echo   - Log files
echo   - Cache files
echo.

REM Get timestamp
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set ZIP_NAME=project-source_%mydate%_%mytime%.zip

echo Creating ZIP file: !ZIP_NAME!
echo.

REM Create the ZIP file
if "!ZIPPER!"=="7z" (
    7z a -tzip "!ZIP_NAME!" . -xr"!node_modules" -xr".next" -xr"dist" -xr"build" -xr"coverage" -xr".git" -xr".env.local" -xr"*.log" -xr".DS_Store" -xr".turbo" -xr".vercel" -xr".pnpm-store" -x"!project-source*.zip" >nul
) else (
    rar a -r "!ZIP_NAME!" . -x*node_modules* -x*.next* -x*dist* -x*build* -x*coverage* -x*.git* -x*.env.local -x*.log -x*.DS_Store -x*.turbo -x*.vercel -x*.pnpm-store -x*project-source*.zip >nul
)

if %ERRORLEVEL% == 0 (
    echo.
    echo ================================
    echo Export Complete!
    echo ================================
    echo File: !ZIP_NAME!
    echo.
    echo Next steps:
    echo 1. Transfer this ZIP to your local machine
    echo 2. Extract: unzip !ZIP_NAME!
    echo 3. Install: pnpm install
    echo 4. Build: pnpm build
    echo.
    pause
) else (
    echo.
    echo Error: Failed to create ZIP file!
    pause
    exit /b 1
)

endlocal
