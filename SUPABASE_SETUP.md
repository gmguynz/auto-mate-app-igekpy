
# Supabase Setup Guide

This guide will help you set up Supabase cloud storage for your Mechanic Database app.

## Why Use Supabase?

- **Multi-device Access**: Access your customer data from any device
- **Cloud Backup**: Your data is safely stored in the cloud
- **Real-time Sync**: Changes sync automatically across devices
- **Secure**: Industry-standard security and encryption
- **Automated Emails**: Send reminder emails automatically without opening email client

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

## Setting Up Automated Email Reminders

To enable automated email sending (without opening the email client), you need to set up a Supabase Edge Function.

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link Your Project

```bash
supabase link --project-ref your-project-ref
```

You can find your project ref in your Supabase dashboard URL: `https://app.supabase.com/project/[your-project-ref]`

### 4. Create the Edge Function

Create a new directory for your Edge Function:

```bash
supabase functions new send-reminder-email
```

This will create a file at `supabase/functions/send-reminder-email/index.ts`

### 5. Add Email Service Integration

You can use any email service. Here's an example using **Resend** (recommended for simplicity):

**Option A: Using Resend (Recommended)**

1. Sign up at [resend.com](https://resend.com) and get your API key
2. Add your Resend API key to Supabase secrets:

```bash
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

3. Update the Edge Function code:

```typescript
// supabase/functions/send-reminder-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, body, customerName } = await req.json()

    // Send email using Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Your Mechanic Shop <reminders@yourdomain.com>',
        to: [to],
        subject: subject,
        text: body,
      }),
    })

    const data = await res.json()

    if (res.ok) {
      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      throw new Error(data.message || 'Failed to send email')
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

**Option B: Using SendGrid**

1. Sign up at [sendgrid.com](https://sendgrid.com) and get your API key
2. Add your SendGrid API key to Supabase secrets:

```bash
supabase secrets set SENDGRID_API_KEY=SG.your_api_key_here
```

3. Update the Edge Function code similarly, using SendGrid's API

### 6. Deploy the Edge Function

```bash
supabase functions deploy send-reminder-email
```

### 7. Test the Email Function

You can test the function from your Supabase dashboard:

1. Go to **Edge Functions** in your Supabase dashboard
2. Select `send-reminder-email`
3. Click "Invoke Function" and test with sample data:

```json
{
  "to": "test@example.com",
  "subject": "Test Reminder",
  "body": "This is a test reminder email",
  "customerName": "Test Customer"
}
```

### 8. Configure Your Email Domain (Optional but Recommended)

For production use with Resend:

1. Add and verify your domain in Resend dashboard
2. Update the `from` address in the Edge Function to use your domain
3. This prevents emails from going to spam

## Verifying the Setup

After setup, you should see:

- ✅ A green "Cloud Storage Active" banner on the home screen
- ✅ Console logs showing "Using Supabase for storage"
- ✅ Your data visible in the Supabase dashboard under **Table Editor** → **customers**
- ✅ "Send Email (Auto)" option when tapping reminders (if Supabase is configured)

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

### Email sending fails

- Verify the Edge Function is deployed: `supabase functions list`
- Check that your email API key is set correctly in Supabase secrets
- Look at Edge Function logs in Supabase dashboard for error details
- Ensure your email service account is active and has sending quota

## Security Notes

The current setup uses a permissive RLS policy (`USING (true)`) which allows anyone with your API keys to access the data. 

For production use, you should:

1. Implement Supabase Authentication
2. Update the RLS policy to restrict access based on authenticated users
3. Consider using Row Level Security to ensure users can only access their own data
4. Protect your email API keys using Supabase secrets (never expose them in client code)

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
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Resend Documentation](https://resend.com/docs)
- [SendGrid Documentation](https://docs.sendgrid.com/)
