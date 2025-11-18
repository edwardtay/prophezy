#!/bin/bash
# Pre-push security and sanity check script

echo "🔒 Running Pre-Push Security Checks..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check 1: Verify .env files are not tracked
echo "1. Checking for tracked .env files..."
ENV_FILES=$(git ls-files 2>/dev/null | grep -E "\.env$|\.env\.local$" | grep -v "\.example")
if [ -z "$ENV_FILES" ]; then
    echo -e "${GREEN}✅ No .env files are tracked${NC}"
else
    echo -e "${RED}❌ ERROR: Found tracked .env files:${NC}"
    echo "$ENV_FILES"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 2: Verify no hardcoded secrets
echo "2. Checking for hardcoded secrets..."
SECRETS=$(git grep -i "password\|secret\|private_key\|api_key" -- "*.ts" "*.tsx" "*.js" 2>/dev/null | grep -v "process.env\|NEXT_PUBLIC\|\.example\|node_modules" | grep -v "^Binary" || true)
if [ -z "$SECRETS" ]; then
    echo -e "${GREEN}✅ No hardcoded secrets found${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: Potential hardcoded secrets found:${NC}"
    echo "$SECRETS" | head -5
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 3: Verify no certificate files tracked
echo "3. Checking for tracked certificate files..."
CERT_FILES=$(git ls-files 2>/dev/null | grep -E "\.(pem|key|crt|cert)$" || true)
if [ -z "$CERT_FILES" ]; then
    echo -e "${GREEN}✅ No certificate files are tracked${NC}"
else
    echo -e "${RED}❌ ERROR: Found tracked certificate files:${NC}"
    echo "$CERT_FILES"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 4: Check for large files
echo "4. Checking for large files (>5MB)..."
LARGE_FILES=$(find . -type f -size +5M -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/dist/*" -not -path "*/build/*" 2>/dev/null || true)
if [ -z "$LARGE_FILES" ]; then
    echo -e "${GREEN}✅ No large files found${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: Large files found:${NC}"
    echo "$LARGE_FILES"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 5: Verify .gitignore is comprehensive
echo "5. Verifying .gitignore coverage..."
if grep -q "^\.env$" .gitignore && grep -q "^\.env\.local$" .gitignore && grep -q "^\*\.pem$" .gitignore; then
    echo -e "${GREEN}✅ .gitignore covers essential files${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: .gitignore might be missing some patterns${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 6: Check for TODO/FIXME in critical files
echo "6. Checking for TODO/FIXME comments..."
TODOS=$(grep -r "TODO\|FIXME" --include="*.ts" --include="*.tsx" frontend/src backend/src 2>/dev/null | grep -v "node_modules" | wc -l)
if [ "$TODOS" -eq "0" ]; then
    echo -e "${GREEN}✅ No TODO/FIXME comments found${NC}"
else
    echo -e "${YELLOW}⚠️  Found $TODOS TODO/FIXME comments (acceptable for hackathon)${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo "📊 Summary:"
echo "=========================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Safe to push.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found. Review before pushing.${NC}"
    exit 0
else
    echo -e "${RED}❌ $ERRORS error(s) found. Fix before pushing!${NC}"
    exit 1
fi

