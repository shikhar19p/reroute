#!/usr/bin/env node
/**
 * Post-build script for Expo web.
 * Expo Metro (output: single) generates a minimal index.html that ignores web/index.html.
 * This script:
 *   1. Injects SEO meta tags, OG tags, preconnects, theme-color, and splash into dist/index.html
 *   2. Copies static files from web/ to dist/ (robots.txt, etc.)
 */

const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const WEB = path.join(__dirname, '..', 'web');

// --- 1. Copy static files from web/ to dist/ ---
const staticFiles = ['robots.txt', 'sitemap.xml', '_redirects'];
for (const file of staticFiles) {
  const src = path.join(WEB, file);
  const dest = path.join(DIST, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${file} → dist/`);
  }
}

// Copy splash-icon.png to dist/assets/ (not picked up by Expo bundler since only in HTML)
const splashSrc = path.join(__dirname, '..', 'assets', 'splash-icon.png');
const splashDest = path.join(DIST, 'assets', 'splash-icon.png');
if (fs.existsSync(splashSrc)) {
  fs.mkdirSync(path.join(DIST, 'assets'), { recursive: true });
  fs.copyFileSync(splashSrc, splashDest);
  console.log('Copied splash-icon.png → dist/assets/');
}

// --- 2. Patch dist/index.html ---
const indexPath = path.join(DIST, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('dist/index.html not found — run expo export first');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

const META_INJECT = `
  <!-- SEO & Social -->
  <meta name="description" content="Discover and book unique farmhouses and resorts for weekend getaways, day use, and overnight stays across India. ReRoute Aventures — your gateway to rural escapes." />
  <meta name="keywords" content="farmhouse booking, resort booking, weekend getaway India, day use farmhouse, overnight stay, rural escape" />
  <meta name="theme-color" content="#C5A565" />
  <meta name="robots" content="index, follow" />
  <meta name="author" content="ReRoute Aventures" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="ReRoute Aventures" />
  <meta property="og:title" content="ReRoute Aventures — Book Unique Farmhouses & Resorts" />
  <meta property="og:description" content="Discover and book unique farmhouses and resorts for weekend getaways, day use, and overnight stays across India." />
  <meta property="og:url" content="https://reroute-aventures.web.app/" />
  <meta property="og:image" content="https://reroute-aventures.web.app/assets/farmhouse-bg.jpg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="ReRoute Aventures — Book Unique Farmhouses & Resorts" />
  <meta name="twitter:description" content="Discover and book unique farmhouses and resorts for weekend getaways, day use, and overnight stays across India." />
  <meta name="twitter:image" content="https://reroute-aventures.web.app/assets/farmhouse-bg.jpg" />

  <!-- Performance hints -->
  <link rel="preconnect" href="https://firebasestorage.googleapis.com" crossorigin />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="dns-prefetch" href="https://identitytoolkit.googleapis.com" />
  <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
  <link rel="preload" href="/assets/farmhouse-bg.jpg" as="image" />

  <!-- Canonical -->
  <link rel="canonical" href="https://reroute-aventures.web.app/" />`;

const BODY_SPLASH = `
    <!-- Splash: visible before JS loads, removed by App.tsx after auth resolves -->
    <div id="web-splash" style="position:fixed;inset:0;background:#F9F8EF;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;transition:opacity 0.35s ease;">
      <img src="/assets/splash-icon.png" alt="ReRoute Aventures" style="width:96px;height:96px;border-radius:20px;object-fit:cover;" />
      <div style="margin-top:18px;font-family:system-ui,-apple-system,sans-serif;font-size:15px;font-weight:600;letter-spacing:2px;color:#C5A565;text-transform:uppercase;">ReRoute Aventures</div>
    </div>`;

const FOCUS_CSS = `
    <style>
      body { background-color: #F9F8EF; }
      *, *:focus, *:focus-visible { outline: none !important; box-shadow: none !important; -webkit-tap-highlight-color: transparent; }
      input:focus, textarea:focus { outline: none !important; box-shadow: none !important; }
      #web-splash.fade-out { opacity: 0; pointer-events: none; }
    </style>`;

// Inject meta tags after <head>
if (!html.includes('og:title')) {
  html = html.replace('<head>', '<head>' + META_INJECT);
}

// Inject focus CSS and splash before </head>
if (!html.includes('web-splash')) {
  html = html.replace('</head>', FOCUS_CSS + '\n  </head>');
  html = html.replace('<div id="root">', BODY_SPLASH + '\n    <div id="root">');
}

// Ensure scripts are defer (Expo usually does this, but be safe)
html = html.replace(/<script src="([^"]+)"/g, (m, src) => {
  if (m.includes('defer')) return m;
  return `<script src="${src}" defer`;
});

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Patched dist/index.html with SEO meta tags and splash screen');
