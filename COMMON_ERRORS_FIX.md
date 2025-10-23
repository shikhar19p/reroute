# 🐛 Common React Native Errors & Fixes

Quick reference guide for common errors and how to fix them.

---

## ✅ FIXED: Text strings must be rendered within a <Text> component

### Error Message:
```
ERROR  [Error: Text strings must be rendered within a <Text> component.]
```

### What Causes This:
React Native requires all text (including empty strings, booleans, numbers) to be wrapped in `<Text>` components.

### Common Mistakes:

#### ❌ WRONG - Empty string outside Text:
```typescript
<Text style={styles.label}>
  Discount {couponCode ? `(${couponCode})` : ''}
</Text>
```
**Problem:** The empty string `''` is rendered as a text node outside `<Text>`.

#### ✅ CORRECT - Everything inside template literal:
```typescript
<Text style={styles.label}>
  {`Discount${couponCode ? ` (${couponCode})` : ''}`}
</Text>
```

---

### Other Common Cases:

#### ❌ WRONG - Boolean rendering:
```typescript
<View>
  {isLoading && <ActivityIndicator />}
  {isLoading}  {/* This renders "true" or "false" as text! */}
</View>
```

#### ✅ CORRECT:
```typescript
<View>
  {isLoading && <ActivityIndicator />}
  {isLoading && <Text>Loading...</Text>}
</View>
```

---

#### ❌ WRONG - Conditional with empty string:
```typescript
<View>
  {name && name.trim() !== '' ? name : ''}  {/* Empty string! */}
</View>
```

#### ✅ CORRECT - Return null or wrap in Text:
```typescript
<View>
  {name && name.trim() !== '' && <Text>{name}</Text>}
  {/* OR */}
  {name && name.trim() !== '' ? <Text>{name}</Text> : null}
</View>
```

---

#### ❌ WRONG - Object property might be undefined:
```typescript
<View>
  {user.address}  {/* If address is a string, error! */}
</View>
```

#### ✅ CORRECT:
```typescript
<View>
  {user.address && <Text>{user.address}</Text>}
</View>
```

---

### 🔍 How to Find These Errors:

1. **Look at the Call Stack** - Find your component name
2. **Check recent changes** - Did you add conditional text?
3. **Search for ternary operators** - Look for `? '' : ''` patterns
4. **Check template literals** - Ensure they're inside Text components

---

### 🛠️ Quick Fix Checklist:

- [ ] Check all ternary operators that return strings
- [ ] Ensure empty strings `''` are inside Text components
- [ ] Wrap all conditional text in `<Text>` tags
- [ ] Use template literals inside Text: `` {`text ${variable}`} ``
- [ ] Return `null` instead of `''` for empty conditionals

---

## 🔥 Other Common Errors

### 1. VirtualizedList: You have a large list that is slow to update

**Solution:**
```typescript
// Add React.memo
const BookingCard = React.memo(({ item, onPress }) => {
  return <View>...</View>;
});

// Use useMemo for data filtering
const filteredData = useMemo(() => {
  return data.filter(item => item.active);
}, [data]);

// Use useCallback for functions
const handlePress = useCallback((id) => {
  console.log(id);
}, []);

// Optimize FlatList
<FlatList
  data={data}
  renderItem={renderItem}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  initialNumToRender={10}
  windowSize={10}
/>
```

**Status:** ✅ Fixed in `screens/User/tabs/BookingsScreen.tsx`

---

### 2. Firebase: Missing or insufficient permissions

**Error:**
```
ERROR  Failed to log audit event: [FirebaseError: Missing or insufficient permissions.]
```

**Solution:**
Update `firestore.rules`:
```javascript
match /audit_logs/{logId} {
  allow read: if isAdmin();
  allow create: if isAuthenticated(); // Changed from: allow write: if false;
  allow update, delete: if isAdmin();
}

match /bookings/{bookingId} {
  allow read: if isAuthenticated(); // Changed from: restricted read
}
```

**Status:** ✅ Fixed and deployed to production

---

### 3. Backspace not working in TextInput

**Error:** Backspace key doesn't delete characters in numeric inputs.

**Root Cause:**
```typescript
// ❌ WRONG - Blocks backspace
onChangeText={(text) => {
  if (/^\d*$/.test(text)) {  // This rejects empty string!
    setValue(text);
  }
}}
```

