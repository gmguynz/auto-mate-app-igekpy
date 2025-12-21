
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

To enable automated email sending (without opening the email client), you need to configure the Supabase Edge Function with your email service credentials.

### Prerequisites

The Edge Function `send-reminder-email` is already deployed to your Supabase project. You just need to configure it with your email service credentials.

### Step 1: Choose an Email Service

We recommend **Resend** for its simplicity and reliability.

#### Using Resend (Recommended)

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

**Important**: Wait for domain verification to complete (usually 5-30 minutes, can take up to 48 hours)

**3. Get Your API Key**
- Go to **API Keys** in Resend dashboard
- Click **Create API Key**
- Give it a name (e.g., "Mechanic App")
- Copy the API key (starts with `re_`)

**4. Configure Supabase Edge Function Secrets**

This is the most critical step! Go to your Supabase project dashboard:

1. Navigate to **Project Settings** (gear icon in sidebar)
2. Click **Edge Functions** in the left menu
3. Click on the **Secrets** tab
4. Add the following secrets by clicking **Add new secret**:

```
Secret Name: RESEND_API_KEY
Secret Value: re_your_actual_api_key_here
```

```
Secret Name: FROM_EMAIL
Secret Value: reminders@yourdomain.com
```

**Critical Notes**:
- Replace `re_your_actual_api_key_here` with your actual Resend API key
- Replace `yourdomain.com` with your actual verified domain from Resend
- The FROM_EMAIL must use a domain that is verified in Resend
- After adding secrets, the Edge Function will automatically use them (no restart needed)

### Step 2: Verify Edge Function Configuration

After adding the secrets:

1. Go to **Edge Functions** in your Supabase dashboard
2. Click on `send-reminder-email`
3. Click the **Logs** tab
4. Click **Invoke function** to test it
5. Use this test payload:

```json
{
  "to": "your-email@example.com",
  "subject": "Test Reminder",
  "html": "This is a test reminder email<br><br>Testing line breaks",
  "customerName": "Test Customer"
}
```

6. Click **Send request**
7. Check the response and logs:
   - **Success**: You should see status 200 and a Resend ID in the response
   - **Error**: Check the logs for specific error messages

### Step 3: Test in the App

1. Open your app
2. Go to **Reminders** screen
3. Tap on a reminder
4. Select **"Send Email (Auto)"** option
5. Check your email inbox (and spam folder)

### Common Issues and Solutions

#### Issue: "Edge Function returned a non-2xx status code"

This is the error you're currently seeing. It means the Edge Function is failing. Here's how to diagnose:

**Step 1: Check Edge Function Logs**
1. Go to Supabase dashboard → **Edge Functions** → `send-reminder-email` → **Logs**
2. Look for the most recent error messages
3. Common errors and solutions:

**Error: "RESEND_API_KEY is not configured"**
- **Solution**: You haven't added the RESEND_API_KEY secret to Supabase
- Go to **Project Settings** → **Edge Functions** → **Secrets**
- Add `RESEND_API_KEY` with your Resend API key

**Error: "Invalid API key" or 403 status**
- **Solution**: Your Resend API key is incorrect or expired
- Go to Resend dashboard → **API Keys**
- Create a new API key and update the Supabase secret

**Error: "Domain not verified" or 422 status**
- **Solution**: Your FROM_EMAIL domain is not verified in Resend
- Go to Resend dashboard → **Domains**
- Verify your domain is showing as "Verified"
- If not, check your DNS records
- Make sure FROM_EMAIL uses the verified domain (e.g., `reminders@yourdomain.com`)

**Error: "Missing required fields"**
- **Solution**: The app is not sending the correct data format
- This should be fixed in the latest version
- Make sure you've updated the app code

**Step 2: Verify DNS Records**

If your domain is not verified in Resend:

1. Go to your domain provider (GoDaddy, Namecheap, Cloudflare, etc.)
2. Add the DNS records shown in Resend dashboard
3. Wait 5-30 minutes for DNS propagation
4. Check verification status in Resend

**Step 3: Test Directly in Resend**

To verify your Resend setup is working:

1. Go to Resend dashboard
2. Click **Send Test Email**
3. Send a test email to yourself
4. If this fails, the issue is with your Resend configuration, not the app

#### Issue: Emails not arriving

