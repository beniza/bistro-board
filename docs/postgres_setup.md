# PostgreSQL Database Setup Guide (Vercel + Neon)

This guide walks you through setting up a free serverless PostgreSQL database using the Neon Postgres integration directly within Vercel.

## Step 1: Link Your Project to Vercel

If you haven't already, you need to connect your local project to a Vercel project:

1. Open your terminal in the project root (`web/` directory).
2. Run `npx vercel link` to link your local code to a Vercel project (follow the CLI prompts to create a new one).

## Step 2: Add Neon Postgres via Vercel Storage

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and open the project you just created.
2. Navigate to the **Storage** tab.
3. Click **Create Database** and select **Neon Postgres**.
4. Accept the terms and select your preferred region.
5. Vercel will automatically provision the Neon database and attach it to your project.

## Step 3: Pull Environment Variables Locally

Now that the database is created, Vercel has automatically securely stored your connection string. To use it locally:

1. In your terminal (inside the `web/` folder), run:
   ```bash
   npx vercel env pull .env
   ```
2. This will pull down your environment variables (including `POSTGRES_URL`) into your local `.env` file.

## Step 4: Configure Drizzle to use POSTGRES_URL

Since Vercel provides the connection string as `POSTGRES_URL`, update your Drizzle schema/config or simply rename it if your app was expecting `DATABASE_URL`. If you want to stick with `DATABASE_URL`, just assign `DATABASE_URL=$POSTGRES_URL` in your `.env`.

## Step 5: Push the Schema to the Database

Once your `.env` is updated, push the Drizzle structure to your new database:

```bash
npm run db:push
```