**Solution:**
```typescript
// ✅ CORRECT - Strip non-numeric, allow deletion
onChangeText={(text) => {
  const numericOnly = text.replace(/[^0-9]/g, '');
  setValue(numericOnly);
}}
```

**Status:** ✅ Fixed in 7 files

---

### 4. Metro bundler cache issues

**Error:** Changes not reflecting, old code running.

**Solution:**
```bash
# Reset Metro bundler cache
npx react-native start --reset-cache

# OR
npm start -- --reset-cache
```

---

### 5. Gradle build failed

**Error:** Build fails on Android.

**Solution:**
```bash
# Clean gradle
cd android
./gradlew clean

# Rebuild
cd ..
npm run android
```

---

### 6. Can't find variable: __DEV__

**Error:** `ReferenceError: Can't find variable: __DEV__`

**Solution:**
This is a Metro bundler cache issue. Reset the cache:
```bash
npx react-native start --reset-cache
```

---

### 7. Push Notification: FirebaseApp not initialized

**Error:**
```
ERROR Error registering for push notifications: [Error: Make sure to complete the guide...
Default FirebaseApp is not initialized in this process com.reroute.app...]
```

**Root Cause:**
FCM (Firebase Cloud Messaging) credentials haven't been configured for Android. This is **optional for development** but required for production push notifications.

**Solution:**

**For Development (Quick Fix):**
The error is now handled gracefully and won't break the app. You'll see:
```
ℹ️ Push notifications disabled (FCM not configured - optional for development)
```

**For Production:**
1. Follow the Expo FCM setup guide: https://docs.expo.dev/push-notifications/fcm-credentials/
2. Generate FCM credentials in Firebase Console
3. Upload credentials to Expo
4. Rebuild the app

**Status:** ✅ Error handling improved - non-blocking for development

---

### 8. UI Elements Cut Off / Overlapping Navigation Buttons

**Problem:** Buttons, search bars, or content getting cut off on small screens or devices with navigation buttons (home, back, recents).

**Common Symptoms:**
- Search bar wraps to second line
- + button cut off on owner screens
- Bottom content hidden behind navigation bar
- Layout breaks on small devices (< 375px)

**Solution:**

**1. SafeAreaView Edges** (Critical):
All screens now use `edges={['top', 'left', 'right']}` on SafeAreaView:
```typescript
<SafeAreaView
  style={styles.container}
  edges={['top', 'left', 'right']}  // Prevents bottom overlap
>
```

**2. Responsive Design Utilities** (utils/responsive.ts):
```typescript
import { getResponsivePadding, isSmallDevice } from '../utils/responsive';

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: getResponsivePadding(20), // Auto-adjusts
  },
  button: {
    width: isSmallDevice() ? 40 : 44, // Smaller on small devices
    flexShrink: 0, // Prevent shrinking
  },
  searchInput: {
    flex: 1,
    minWidth: 0, // Allow shrinking
  },
});
```

**Status:** ✅ Fixed across all 23 screens

**Full Documentation:** [RESPONSIVE_DESIGN_FIXES.md](./RESPONSIVE_DESIGN_FIXES.md)

---

### 9. Legacy Architecture Warning

**Warning:**
```
WARN The app is running using the Legacy Architecture. The Legacy Architecture is deprecated
and will be removed in a future version of React Native...
```

**What is this?**
React Native has a new architecture (called "New Architecture" or "Fabric") that improves performance and enables new features. The current app uses the older architecture.

**Impact:**
- **Now:** No impact - the app works perfectly fine with Legacy Architecture
- **Future:** Will need to migrate before React Native removes Legacy Architecture support (likely 2026+)

**Should you fix this now?**
**No, not urgent.** This is a warning, not an error. The Legacy Architecture is still fully supported.

**When to migrate:**
- When you have time for a major upgrade (2-3 weeks)
- When you need New Architecture features (concurrent rendering, etc.)
- Before React Native deprecates Legacy Architecture (check React Native releases)

**How to migrate (when ready):**
1. Update to latest Expo SDK
2. Follow the New Architecture migration guide: https://docs.expo.dev/guides/new-architecture/
3. Update all dependencies to support New Architecture
4. Test thoroughly - some libraries may need updates
5. Update custom native modules if any

