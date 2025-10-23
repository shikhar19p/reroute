#!/bin/bash

# List of files to update (excluding already fixed ones)
files=(
  "User/tabs/BookingsScreen.tsx"
  "User/tabs/WishlistScreen.tsx"
  "User/tabs/ProfileScreen.tsx"
  "User/FarmhouseDetailScreen.tsx"
  "User/EditProfileScreen.tsx"
  "User/BookingConfirmationScreen.tsx"
  "User/AllAmenitiesScreen.tsx"
  "User/AllReviewsScreen.tsx"
  "Owner/EditFarmhouseScreen.tsx"
  "Owner/FarmhouseDetailOwnerScreen.tsx"
  "Owner/ManageBlockedDatesScreen.tsx"
  "Owner/BookingDetailScreen.tsx"
  "Owner/BookingsListScreen.tsx"
  "FarmRegistration/BasicDetailsScreen.tsx"
  "FarmRegistration/PricesScreen.tsx"
  "FarmRegistration/PhotosScreen.tsx"
  "FarmRegistration/AmenitiesGamesScreen.tsx"
  "FarmRegistration/RulesRestrictionsScreen.tsx"
  "FarmRegistration/KycScreen.tsx"
)

# Update each file
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Updating $file..."
    # Use sed to add edges prop to SafeAreaView (Windows-compatible)
    sed -i "s/<SafeAreaView style=\([^>]*\)>/<SafeAreaView style=\1 edges={['top', 'left', 'right']}>/" "$file"
  fi
done

echo "Done updating all files!"
