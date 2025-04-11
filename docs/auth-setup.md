# Authentication and Database Setup

This document describes how to set up authentication providers and database for Story Maker.

## Google OAuth Setup

1. Access the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Go to "APIs & Services" > "Credentials"
4. Click on "Create Credentials" > "OAuth client ID"
5. Configure the authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.com/api/auth/callback/google` (production)
6. Copy the generated Client ID and Client Secret to your `.env` file:
   ```
   GOOGLE_CLIENT_ID="your-client-id"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```

## Apple OAuth Setup

1. Access the [Apple Developer Portal](https://developer.apple.com/)
2. Go to "Certificates, Identifiers & Profiles"
3. Create a new "App ID" and configure Sign In with Apple
4. Configure the redirect URIs:
   - `http://localhost:3000/api/auth/callback/apple` (development)
   - `https://your-domain.com/api/auth/callback/apple` (production)
5. Copy the generated Client ID and Client Secret to your `.env` file:
   ```
   APPLE_ID="your-client-id"
   APPLE_SECRET="your-client-secret"
   ```

## PostgreSQL Database Setup

### Option 1: Using Docker (Recommended for development)

1. Make sure Docker and Docker Compose are installed on your machine
2. In the project root, run:
   ```bash
   docker-compose up -d
   ```
3. Configure the connection URL in your `.env` file:
   ```
   DATABASE_URL="postgresql://story_maker:story_maker_password@localhost:5432/story_maker"
   ```

### Option 2: Local Installation

1. Install PostgreSQL on your server
2. Create a new database:
   ```sql
   CREATE DATABASE story_maker;
   ```
3. Create a user with necessary permissions:
   ```sql
   CREATE USER your_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE story_maker TO your_user;
   ```
4. Configure the connection URL in your `.env` file:
   ```
   DATABASE_URL="postgresql://your_user:your_password@localhost:5432/story_maker"
   ```

## Next-Auth Setup

1. Generate a secure secret for Next-Auth:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
2. Add the generated secret to your `.env` file:
   ```
   NEXTAUTH_SECRET="your-generated-secret"
   NEXTAUTH_URL="http://localhost:3000" # In development
   ```

## Database Initialization

After configuring all environment variables, run the command to create the database tables:

```bash
npx prisma db push
```

## Installation Verification

To verify if everything is configured correctly:

1. Start the development server:
   ```bash
   yarn dev
   ```
2. Access `http://localhost:3000/login`
3. Try logging in using the different configured providers

## Troubleshooting

### Database Connection Errors

- If using Docker:
  - Check if the container is running: `docker ps`
  - Check container logs: `docker logs story_maker_db`
  - Restart the container if needed: `docker-compose restart`
- If using local installation:
  - Check if PostgreSQL is running
  - Verify the credentials in DATABASE_URL are correct
  - Verify the database and user were created correctly

### OAuth Authentication Errors

- Verify the redirect URIs are configured correctly
- Confirm the credentials (Client ID and Secret) are correct in the `.env` file
- Verify the application domain is authorized in the developer consoles

### To access db by docker compose

`docker exec -it story_maker_db psql -U story_maker -d story_maker`
