#!/bin/bash
# Fix Pydantic version conflict for Oracle service

echo "🔧 Fixing Pydantic version conflict..."

# Install correct versions in user space
python3 -m pip install --user --upgrade fastapi==0.104.1 uvicorn==0.24.0 pydantic==2.5.0

echo "✅ Pydantic dependencies updated"
echo ""
echo "To use oracle service, run:"
echo "  npm run dev:with-oracle"