**Possible causes**:
1. **Domain not verified**: Check Resend dashboard to ensure your domain is verified
2. **Wrong FROM_EMAIL**: Must match a verified domain in Resend
3. **Emails in spam**: Check spam folder, add SPF/DKIM records to improve deliverability
4. **API key invalid**: Verify the API key is correct and active
5. **Rate limit**: Free plan has 100 emails/day limit

**Debugging steps**:
1. Check Edge Function logs in Supabase dashboard for detailed error messages
2. Look for the Resend API response in the logs
3. Test the function directly from Supabase dashboard
4. Verify DNS records are properly configured
5. Check Resend dashboard for delivery status

#### Issue: "Email service not configured"

**Solution**: 
- Make sure you've added both `RESEND_API_KEY` and `FROM_EMAIL` to Supabase Edge Function secrets
- Restart your app after adding secrets
- Check that the secrets are in the correct format (no extra spaces or quotes)

### Step 4: DNS Configuration Details

For best email deliverability, configure these DNS records in your domain provider:

**For Resend:**

1. **Domain Verification (TXT)**
   ```
   Type: TXT
   Name: @ (or your domain)
   Value: [provided by Resend]
   TTL: 3600 (or default)
   ```

2. **DKIM (TXT)**
   ```
   Type: TXT
   Name: resend._domainkey
   Value: [provided by Resend]
   TTL: 3600 (or default)
   ```

3. **SPF (TXT)** - Add to existing SPF record or create new:
   ```
   Type: TXT
   Name: @
   Value: v=spf1 include:_spf.resend.com ~all
   TTL: 3600 (or default)
   ```

4. **MX Records** (optional, for bounce handling):
   ```
   Type: MX
   Priority: 10
   Value: feedback-smtp.resend.com
   TTL: 3600 (or default)
   ```

**Verification**: After adding DNS records, it may take up to 48 hours to propagate, but usually happens within minutes to hours. You can check DNS propagation at [whatsmydns.net](https://www.whatsmydns.net/)

### Step 5: Production Checklist

Before going live:

- [ ] Domain verified in Resend (shows "Verified" status)
- [ ] All DNS records added and verified (TXT, DKIM, SPF)
- [ ] RESEND_API_KEY added to Supabase Edge Function secrets
- [ ] FROM_EMAIL added to Supabase Edge Function secrets
- [ ] FROM_EMAIL uses verified domain (e.g., `reminders@yourdomain.com`)
- [ ] Test email sent successfully from Supabase dashboard
- [ ] Test email sent successfully from app
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
- ✅ Edge Function logs showing "Email sent successfully" with Resend ID

## Troubleshooting Checklist

If emails are not working, go through this checklist:

1. **Supabase Edge Function Secrets**
   - [ ] RESEND_API_KEY is set in Supabase Edge Function secrets
   - [ ] FROM_EMAIL is set in Supabase Edge Function secrets
   - [ ] No extra spaces or quotes in the secret values

2. **Resend Configuration**
   - [ ] Resend account is active
   - [ ] Domain is added to Resend
   - [ ] Domain shows "Verified" status in Resend dashboard
   - [ ] API key is valid and not expired
   - [ ] FROM_EMAIL matches the verified domain

3. **DNS Records**
   - [ ] TXT record for domain verification is added
   - [ ] DKIM record is added
   - [ ] SPF record includes Resend
   - [ ] DNS records have propagated (check with whatsmydns.net)

4. **Edge Function**
   - [ ] Edge Function is deployed (check Supabase dashboard)
   - [ ] Edge Function logs show no errors
   - [ ] Test invocation from dashboard works
   - [ ] Function returns 200 status code

5. **App Configuration**
   - [ ] EXPO_PUBLIC_SUPABASE_URL is set in .env
   - [ ] EXPO_PUBLIC_SUPABASE_ANON_KEY is set in .env
   - [ ] Development server was restarted after adding .env
   - [ ] App shows "Cloud Storage Active" banner

## Getting Help

If you're still having issues:

1. **Check Edge Function Logs**: Go to Supabase dashboard → Edge Functions → send-reminder-email → Logs
2. **Look for specific error messages**: The logs will tell you exactly what's wrong
3. **Common error messages**:
   - "RESEND_API_KEY is not configured" → Add the secret to Supabase
   - "Domain not verified" → Verify your domain in Resend
   - "Invalid API key" → Check your Resend API key
   - "Missing required fields" → Update the app code

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
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Resend Documentation](https://resend.com/docs)
- [Resend Domain Verification](https://resend.com/docs/dashboard/domains/introduction)
