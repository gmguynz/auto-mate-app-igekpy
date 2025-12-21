
# Admin Quick Start Guide

## Creating Your First Admin Account

Since this is a new installation, you need to create the first admin user manually through the Supabase dashboard.

### Step 1: Access Supabase Dashboard

1. Go to https://app.supabase.com
2. Sign in to your account
3. Select your project

### Step 2: Create the Admin User

1. Navigate to **Authentication** in the left sidebar
2. Click on **Users**
3. Click the **"Add user"** button
4. Fill in the form:
   - **Email**: Your admin email address
   - **Password**: A strong password (at least 6 characters)
   - **Auto Confirm User**: Check this box (so you don't need to verify email)
5. Click **"Create user"**

### Step 3: Set Admin Role

1. Navigate to **Table Editor** in the left sidebar
2. Select the **user_profiles** table
3. Find the user you just created (by email)
4. Click on the row to edit it
5. Change the **role** field from `user` to `admin`
6. Click **"Save"**

### Step 4: Sign In to the App

1. Open the Mechanic Database app
2. Enter your admin email and password
3. Click **"Sign In"**
4. You're now logged in as an administrator!

## Creating Additional Users

Once you're logged in as an admin, you can create new users directly from the app:

1. Go to the **Profile** tab
2. Click **"User Management"**
3. Click **"Create New User"**
4. Fill in the user details:
   - **Full Name**: User's full name
   - **Email**: User's email address
   - **Password**: Initial password (min 6 characters)
   - **Role**: Select either "User" or "Admin"
5. Click **"Create User"**

**Important:** New users will receive an email verification link. They must verify their email before they can log in.

## Managing Users

### View All Users

1. Go to **Profile > User Management**
2. You'll see a list of all users with their:
   - Full name
   - Email address
   - Role (Admin or User)

### Change User Role

1. Go to **Profile > User Management**
2. Find the user you want to modify
3. Click the **swap icon** (↔️) next to their name
4. Confirm the role change

**Note:** You cannot change your own role.

### Delete User

1. Go to **Profile > User Management**
2. Find the user you want to delete
3. Click the **trash icon** (🗑️) next to their name
4. Confirm the deletion

**Note:** You cannot delete your own account.

## User Roles Explained

### Admin
- Full access to all features
- Can create, edit, and delete users
- Can manage customer database
- Can access User Management screen

### User
- Can manage customer database
- Can add, edit, and delete customers
- Cannot create or manage users
- Cannot access User Management screen

## Security Best Practices

1. **Use Strong Passwords**
   - At least 8 characters
   - Mix of uppercase, lowercase, numbers, and symbols
   - Don't reuse passwords

2. **Limit Admin Access**
   - Only grant admin role to trusted users
   - Regularly review who has admin access

3. **Regular Audits**
   - Periodically review user accounts
   - Remove inactive users
   - Check for suspicious activity

4. **Email Verification**
   - Always require email verification for new accounts
   - Verify email addresses are correct before creating accounts

5. **Sign Out When Done**
   - Always sign out when finished
   - Especially important on shared devices

## Troubleshooting

### Can't Create First Admin User

**Problem:** The user_profiles table doesn't show the new user

**Solution:** 
- Make sure you created the user in Authentication > Users first
- Wait a few seconds for the trigger to create the profile
- Refresh the table editor
- If still not there, manually insert a row in user_profiles table

### User Can't Log In

**Problem:** User gets "Invalid email or password" error

**Solution:**
- Verify the email and password are correct
- Check if the user has verified their email
- Check if the user exists in Authentication > Users
- Check if the user has a profile in user_profiles table

### Email Verification Not Received

**Problem:** New user didn't receive verification email

**Solution:**
- Check spam folder
- Verify email address is correct
- In Supabase dashboard, go to Authentication > Users
- Find the user and click "Send verification email"
- Or manually confirm the user by checking "Email Confirmed" in the dashboard

### Access Denied Error

**Problem:** User gets "Access Denied" when trying to access features

**Solution:**
- Verify the user is logged in
- Check the user's role in user_profiles table
- Make sure the user has the correct permissions
- Try signing out and signing back in

## Support

For additional help:
- Check the USER_MANAGEMENT_SETUP.md file for detailed documentation
- Review Supabase documentation: https://supabase.com/docs
- Check the app logs for error messages
- Contact your system administrator

## Quick Commands (SQL)

If you need to perform operations directly in SQL:

### Create Admin User (after creating in Auth)
```sql
UPDATE public.user_profiles
SET role = 'admin'
WHERE email = 'user@example.com';
```

### List All Users
```sql
SELECT id, email, full_name, role, created_at
FROM public.user_profiles
ORDER BY created_at DESC;
```

### Count Users by Role
```sql
SELECT role, COUNT(*) as count
FROM public.user_profiles
GROUP BY role;
```

### Delete User (will cascade to auth.users)
```sql
DELETE FROM public.user_profiles
WHERE email = 'user@example.com';
```

**Warning:** Be careful with SQL commands. Always backup your data before making changes.
