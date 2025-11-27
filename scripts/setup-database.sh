#!/bin/bash
# Quick database setup (assumes PostgreSQL is already installed)

set -e

echo "📝 Setting up Prophezy database..."

# Check if PostgreSQL is running
if ! pg_isready -U postgres > /dev/null 2>&1; then
    echo "❌ PostgreSQL is not running. Starting it..."
    sudo systemctl start postgresql
    sleep 2
fi

# Create database and user (will fail gracefully if they exist)
sudo -u postgres psql <<EOF
-- Create database (ignore error if exists)
SELECT 'CREATE DATABASE prophezy'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'prophezy')\gexec

-- Create user (ignore error if exists)
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'prophezy_user') THEN
        CREATE USER prophezy_user WITH PASSWORD 'prophezy_password';
    END IF;
END
\$\$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE prophezy TO prophezy_user;

-- Connect to database and grant schema privileges
\c prophezy
GRANT ALL ON SCHEMA public TO prophezy_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO prophezy_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO prophezy_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO prophezy_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO prophezy_user;

\q
EOF

echo "✅ Database setup complete!"
echo ""
echo "📋 Update your backend/.env with:"
echo "   DATABASE_URL=postgresql://prophezy_user:prophezy_password@localhost:5432/prophezy"

