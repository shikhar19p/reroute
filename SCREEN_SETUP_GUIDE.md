# Reroute App - Main Screens Setup Guide

## ✅ Completed Tasks

I've successfully updated your three main onboarding screens:

### 1. **WelcomeScreen.tsx** (Screen 1)
- Beautiful farmhouse background with pool
- "WELCOME TO REROUTE" and "PREMIER ESCAPES" text
- "Find your perfect retreat" tagline
- "Explore Unique Stays" golden button
- "Already have an account? Sign in" link

### 2. **LoginScreen.tsx** (Screen 2)
- Golden user icon at top
- "Welcome to Reroute" title
- "Your journey to tranquility begins" subtitle
- Google sign-in button with icon
- "Continue with email" option
- "Don't have an account? Sign up" link
- Back button

### 3. **RoleSelectionScreen.tsx** (Screen 3)
- Golden user icon with question mark badge
- "How you want to use Reroute?" title
- Two bordered cards:
  - **User** - with compass icon
  - **Become a Host** - with home icon
- Back button

## 📸 Adding the Background Image

### Option 1: Download from Free Stock Sites

**Recommended Sites:**
1. **Unsplash** - https://unsplash.com/s/photos/luxury-villa-pool-sunset
2. **Pexels** - https://www.pexels.com/search/farmhouse%20pool/
3. **Pixabay** - https://pixabay.com/images/search/villa%20pool%20sunset/

**Search Terms to Use:**
- "luxury villa pool sunset"
- "farmhouse pool countryside"
- "Tuscan villa infinity pool"
- "Mediterranean villa sunset"

### Option 2: Use AI Image Generation

You can use:
- **Leonardo.ai** - Free tier available
- **Midjourney** - If you have access
- **DALL-E** - Through ChatGPT Plus

**Prompt to use:**
```
"Luxury Tuscan farmhouse villa with infinity pool at golden hour sunset, 
rolling vineyard hills, countryside landscape, professional photography, 
serene peaceful atmosphere, high quality"
```

## 🔧 Installation Steps

### Step 1: Add the Background Image

1. Download a suitable image (recommended size: 1920x1080 or higher)
2. Rename it to `farmhouse-bg.jpg`
3. Place it in: `C:\Users\shikhar pulluri\Desktop\reroute\assets\farmhouse-bg.jpg`

### Step 2: Verify File Location

Make sure your file structure looks like this:
```
reroute/
├── assets/
│   ├── farmhouse-bg.jpg  ← Add this file
│   ├── icon.png
│   ├── splash-icon.png
│   └── ...
└── screens/
    ├── WelcomeScreen.tsx  ← Updated
    ├── LoginScreen.tsx    ← Updated
    └── RoleSelectionScreen.tsx  ← Updated
```

### Step 3: Test the App

1. Open terminal in the reroute directory
2. Run: `npm start` or `expo start`
3. Test on your device/emulator

## 🎨 Color Scheme Used

- **Primary Gold**: `#D4AF37`
- **White**: `#FFFFFF`
- **Black**: `#000000`
- **Light Gray**: `#F5F5F5`
- **Text Gray**: `#666666`
- **Dark Text Gray**: `#999999`

## 🔄 Navigation Flow

```
Welcome Screen → Login Screen → Role Selection → (User Home or Owner Dashboard)
```

## 📱 Screen Features

### WelcomeScreen
- ✅ Full-screen background image
- ✅ Gradient overlay for text readability
- ✅ Golden branding text at top
- ✅ White content card at bottom
- ✅ Call-to-action button
- ✅ Sign-in link

### LoginScreen
- ✅ Clean minimal design
- ✅ Google authentication ready
- ✅ Email option placeholder
- ✅ Sign-up link
- ✅ Back navigation

### RoleSelectionScreen
- ✅ User role selection
- ✅ Host role selection
- ✅ Loading states
- ✅ Firebase integration
- ✅ Local storage fallback

## 🛠️ Troubleshooting

### If image doesn't show:
1. Check file path: `require('../assets/farmhouse-bg.jpg')`
2. Verify file exists in assets folder
3. Try clearing Metro bundler cache: `expo start -c`
4. Ensure image format is .jpg or .png

### If Google Sign-In doesn't work:
1. Check `useGoogleAuth.ts` configuration
2. Verify Firebase config in `firebaseConfig.ts`
3. Ensure Google Sign-In is enabled in Firebase Console

### If role selection doesn't save:
1. Check Firebase Firestore rules
2. Verify user authentication state
3. Check console logs for errors

## 📝 Next Steps

1. **Add the background image** to assets folder
2. **Test the screens** on your device
3. **Customize colors** if needed (in StyleSheet)
4. **Configure Firebase** authentication
5. **Test user flow** end-to-end

## 💡 Optional Enhancements

- Add loading animations
- Add screen transitions
- Add form validation for email login
- Add "Remember me" functionality
- Add biometric authentication
- Add dark mode support

## 🎯 Key Differences from Original Screens

Your original screens had:
- Gradient backgrounds with decorative circles
- Glass-morphism effects
- Different color scheme (teal/green)

New screens have:
- Photo background (Screen 1)
- Minimal clean design (Screens 2 & 3)
- Gold accent color (#D4AF37)
- Simpler, more elegant UI

---

**Need help?** Check the console logs or reach out for support!

Happy coding! 🚀
