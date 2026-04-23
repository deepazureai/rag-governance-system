@echo off
REM Data Polling Service - Windows Service Wrapper
REM Usage: 
REM   polling-service.bat install   - Install as Windows service
REM   polling-service.bat uninstall - Remove Windows service
REM   polling-service.bat start     - Start the service
REM   polling-service.bat stop      - Stop the service

setlocal enabledelayedexpansion

if "%1"=="" (
    echo Usage: polling-service.bat [install^|uninstall^|start^|stop^|restart]
    exit /b 1
)

set SERVICE_NAME=DataPollingService
set SERVICE_DISPLAY_NAME=Data Polling Service
set NODE_PATH=%cd%\node_modules\.bin
set SERVICE_PATH=%cd%\dist\src\index.js

if "%1"=="install" (
    echo Installing %SERVICE_DISPLAY_NAME%...
    sc create %SERVICE_NAME% binPath= "node.exe %SERVICE_PATH%" start= delayed-auto
    echo Service installed successfully
    exit /b 0
)

if "%1"=="uninstall" (
    echo Uninstalling %SERVICE_DISPLAY_NAME%...
    net stop %SERVICE_NAME% 2>nul
    sc delete %SERVICE_NAME%
    echo Service uninstalled successfully
    exit /b 0
)

if "%1"=="start" (
    echo Starting %SERVICE_DISPLAY_NAME%...
    net start %SERVICE_NAME%
    exit /b 0
)

if "%1"=="stop" (
    echo Stopping %SERVICE_DISPLAY_NAME%...
    net stop %SERVICE_NAME%
    exit /b 0
)

if "%1"=="restart" (
    echo Restarting %SERVICE_DISPLAY_NAME%...
    net stop %SERVICE_NAME% 2>nul
    timeout /t 2 /nobreak
    net start %SERVICE_NAME%
    exit /b 0
)

echo Unknown command: %1
exit /b 1
