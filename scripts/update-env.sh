#!/bin/bash
# Update backend/.env with PostgreSQL connection string

ENV_FILE="../backend/.env"
BACKUP_FILE="../backend/.env.backup"

echo "📝 Updating backend/.env..."

# Backup existing .env if it exists
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$BACKUP_FILE"
    echo "✅ Backed up existing .env to .env.backup"
fi

# Update DATABASE_URL
if grep -q "DATABASE_URL=" "$ENV_FILE" 2>/dev/null; then
    # Replace existing DATABASE_URL
    sed -i 's|DATABASE_URL=.*|DATABASE_URL=postgresql://prophezy_user:prophezy_password@localhost:5432/prophezy|' "$ENV_FILE"
    echo "✅ Updated DATABASE_URL in .env"
else
    # Add DATABASE_URL if it doesn't exist
    echo "" >> "$ENV_FILE"
    echo "# Database" >> "$ENV_FILE"
    echo "DATABASE_URL=postgresql://prophezy_user:prophezy_password@localhost:5432/prophezy" >> "$ENV_FILE"
    echo "✅ Added DATABASE_URL to .env"
fi

echo ""
echo "✅ Environment file updated!"
echo "📋 DATABASE_URL: postgresql://prophezy_user:prophezy_password@localhost:5432/prophezy"

