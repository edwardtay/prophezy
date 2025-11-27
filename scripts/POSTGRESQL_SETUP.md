# PostgreSQL Setup Guide

## Quick Setup

### Option 1: Full Installation (if PostgreSQL is not installed)

```bash
# Run the installation script (requires sudo)
./scripts/install-postgresql.sh
```

This will:
- Install PostgreSQL
- Start the PostgreSQL service
- Create the `prophezy` database
- Create the `prophezy_user` user
- Set up all necessary permissions

### Option 2: Database Setup Only (if PostgreSQL is already installed)

```bash
# Run the setup script (requires sudo)
./scripts/setup-database.sh
```

This will:
- Create the `prophezy` database
- Create the `prophezy_user` user
- Set up all necessary permissions

## Manual Setup

If you prefer to set up manually:

```bash
# 1. Install PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# 2. Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 3. Create database and user
sudo -u postgres psql <<EOF
CREATE DATABASE prophezy;
CREATE USER prophezy_user WITH PASSWORD 'prophezy_password';
GRANT ALL PRIVILEGES ON DATABASE prophezy TO prophezy_user;
\c prophezy
GRANT ALL ON SCHEMA public TO prophezy_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO prophezy_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO prophezy_user;
\q
EOF
```

## Update Backend Configuration

After setting up PostgreSQL, update `backend/.env`:

```env
DATABASE_URL=postgresql://prophezy_user:prophezy_password@localhost:5432/prophezy
PORT=3001
```

## Switch Backend from Mock to Real Database

Update `package.json` to use the real backend:

```json
"dev:backend": "cd backend && npm run dev"
```

Instead of:

```json
"dev:backend": "cd backend && npm run dev:mock"
```

## Verify Setup

Test the database connection:

```bash
# Test connection
psql -U prophezy_user -d prophezy -h localhost

# Or test from backend
cd backend
npm run dev
# Should see "Database connected" message
```

## Troubleshooting

### PostgreSQL not starting
```bash
sudo systemctl status postgresql
sudo journalctl -u postgresql -n 50
```

### Connection refused
- Check if PostgreSQL is running: `sudo systemctl status postgresql`
- Check if port 5432 is open: `sudo netstat -tlnp | grep 5432`

### Permission denied
- Make sure the user has been granted privileges
- Check pg_hba.conf: `sudo nano /etc/postgresql/*/main/pg_hba.conf`
- Restart PostgreSQL: `sudo systemctl restart postgresql`

