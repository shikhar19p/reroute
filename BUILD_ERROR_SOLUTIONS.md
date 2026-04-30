# Android Build Error Solutions

## Error 1: "Cannot invoke method getAbsolutePath() on null object"
**Status:** ✅ FIXED in `android/app/build.gradle`

### Solution Applied:
Added null safety checks for package resolution in build.gradle:
```gradle
def hermesPath = ["node", "--print", "require.resolve('hermes-compiler/package.json', ...)"].execute(null, rootDir).text.trim()
hermesCommand = hermesPath ? new File(hermesPath).getParentFile().getAbsolutePath() + "..." : ""
```

---

## Error 2: "Unable to establish loopback connection"
**Status:** 🔧 NEEDS TROUBLESHOOTING

This is a Gradle daemon networking issue. Try these solutions in order:

### Solution 1: Stop Gradle Daemon (RECOMMENDED)
```bash
cd android
./gradlew --stop
cd ..
npx expo run:android
```

### Solution 2: Clean Gradle Cache
```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

### Solution 3: Clear All Gradle Cache
```bash
# Windows
rmdir /s %USERPROFILE%\.gradle

# Mac/Linux
rm -rf ~/.gradle

cd android
./gradlew clean
cd ..
npx expo run:android
```

### Solution 4: Update gradle.properties
Edit `android/gradle.properties` and ensure these settings:
```properties
# Gradle Daemon settings
org.gradle.jvmargs=-Xmx2048m -XX:MaxPermSize=512m
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.caching=true

# Networking
systemProp.http.proxyHost=
systemProp.http.proxyPort=
systemProp.https.proxyHost=
systemProp.https.proxyPort=
```

### Solution 5: Disable Build Cache
```bash
cd android
./gradlew assembleDebug --no-build-cache
```

### Solution 6: Check Network/Firewall
```bash
# Test localhost connectivity
netstat -ano | findstr :8081
netstat -ano | findstr :8088

# Or use ping
ping localhost
```

---

## Complete Fresh Build Process

If all above fail, do a complete clean rebuild:

```bash
# 1. Stop any running processes
npm start -- --reset-cache

# 2. Clear all caches
cd android
./gradlew clean
cd ..
rm -rf node_modules
npm install --legacy-peer-deps

# 3. Clean Java/Gradle
cd android
./gradlew --stop
rm -rf .gradle
cd ..

# 4. Rebuild
npx expo run:android
```

---

## Testing Without Android

If Android build continues to fail, test your error handling changes on web:

```bash
# Start web dev server
npx expo web

# Or for production build
npx expo build:web
```

The error handling, retry logic, and Sentry integration will work on web too.

---

## Debugging Gradle Issues

For detailed troubleshooting output:

```bash
# Verbose gradle output
npx expo run:android -- --verbose

# With stack trace
npx expo run:android -- --stacktrace

# Full debug info
npx expo run:android -- --debug
```

---

## Check Current Status

```bash
# Check Java installation
java -version
javac -version

# Check Android SDK
echo %ANDROID_HOME%
dir %ANDROID_HOME%\platforms

# Check Gradle version
cd android
./gradlew --version
```

---

## Environment Variables

Ensure these are set correctly (Windows):
```
ANDROID_HOME: C:\Users\shikhar pulluri\AppData\Local\Android\Sdk
JAVA_HOME: C:\Program Files\Java\jdk-xx.x.x
```

Verify:
```bash
echo %ANDROID_HOME%
echo %JAVA_HOME%
```

---

## Final Resort: Update Gradle Wrapper

```bash
cd android
./gradlew wrapper --gradle-version 9.0
cd ..
npx expo run:android
```

---

## Quick Summary of Fixes

| Issue | Solution |
|-------|----------|
| Null pointer on package resolution | ✅ Fixed in build.gradle |
| Loopback connection error | Stop daemon: `./gradlew --stop` |
| Build cache issues | Clear: `rm -rf android/.gradle` |
| Gradle daemon stuck | Kill: `taskkill /F /IM java.exe` (Windows) |
| Network/Firewall blocked | Check with `netstat` or disable VPN |
| JDK version issues | Update Java to latest LTS version |
