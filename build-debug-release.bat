@echo off
echo ========================================
echo Building Debug Release APK
echo ========================================
echo.

echo Step 1: Ensuring google-services.json is in place...
node scripts\ensure-google-services.js
if errorlevel 1 (
    echo ERROR: Failed to copy google-services.json
    exit /b 1
)
echo.

echo Step 2: Cleaning previous build...
cd android
call gradlew.bat clean
if errorlevel 1 (
    echo ERROR: Clean failed
    cd ..
    exit /b 1
)
cd ..
echo.

echo Step 3: Building release APK with debugging enabled...
cd android
call gradlew.bat assembleRelease --stacktrace --info
if errorlevel 1 (
    echo ERROR: Build failed
    cd ..
    exit /b 1
)
cd ..
echo.

echo ========================================
echo Build completed successfully!
echo ========================================
echo.
echo APK Location: android\app\build\outputs\apk\release\app-release.apk
echo.
echo To install: adb install -r android\app\build\outputs\apk\release\app-release.apk
echo To view logs: adb logcat *:E
echo.
pause