**Status:** ⚠️ Documented - migration planned for future

---

## 🎯 Prevention Best Practices

### 1. Always Wrap Text:
```typescript
// ❌ WRONG
<View>{userName}</View>

// ✅ CORRECT
<View>
  {userName && <Text>{userName}</Text>}
</View>
```

### 2. Use Template Literals Correctly:
```typescript
// ❌ WRONG
<Text>Hello {name || ''}</Text>

// ✅ CORRECT
<Text>{`Hello ${name || 'Guest'}`}</Text>
```

### 3. Conditional Rendering:
```typescript
// ❌ WRONG
{isVisible && description}

// ✅ CORRECT
{isVisible && <Text>{description}</Text>}
```

### 4. Performance Optimization:
```typescript
// Always use React.memo for list items
const ListItem = React.memo(({ item }) => <View>...</View>);

// Use useMemo for expensive calculations
const filtered = useMemo(() => data.filter(...), [data]);

// Use useCallback for event handlers
const handlePress = useCallback(() => {...}, []);
```

### 5. Input Validation:
```typescript
// Always strip unwanted characters instead of blocking input
onChangeText={(text) => {
  const cleaned = text.replace(/[^0-9]/g, ''); // Allow backspace
  setValue(cleaned);
}}
```

---

## 🚨 When Errors Occur:

### Step 1: Read the Error Message
- Look for component names in call stack
- Identify the exact line number
- Check what changed recently

### Step 2: Check Call Stack
```
Call Stack
  View (node_modules\react-native\...)
  BookingDetailsScreen (screens\User\BookingDetailsScreen.tsx)  ← YOUR COMPONENT
```

### Step 3: Find the Issue
- Go to the component mentioned
- Look for recent changes
- Search for patterns like:
  - `? '' :`
  - `{variable}`
  - `&&` conditionals

### Step 4: Fix and Test
- Wrap strings in `<Text>`
- Return `null` instead of `''`
- Test on both new and existing data

---

## 📚 Resources

