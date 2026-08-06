#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const androidDir = path.join(root, 'android');
const androidAppDir = path.join(androidDir, 'app');
const targetGS = path.join(androidAppDir, 'google-services.json');

const isStaging = process.env.FIREBASE_PROJECT_ID === 'reroute-aventures-dev';
const label = isStaging ? 'staging' : 'prod';
const expectedPkg = isStaging ? 'com.rerouteaventures.app.dev' : 'com.rerouteaventures.app';
const sourceGS = path.join(root, isStaging ? 'google-services.staging.json' : 'google-services.json');

if (!fs.existsSync(sourceGS)) {
  console.error(`Missing ${path.basename(sourceGS)} in project root.`);
  process.exit(1);
}

let needsPrebuild = false;

if (!fs.existsSync(androidDir)) {
  needsPrebuild = true;
} else {
  const buildGradle = fs.readFileSync(path.join(androidAppDir, 'build.gradle'), 'utf8');
  const match = buildGradle.match(/applicationId\s+'([^']+)'/);
  if (match && match[1] !== expectedPkg) {
    console.log(`android/ has package '${match[1]}' but need '${expectedPkg}' for ${label}. Rebuilding...`);
    fs.rmSync(androidDir, { recursive: true, force: true });
    needsPrebuild = true;
  }
}

if (needsPrebuild) {
  console.log(`Running expo prebuild for ${label}...`);
  execSync('npx expo prebuild --platform android', { cwd: root, stdio: 'inherit' });
}

fs.copyFileSync(sourceGS, targetGS);
console.log(`Copied ${path.basename(sourceGS)} -> android/app/google-services.json (${label})`);
