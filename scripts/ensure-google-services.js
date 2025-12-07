#!/usr/bin/env node

/**
 * This script ensures google-services.json exists in android/app/
 * Run this before building to prevent Firebase authentication issues
 */

const fs = require('fs');
const path = require('path');

const ROOT_GOOGLE_SERVICES = path.join(__dirname, '..', 'google-services.json');
const ANDROID_GOOGLE_SERVICES = path.join(__dirname, '..', 'android', 'app', 'google-services.json');

console.log('🔍 Checking google-services.json...');

// Check if source file exists
if (!fs.existsSync(ROOT_GOOGLE_SERVICES)) {
  console.error('❌ ERROR: google-services.json not found in project root!');
  console.error('📥 Please download it from Firebase Console and place it in the project root.');
  process.exit(1);
}

// Ensure android/app directory exists
const androidAppDir = path.dirname(ANDROID_GOOGLE_SERVICES);
if (!fs.existsSync(androidAppDir)) {
  console.log('📁 Creating android/app directory...');
  fs.mkdirSync(androidAppDir, { recursive: true });
}

// Copy the file
try {
  fs.copyFileSync(ROOT_GOOGLE_SERVICES, ANDROID_GOOGLE_SERVICES);
  console.log('✅ google-services.json copied to android/app/');

  // Verify package name
  const content = JSON.parse(fs.readFileSync(ANDROID_GOOGLE_SERVICES, 'utf8'));
  const clients = content.client || [];
  const packageNames = clients
    .map(c => c.client_info?.android_client_info?.package_name)
    .filter(Boolean);

  console.log('📦 Package names in google-services.json:', packageNames.join(', '));

  if (packageNames.includes('com.reroute.app')) {
    console.log('✅ com.reroute.app configuration found!');
  } else {
    console.warn('⚠️  WARNING: com.reroute.app not found in google-services.json');
  }

} catch (error) {
  console.error('❌ ERROR copying google-services.json:', error.message);
  process.exit(1);
}

console.log('✨ Ready to build!\n');
