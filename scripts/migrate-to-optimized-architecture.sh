#!/bin/bash

# Migration Script for Optimized Architecture
# This script helps migrate from the old architecture to the new optimized one

set -e

echo "🚀 Starting architecture migration..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Backup current files
echo -e "${YELLOW}Step 1: Creating backups...${NC}"
mkdir -p backups
cp App.tsx backups/App.tsx.backup
cp authContext.tsx backups/authContext.tsx.backup
cp GlobalDataContext.tsx backups/GlobalDataContext.tsx.backup
echo -e "${GREEN}✓ Backups created in ./backups/${NC}"
echo ""

# Step 2: Check if optimized files exist
echo -e "${YELLOW}Step 2: Checking for optimized files...${NC}"
if [ ! -f "App.optimized.tsx" ]; then
    echo -e "${RED}✗ App.optimized.tsx not found!${NC}"
    exit 1
fi
if [ ! -d "providers" ]; then
    echo -e "${RED}✗ providers/ directory not found!${NC}"
    exit 1
fi
if [ ! -f "context/OptimizedAuthContext.tsx" ]; then
    echo -e "${RED}✗ context/OptimizedAuthContext.tsx not found!${NC}"
    exit 1
fi
if [ ! -f "context/OptimizedDataContext.tsx" ]; then
    echo -e "${RED}✗ context/OptimizedDataContext.tsx not found!${NC}"
    exit 1
fi
if [ ! -f "utils/performance.ts" ]; then
    echo -e "${RED}✗ utils/performance.ts not found!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ All optimized files found${NC}"
echo ""

# Step 3: Replace App.tsx
echo -e "${YELLOW}Step 3: Updating App.tsx...${NC}"
mv App.tsx App.old.tsx
cp App.optimized.tsx App.tsx
echo -e "${GREEN}✓ App.tsx updated (old version saved as App.old.tsx)${NC}"
echo ""

# Step 4: Update imports in key files
echo -e "${YELLOW}Step 4: Updating imports...${NC}"

# Update ExploreScreen.tsx
if [ -f "screens/User/ExploreScreen.tsx" ]; then
    sed -i.bak "s/import { useAvailableFarmhouses } from '..\/..\/GlobalDataContext'/import { useAvailableFarmhouses } from '..\/..\/context\/OptimizedDataContext'/g" screens/User/ExploreScreen.tsx
    rm -f screens/User/ExploreScreen.tsx.bak
    echo -e "${GREEN}✓ Updated ExploreScreen.tsx${NC}"
fi

# Update BookingConfirmationScreen.tsx
if [ -f "screens/User/BookingConfirmationScreen.tsx" ]; then
    sed -i.bak "s/import { useCoupons, useGlobalData } from '..\/..\/GlobalDataContext'/import { useCoupons } from '..\/..\/context\/OptimizedDataContext'/g" screens/User/BookingConfirmationScreen.tsx
    rm -f screens/User/BookingConfirmationScreen.tsx.bak
    echo -e "${GREEN}✓ Updated BookingConfirmationScreen.tsx${NC}"
fi

echo ""

# Step 5: Verify TypeScript compilation
echo -e "${YELLOW}Step 5: Verifying TypeScript compilation...${NC}"
if command -v tsc &> /dev/null; then
    if tsc --noEmit; then
        echo -e "${GREEN}✓ TypeScript compilation successful${NC}"
    else
        echo -e "${RED}✗ TypeScript compilation failed. Please fix errors before proceeding.${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}! TypeScript compiler not found, skipping type check${NC}"
fi
echo ""

# Step 6: Clean and reinstall dependencies (optional)
echo -e "${YELLOW}Step 6: Would you like to clean and reinstall dependencies? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "Cleaning node_modules..."
    rm -rf node_modules
    echo "Reinstalling dependencies..."
    npm install
    echo -e "${GREEN}✓ Dependencies reinstalled${NC}"
else
    echo "Skipping dependency reinstall"
fi
echo ""

# Step 7: Summary
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Migration completed successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "1. Review the changes in the updated files"
echo "2. Test the app thoroughly on both iOS and Android"
echo "3. Check for any console warnings or errors"
echo "4. Monitor performance improvements"
echo "5. If issues occur, restore from backups in ./backups/"
echo ""
echo -e "${YELLOW}Important files updated:${NC}"
echo "  • App.tsx (optimized architecture)"
echo "  • Import statements in screens"
echo ""
echo -e "${YELLOW}New files added:${NC}"
echo "  • providers/AppProviders.tsx"
echo "  • context/OptimizedAuthContext.tsx"
echo "  • context/OptimizedDataContext.tsx"
echo "  • utils/performance.ts"
echo "  • ARCHITECTURE.md"
echo ""
echo "To rollback, run: ./scripts/rollback-migration.sh"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
