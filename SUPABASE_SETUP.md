
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

To enable automated email sending (without opening the email client), you need to configure the Supabase Edge Function that has already been deployed.

### Prerequisites

The Edge Function `send-reminder-email` is already deployed to your Supabase project. You just need to configure it with your email service credentials.

### Step 1: Choose an Email Service

We recommend **Resend** for its simplicity and reliability, but you can also use SendGrid or other services.

#### Option A: Using Resend (Recommended)

**1. Sign up for Resend**
- Go to [resend.com](https://resend.com)
- Create a free account
- You get 100 emails/day on the free plan

**2. Add and Verify Your Domain**
- In Resend dashboard, go to **Domains**
- Click **Add Domain**
- Enter your domain (e.g., `yourdomain.com`)
- Add the DNS records shown to your domain provider:
  - **TXT record** for domain verification
  - **MX records** for receiving bounces (optional but recommended)
  - **DKIM records** for email authentication

**3. Get Your API Key**
- Go to **API Keys** in Resend dashboard
- Click **Create API Key**
- Give it a name (e.g., "Mechanic App")
- Copy the API key (starts with `re_`)

**4. Configure Supabase Secrets**

Go to your Supabase project dashboard:
1. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
2. Add the following secrets:

```
RESEND_API_KEY=re_your_actual_api_key_here
FROM_EMAIL=reminders@yourdomain.com
```

**Important**: Replace `yourdomain.com` with your actual verified domain from Resend.

#### Option B: Using SendGrid

**1. Sign up for SendGrid**
- Go to [sendgrid.com](https://sendgrid.com)
- Create a free account (100 emails/day)

**2. Verify Your Domain**
- Follow SendGrid's domain verification process
- Add the required DNS records

**3. Get Your API Key**
- Go to **Settings** → **API Keys**
- Create a new API key with "Mail Send" permissions

**4. Configure Supabase Secrets**

```
SENDGRID_API_KEY=SG.your_actual_api_key_here
FROM_EMAIL=reminders@yourdomain.com
```

**5. Update the Edge Function**

You'll need to modify the Edge Function to use SendGrid's API instead of Resend. Contact support or refer to SendGrid's documentation.

### Step 2: Test the Email Function

After configuring the secrets:

1. Go to **Edge Functions** in your Supabase dashboard
2. Select `send-reminder-email`
3. Click **Invoke** and test with sample data:

```json
{
  "to": "your-email@example.com",
  "subject": "Test Reminder",
  "html": "This is a test reminder email<br><br>Testing line breaks",
  "customerName": "Test Customer"
}
```

4. Check your email inbox (and spam folder) for the test email

### Step 3: Verify in the App

1. Open your app
2. Go to **Reminders** screen
3. Tap on a reminder
4. You should now see **"Send Email (Auto)"** option
5. Select it to send an automated email

### Common Issues and Solutions

#### Issue: "Email service not configured"

**Solution**: Make sure you've added both `RESEND_API_KEY` and `FROM_EMAIL` to Supabase secrets. Restart your app after adding secrets.

#### Issue: Emails not arriving

**Possible causes**:
1. **Domain not verified**: Check Resend dashboard to ensure your domain is verified
2. **Wrong FROM_EMAIL**: Must match a verified domain in Resend
3. **Emails in spam**: Check spam folder, add SPF/DKIM records to improve deliverability
4. **API key invalid**: Verify the API key is correct and active

**Debugging steps**:
1. Check Edge Function logs in Supabase dashboard
2. Look for error messages in the logs
3. Test the function directly from Supabase dashboard
4. Verify DNS records are properly configured

#### Issue: "Failed to send email" error

**Solution**: 
1. Check Edge Function logs for detailed error messages
2. Verify your API key has not expired
3. Ensure you haven't exceeded your email quota
4. Check that the FROM_EMAIL matches your verified domain

#### Issue: Function returns 200 but no email arrives

**This is your current issue!** The function was returning success but emails weren't being sent because:
1. The FROM_EMAIL was hardcoded as `you@example.com` (not a verified domain)
2. The app was sending `body` but the function expected `html`
3. Error handling was insufficient

**Solution**: The Edge Function has been updated to:
- Use the `FROM_EMAIL` environment variable
- Accept `html` parameter (the app now sends this)
- Properly validate and return errors
- Log detailed information for debugging

### Step 4: DNS Configuration Details

For best email deliverability, configure these DNS records:

**For Resend:**

1. **Domain Verification (TXT)**
   ```
   Type: TXT
   Name: @ (or your domain)
   Value: [provided by Resend]
   ```

2. **DKIM (TXT)**
   ```
   Type: TXT
   Name: resend._domainkey
   Value: [provided by Resend]
   ```

3. **SPF (TXT)** - Add to existing SPF record or create new:
   ```
   Type: TXT
   Name: @
   Value: v=spf1 include:_spf.resend.com ~all
   ```

4. **MX Records** (optional, for bounce handling):
   ```
   Type: MX
   Priority: 10
   Value: feedback-smtp.resend.com
   ```

**Verification**: After adding DNS records, it may take up to 48 hours to propagate, but usually happens within minutes to hours.

### Step 5: Production Checklist

Before going live:

- [ ] Domain verified in Resend/SendGrid
- [ ] All DNS records added and verified
- [ ] API keys added to Supabase secrets
- [ ] FROM_EMAIL configured with verified domain
- [ ] Test email sent successfully
- [ ] Emails arriving in inbox (not spam)
- [ ] Edge Function logs show no errors
- [ ] App shows "Send Email (Auto)" option

## Verifying the Setup

After setup, you should see:

- ✅ A green "Cloud Storage Active" banner on the home screen
- ✅ Console logs showing "Using Supabase for storage"
- ✅ Your data visible in the Supabase dashboard under **Table Editor** → **customers**
- ✅ "Send Email (Auto)" option when tapping reminders
- ✅ Emails arriving successfully when sent

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

- Verify the Edge Function is deployed (check Supabase dashboard)
- Check that your email API key is set correctly in Supabase secrets
- Look at Edge Function logs in Supabase dashboard for error details
- Ensure your email service account is active and has sending quota
- Verify FROM_EMAIL matches your verified domain
- Check DNS records are properly configured

### Checking Edge Function Logs

To see detailed logs:
1. Go to Supabase dashboard
2. Navigate to **Edge Functions**
3. Click on `send-reminder-email`
4. Click **Logs** tab
5. Look for error messages or API responses

## Security Notes

The current setup uses a permissive RLS policy (`USING (true)`) which allows anyone with your API keys to access the data. 

For production use, you should:

1. Implement Supabase Authentication
2. Update the RLS policy to restrict access based on authenticated users
3. Consider using Row Level Security to ensure users can only access their own data
4. Protect your email API keys using Supabase secrets (never expose them in client code)
5. Use environment variables for sensitive configuration

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
