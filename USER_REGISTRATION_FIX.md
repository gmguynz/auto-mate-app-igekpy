
# User Registration Fix - Complete Guide

## Issues Fixed

### 1. Duplicate Key Error
**Problem**: When creating a new user with email confirmation disabled, the app threw a "duplicate key value violates unique constraint 'user_profiles_pkey'" error.

**Root Cause**: 
- A database trigger (`on_auth_user_created`) automatically creates a user profile when a user is created in `auth.users`
- The admin code was trying to manually insert a profile AFTER the user was created, causing a duplicate key error

**Solution**:
- Removed the manual profile insertion from `admin.tsx`
- Updated the database trigger to use `ON CONFLICT (id) DO NOTHING` to prevent duplicate key errors
- The trigger now properly extracts `user_id` from the user metadata

### 2. Auto-Login to New User Account
**Problem**: When creating a new user with email confirmation disabled, the admin was automatically logged into the newly created user's account.

**Root Cause**: 
- When email confirmation is disabled in Supabase, `signUp()` automatically logs in the newly created user
- This replaced the admin's session with the new user's session

**Solution**:
- Store the admin's session (access token and refresh token) before creating the user
- After user creation, restore the admin's session using `supabase.auth.setSession()`
- This ensures the admin remains logged in as admin

### 3. SMTP Configuration Error
**Problem**: Confirmation emails were not being sent despite SMTP being "configured"

**Root Cause**: 
- The error logs show: `"535 API key not found"`
- This indicates the Resend API key is not properly configured in Supabase

**Solution**:
- Added better error handling to detect SMTP configuration issues
- Provided clear instructions to the user on how to fix SMTP settings
- The app now gracefully handles SMTP errors and still creates the user

## How to Fix SMTP Configuration

### Option 1: Configure Resend SMTP (Recommended)

1. **Get your Resend API Key**:
   - Go to https://resend.com/api-keys
   - Create a new API key or copy your existing one

2. **Configure Supabase SMTP Settings**:
   - Go to your Supabase project dashboard
   - Navigate to **Project Settings** > **Auth**
   - Scroll down to **SMTP Settings**
   - Enable **Enable Custom SMTP**
   - Fill in the following details:
     ```
     Sender name: Your App Name
     Sender email: noreply@yourdomain.com (must be verified in Resend)
     Host: smtp.resend.com
     Port: 465 or 587
     Username: resend
     Password: [Your Resend API Key]
     ```
   - Click **Save**

3. **Verify Email Domain** (if using custom domain):
   - In Resend dashboard, add and verify your domain
   - Add the required DNS records
   - Wait for verification (usually a few minutes)

### Option 2: Disable Email Confirmation (For Testing)

If you want to allow users to log in immediately without email verification:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Providers**
3. Click on **Email**
4. Toggle **OFF** the "Confirm email" option
5. Click **Save**

**Note**: This is not recommended for production as it allows anyone to create accounts without verifying their email address.

## Testing the Fix

### Test 1: Create User with Email Confirmation Enabled

1. Ensure SMTP is properly configured (Option 1 above)
2. Enable email confirmation in Supabase
3. Create a new user from the admin panel
4. You should see: "User created successfully! An email verification link has been sent to [email]"
5. Check that you're still logged in as admin (not the new user)
6. The new user should receive a confirmation email

### Test 2: Create User with Email Confirmation Disabled

1. Disable email confirmation in Supabase (Option 2 above)
2. Create a new user from the admin panel
3. You should see: "User created successfully! The user can now log in with their email and password"
4. Check that you're still logged in as admin (not the new user)
5. The new user can log in immediately without email verification

### Test 3: Create User with Custom User ID

1. Create a new user and provide a custom User ID
2. The user should be able to log in with either:
   - Their email address
   - Their custom User ID

## Technical Details

### Database Trigger

The `handle_new_user()` trigger function now:
- Automatically creates a user profile when a user is created
- Extracts `full_name`, `user_id`, and `role` from the user metadata
- Uses `ON CONFLICT (id) DO NOTHING` to prevent duplicate key errors
- Runs with `SECURITY DEFINER` to bypass RLS policies

### Session Management

The admin panel now:
- Stores the current admin session before creating a user
- Restores the admin session after user creation
- Handles both scenarios: email confirmation enabled and disabled

### Error Handling

The app now:
- Detects SMTP configuration errors
- Provides clear, actionable error messages
- Continues to function even if email sending fails
- Logs detailed information for debugging

## Common Issues

### Issue: "535 API key not found"
**Solution**: Your Resend API key is not configured correctly. Follow Option 1 above.

### Issue: "Error sending confirmation email"
**Solution**: Check your SMTP settings and ensure your sender email is verified in Resend.

### Issue: User created but can't log in
**Solution**: If email confirmation is enabled, the user must click the verification link in their email before they can log in.

### Issue: Still getting duplicate key errors
**Solution**: 
1. Check the database logs to see which constraint is being violated
2. Ensure the migration was applied successfully
3. Try deleting the user from `auth.users` and creating them again

## Support

If you continue to experience issues:

1. Check the browser console for detailed error messages
2. Check the Supabase logs:
   - Go to your Supabase project dashboard
   - Navigate to **Logs** > **Auth Logs**
   - Look for errors related to user creation
3. Verify your database trigger is working:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```
4. Check if profiles are being created:
   ```sql
   SELECT * FROM user_profiles ORDER BY created_at DESC LIMIT 5;
   ```
