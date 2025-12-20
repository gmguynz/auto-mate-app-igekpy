
# Supabase Setup Guide

This guide will help you set up Supabase cloud storage for your Mechanic Database app.

## Why Use Supabase?

- **Multi-device Access**: Access your customer data from any device
- **Cloud Backup**: Your data is safely stored in the cloud
- **Real-time Sync**: Changes sync automatically across devices
- **Secure**: Industry-standard security and encryption

## Setup Steps

### 1. Create a Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" and sign up for a free account
3. Create a new project (choose a name, database password, and region)

### 2. Create the Database Table

Once your project is ready:

1. Go to the **SQL Editor** in your Supabase dashboard
2. Click "New Query"
3. Copy and paste the following SQL:

```sql
-- Create customers table
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  address TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  mobile TEXT,
  vehicles JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
-- Note: In production, you should implement proper authentication
-- and restrict access based on user authentication
CREATE POLICY "Allow all operations" ON customers
  FOR ALL USING (true);

-- Create index for faster searches
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_company ON customers(company_name);
CREATE INDEX idx_customers_name ON customers(first_name, last_name);
```

4. Click "Run" to execute the SQL

### 3. Get Your API Keys

1. Go to **Settings** → **API** in your Supabase dashboard
2. Find your **Project URL** (looks like `https://xxxxx.supabase.co`)
3. Find your **anon/public** key (a long string starting with `eyJ...`)

### 4. Configure Your App

1. Create a `.env` file in your project root (copy from `.env.example`)
2. Add your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

3. **Important**: Restart your development server after adding environment variables

```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev
```

### 5. Migrate Existing Data (Optional)

If you already have customers in local storage:

1. Open the app
2. Go to the Home screen
3. Tap on "Migrate to Cloud" button
4. Confirm the migration

Your existing customer data will be uploaded to Supabase.

## Verifying the Setup

After setup, you should see:

- ✅ A green "Cloud Storage Active" banner on the home screen
- ✅ Console logs showing "Using Supabase for storage"
- ✅ Your data visible in the Supabase dashboard under **Table Editor** → **customers**

## Troubleshooting

### "Supabase not configured" message

- Make sure you created the `.env` file with the correct keys
- Restart your development server
- Check that the environment variables start with `EXPO_PUBLIC_`

### "Error getting customers from Supabase"

- Verify your Supabase project is active (not paused)
- Check that the `customers` table exists in your database
- Verify the RLS policy is set up correctly

### Data not syncing

- Check your internet connection
- Look at the console logs for error messages
- Verify your API keys are correct

## Security Notes

The current setup uses a permissive RLS policy (`USING (true)`) which allows anyone with your API keys to access the data. 

For production use, you should:

1. Implement Supabase Authentication
2. Update the RLS policy to restrict access based on authenticated users
3. Consider using Row Level Security to ensure users can only access their own data

Example secure policy:

```sql
-- Remove the permissive policy
DROP POLICY "Allow all operations" ON customers;

-- Create user-specific policies
CREATE POLICY "Users can view their own customers" ON customers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customers" ON customers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customers" ON customers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customers" ON customers
  FOR DELETE USING (auth.uid() = user_id);
```

## Support

For more information:

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
