# ReRoute App Icon Design Specification

## Quick Start - Use IconKitchen (Recommended)
1. Go to **https://icon.kitchen**
2. Use these specifications below
3. Download all sizes (1024x1024, adaptive icon, etc.)
4. Replace files in `assets/` folder

---

## Design Requirements

### Brand Colors (Use these exact colors)
```
Primary Gradient:
- Start: #0D9488 (Deep Teal)
- End: #059669 (Emerald Green)

Accent:
- #F59E0B (Warm Gold/Orange)
```

### Icon Elements
**Main Icon:** Stylized farmhouse or countryside scene
- Option 1: Simple farmhouse silhouette with roof
- Option 2: Mountain/hill with palm tree
- Option 3: Countryside landscape (current style but simplified)

**Style:**
- Minimalist and modern
- Clean geometric shapes
- Bold and recognizable at small sizes
- White or cream colored icon on gradient background

### Layout
```
┌─────────────────────────┐
│                         │
│   [Gradient Background] │
│         Teal → Green    │
│                         │
│      [White Icon]       │
│    Farmhouse/Landscape  │
│                         │
│                         │
└─────────────────────────┘
```

**Important:**
- NO white borders/padding
- NO beige background
- Fill entire square edge-to-edge
- Gradient should cover 100% of icon
- Icon/symbol should be centered and white

---

## IconKitchen Settings

### Step-by-step for IconKitchen:

1. **Background:**
   - Type: Gradient
   - Color 1: #0D9488
   - Color 2: #059669
   - Angle: 135° (diagonal)
   - Fill: 100% (no padding)

2. **Foreground:**
   - Choose: "Custom icon" or use emoji/symbol
   - If custom: Upload simple farmhouse SVG or use built-in shapes
   - Color: White (#FFFFFF)
   - Size: 60-70% of canvas
   - Position: Center

3. **Shape:**
   - Android Adaptive: Enabled
   - Mask: None (or squircle for iOS)
   - Padding: 0%

4. **Export:**
   - Format: PNG
   - Sizes: All (1024x1024, 512x512, etc.)
   - Adaptive icon: Yes (for Android)

---

## Alternative: Canva (If you prefer)

1. Go to **canva.com**
2. Create custom size: 1024x1024
3. Add gradient background:
   - Color stops: #0D9488 → #059669
4. Add white farmhouse icon/shape
5. Remove all padding
6. Download as PNG (highest quality)

---

## Files to Replace

After creating your icon:

```
assets/
  ├── icon.png (1024x1024) - Main app icon
  ├── adaptive-icon.png (1024x1024) - Android adaptive
  ├── splash-icon.png (1024x1024) - Splash screen
  └── favicon.png (48x48) - Web favicon
```

---

## Quick Icon Ideas (Copy to IconKitchen)

### Option 1: Farmhouse
```
Simple house shape:
  🏠 (but styled minimalist)
  Or use these elements:
  - Rectangle body
  - Triangle roof
  - Small chimney
```

### Option 2: Countryside
```
Use your current design elements:
  - Palm trees (simplified to 2-3 triangles)
  - Mountain (single triangle)
  - Sun (circle with rays)
  - Golden wave (curved line)
```

### Option 3: Letter R
```
Bold "R" or "RR":
  - Custom font
  - White on gradient
  - Modern, geometric style
```

---

## What Makes It Premium?

✅ Edge-to-edge design (no padding/borders)
✅ Professional gradient (not flat color)
✅ Clean, simple iconography
✅ High contrast (white on colored background)
✅ Recognizable at all sizes
✅ Matches app color scheme
✅ Modern, not dated

❌ No white/beige backgrounds
❌ No borders or frames
❌ Not too detailed/complex
❌ Not generic stock icons

---

## Testing Your Icon

After creating:
1. View at small size (48x48) - should still be clear
2. Check on dark background - should stand out
3. Check on light background - should stand out
4. Compare with other premium apps

---

## Current vs Desired

**Current Icon Issues:**
- Beige/cream background (not premium)
- Too much white space/padding
- Doesn't match app's teal/green theme

**Desired Premium Icon:**
- Teal-to-green gradient background
- No borders, fills entire square
- White simple icon in center
- Modern and clean

---

## Next Steps

1. **Quick Option:** Go to icon.kitchen
2. **Upload background gradient** (#0D9488 to #059669)
3. **Choose simple white icon** (farmhouse, palm tree, or "R")
4. **Download all sizes**
5. **Replace in assets folder:**
   ```bash
   # Backup old icons first
   cd "C:\Users\shikhar pulluri\Desktop\reroute\assets"
   mkdir backup
   copy *.png backup\

   # Then replace with new icons from IconKitchen download
   ```
6. **App will auto-update** when you rebuild

---

Need help? I can:
- Generate a simple SVG icon for you
- Modify app.json settings
- Create a temporary solution while you design

**Estimated time:** 10-15 minutes with IconKitchen
