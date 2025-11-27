#!/bin/bash
# PostgreSQL Installation and Setup Script for Prophezy

set -e

echo "🚀 Installing PostgreSQL..."

# Install PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

echo "✅ PostgreSQL installed and started"
echo ""
echo "📝 Setting up database..."

# Create database and user
sudo -u postgres psql <<EOF
-- Create database
CREATE DATABASE prophezy;

-- Create user
CREATE USER prophezy_user WITH PASSWORD 'prophezy_password';

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

echo "✅ Database 'prophezy' created"
echo "✅ User 'prophezy_user' created"
echo ""
echo "📋 Database connection details:"
echo "   Database: prophezy"
echo "   User: prophezy_user"
echo "   Password: prophezy_password"
echo "   Host: localhost"
echo "   Port: 5432"
echo ""
echo "🔗 Connection string:"
echo "   postgresql://prophezy_user:prophezy_password@localhost:5432/prophezy"
echo ""
echo "✅ Setup complete!"