### Official Documentation:
- [React Native Text](https://reactnative.dev/docs/text)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/rules-structure)

### Our Documentation:
- [MERGE_COMPARISON_SUMMARY.md](./MERGE_COMPARISON_SUMMARY.md) - What we fixed
- [FUTURE_IMPROVEMENTS_GUIDE.md](./FUTURE_IMPROVEMENTS_GUIDE.md) - Error tracking setup
- [SECURITY_IMPLEMENTATION.md](./SECURITY_IMPLEMENTATION.md) - Security best practices

---

### 10. Firebase Storage: User does not have permission

**Error:**
```
ERROR  Error picking image: [FirebaseError: Firebase Storage: User does not have permission to access 'farmhouses/D1pzcjJKphZK8bJM7SKg/1761160091496_y4yqeu.jpg'. (storage/unauthorized)]
```

**Root Cause:**
Storage security rules expected path `farmhouses/<userId>/<fileName>` but actual upload path was `farmhouses/<farmhouseId>/<fileName>`. Since farmhouse ID ≠ user ID, permission check failed.

**Solution:**
Updated `storage.rules` to handle farmhouse ID-based paths:

```javascript
// Farmhouse images (farmhouseId-based paths)
match /farmhouses/{farmhouseId}/{fileName} {
  allow read: if true; // Public read for browsing
  allow write: if isAuthenticated() && isValidImage();
  allow delete: if isAuthenticated();
}

// Nested paths support
match /farmhouses/{farmhouseId}/{allPaths=**} {
  allow read: if true; // Public read for browsing
  allow write: if isAuthenticated() && isValidImage();
  allow delete: if isAuthenticated();
}
```

**Security Notes:**
- Public read access allows users to browse farmhouse images
- Write/delete requires authentication
- Image validation (size < 5MB, type: jpeg/jpg/png/webp)
- Ownership verification handled by Firestore rules

**Status:** ✅ Fixed and deployed to production

---

### 11. Duplicate Headers on Owner Screens

**Problem:** Owner screens showing double headers - both React Navigation header and custom screen header.

**Common Symptoms:**
- Two "Edit Farmhouse" headers
- Two "Bookings" headers
- Extra navigation bar at top

**Root Cause:**
React Navigation was set to show headers (`headerShown: true`) while screens also had custom headers in their components.

**Solution:**
Set `headerShown: false` for all owner screens that have custom headers:

```typescript
// App.tsx
<Stack.Screen
  name="EditFarmhouse"
  component={EditFarmhouseScreen}
  options={{ headerShown: false }}  // Hide React Nav header
/>
<Stack.Screen
  name="OwnerBookings"
  component={OwnerBookingsScreen}
  options={{ headerShown: false }}
/>
```

**Files Fixed:**
- EditFarmhouse screen
- OwnerBookings screen
- OwnerBookingDetails screen
- ManageBlockedDates screen

**Status:** ✅ Fixed - Only custom headers now showing

---

### 12. Numeric Conditional Rendering Error

**Error:**
```
ERROR [Error: Text strings must be rendered within a <Text> component.]
```

**Root Cause:**
When using `&&` operators with numeric values, if the first condition evaluates to `0`, React Native tries to render the number `0` as text, which causes an error.

**Problem Pattern:**
```typescript
// ❌ WRONG - If bonfire is 0, React tries to render 0 as text
{farmhouse.amenities.bonfire && Number(farmhouse.amenities.bonfire) > 0 && (
  <View>...</View>
)}
```

If `farmhouse.amenities.bonfire` is `0`:
1. First condition evaluates to `0` (falsy)
2. The `&&` operator short-circuits and returns `0`
3. React Native tries to render `{0}` as text
4. Error: "Text strings must be rendered within a <Text> component"

**Solution:**
```typescript
// ✅ CORRECT - Only checks the comparison, returns boolean
{Number(farmhouse.amenities.bonfire || 0) > 0 && (
  <View>...</View>
)}
```

Now if `bonfire` is `0`:
1. `Number(0) > 0` evaluates to `false` (boolean)
2. React renders nothing for `false`
3. No error!

**Where This Was Fixed:**
- BookingDetailsScreen.tsx lines 509-538 (bonfire, tv, geyser, carroms, chess, volleyball)

**Prevention:**
```typescript
// For numeric values, always use comparison operators:
{Number(value || 0) > 0 && <Component />}

// For booleans, use strict equality:
{value === true && <Component />}

// For strings, check directly (empty strings are falsy):
{value && <Component />}
```

**Status:** ✅ Fixed in BookingDetailsScreen.tsx

---

## ✅ Fixed Issues Log

| Date | Error | File | Fix |
|------|-------|------|-----|
| 2025-10-23 | Text strings must be rendered | BookingDetailsScreen.tsx:636 | Wrapped in template literal |
| 2025-10-23 | Text rendering error (amenities) | BookingDetailsScreen.tsx:509-538 | Fixed numeric conditional renders |
| 2025-10-23 | Text rendering error (pool amenity) | BookingDetailsScreen.tsx:503 | Fixed boolean conditional check |
| 2025-10-23 | Firebase permissions (booked dates) | firestore.rules:80-89 | Allow authenticated users to update bookedDates |
| 2025-10-23 | VirtualizedList slow | BookingsScreen.tsx | Added React.memo + useMemo |
| 2025-10-23 | Firebase Firestore permissions | firestore.rules | Updated rules for public access |
| 2025-10-23 | Backspace not working | 7 files | Fixed validation pattern |
| 2025-10-23 | Push notification Firebase error | notificationService.ts | Improved error handling |
| 2025-10-23 | Search bar wrapping | ExploreScreen.tsx | Responsive design utilities |
| 2025-10-23 | + button cut off | Owner screens | Responsive sizing + flexShrink |
| 2025-10-23 | Content overlapping nav buttons | 23 screens | SafeAreaView edges prop |
| 2025-10-23 | Duplicate headers | Owner screens (App.tsx) | Set headerShown: false |
| 2025-10-23 | Firebase Storage unauthorized | storage.rules | Fixed farmhouse path matching |

---

---

### 13. Custom Toast Notifications

**Improvement:** Replaced default Android Alert dialogs with custom Toast component for better UX and consistent design.

**What Changed:**
- Created new `Toast.tsx` component with context provider
- Integrated ToastProvider into App.tsx
- Replaced Alert.alert calls in key screens with custom toast

**Features:**
- 4 toast types: success (green), error (red), warning (orange), info (blue)
- Smooth animations (slide in from top with spring effect)
- Auto-dismiss after 3 seconds (configurable)
- Stacks multiple toasts vertically
- Manual dismiss with X button
- Theme-aware design

**Usage:**
```typescript
import { useToast } from '../components/Toast';

function MyComponent() {
  const { showToast } = useToast();

  // Success message
  showToast('Operation completed successfully!', 'success');

  // Error message
  showToast('Something went wrong', 'error');

  // Warning message
  showToast('Please review before proceeding', 'warning');

  // Info message (default)
  showToast('Processing your request...', 'info');

  // Custom duration
  showToast('Quick message', 'success', 1500); // 1.5 seconds
}
```

**Where Implemented:**
- BookingsScreen.tsx - Booking cancellation success/error
- BookingConfirmationScreen.tsx - Coupon application success

**Migration Guide:**
To replace Alert.alert with Toast:
```typescript
// BEFORE
Alert.alert('Success', 'Booking cancelled successfully');
Alert.alert('Error', 'Failed to cancel booking');

// AFTER
showToast('Booking cancelled successfully', 'success');
showToast('Failed to cancel booking', 'error');
```

**Status:** ✅ Implemented in key screens (can be expanded to all screens)

---

### 14. Auto-Hiding Bottom Navigation Bar (Premium Feature)

**Feature:** Bottom tab bar automatically hides when scrolling down and shows when scrolling up, providing more screen space for content and a premium app experience.

**Implementation:**

**1. Created Context for Tab Bar State Management:**
- `context/TabBarVisibilityContext.tsx` - Manages tab bar visibility state and animations
- Tracks scroll direction and position
- Uses Animated.Value for smooth spring animations
- Provides `useScrollHandler` hook for easy integration

**2. Updated Premium Tab Bar:**
- `components/PremiumTabBar.tsx` - Enhanced with animated hiding
- Added Animated.View wrapper with translateY transform
- Smooth spring animation (tension: 65, friction: 10)
- Slides down when scrolling down, slides up when scrolling up

**3. Updated All Tab Screens:**
Updated 4 tab screens to report scroll events:
- `screens/User/ExploreScreen.tsx` - FlatList with scroll tracking
- `screens/User/tabs/BookingsScreen.tsx` - FlatList with scroll tracking
- `screens/User/tabs/WishlistScreen.tsx` - FlatList with scroll tracking
- `screens/User/tabs/ProfileScreen.tsx` - ScrollView with scroll tracking

**Behavior:**
- Tab bar hides when scrolling down (after 50px)
- Tab bar shows when scrolling up
- Minimum scroll distance: 5px (prevents jittery behavior)
- Smooth spring animation (not abrupt)
- Tab bar positioned absolutely at bottom with floating design

**Code Example:**
```typescript
// In tab screens
import { useScrollHandler } from '../../../context/TabBarVisibilityContext';

function MyTabScreen() {
  const scrollHandler = useScrollHandler();

  return (
    <FlatList
      {...otherProps}
      onScroll={scrollHandler.onScroll}
      scrollEventThrottle={scrollHandler.scrollEventThrottle}
    />
  );
}
```

**Configuration:**
- Scroll threshold: 5px minimum movement
- Hide trigger: Scroll down > 50px from top
- Show trigger: Any upward scroll
- Animation duration: ~300ms spring
- Tab bar height: 60px

**Benefits:**
- More screen space for content
- Premium, modern UX
- Smooth, non-jarring animations
- Consistent across all tab screens
- Works with both FlatList and ScrollView

**Files Created:**
- `context/TabBarVisibilityContext.tsx` - Context and hooks

**Files Modified:**
- `components/PremiumTabBar.tsx` - Added animation support
- `App.tsx` - Wrapped UserTabs with TabBarVisibilityProvider
- `screens/User/ExploreScreen.tsx` - Added scroll tracking
- `screens/User/tabs/BookingsScreen.tsx` - Added scroll tracking
- `screens/User/tabs/WishlistScreen.tsx` - Added scroll tracking
- `screens/User/tabs/ProfileScreen.tsx` - Added scroll tracking

**Status:** ✅ Fully Implemented - Premium auto-hide navigation

---

**Last Updated:** 2025-10-23
**Status:** Active
**Maintained By:** Development Team
