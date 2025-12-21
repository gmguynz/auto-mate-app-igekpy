
# User Management System Setup Guide

This app now includes a comprehensive user management system with role-based access control. Only authenticated users can access the database, and only administrators can create new user accounts.

## Features

- **Secure Authentication**: Email and password-based authentication using Supabase Auth
- **Role-Based Access Control**: Two roles - Admin and User
- **Admin-Only User Creation**: Only administrators can create new user accounts
- **Row Level Security**: Database access is restricted to authenticated users only
- **User Profile Management**: View and manage user profiles
- **Session Management**: Secure session handling with automatic token refresh

## Initial Setup

### 1. Create the First Admin User

Since user accounts can only be created by admins, you need to manually create the first admin user:

**Option A: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to **Authentication > Users**
3. Click **"Add user"**
4. Enter email and password
5. Click **"Create user"**
6. Go to **Table Editor > user_profiles**
7. Find the newly created user
8. Change their `role` from `'user'` to `'admin'`
9. Save the changes

**Option B: Using SQL Editor**
```sql
-- First, create the auth user (replace with your email/password)
-- This needs to be done through the Supabase Dashboard or Auth API

-- Then, update the user profile to admin
UPDATE public.user_profiles
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
```

### 2. Sign In as Admin

1. Open the app
2. You'll be redirected to the login screen
3. Enter the admin credentials you just created
4. You'll be logged in and redirected to the home screen

### 3. Create Additional Users

Once logged in as an admin:

1. Go to the **Profile** tab
2. Click **"User Management"** (only visible to admins)
3. Click **"Create New User"**
4. Fill in the user details:
   - Full Name
   - Email
   - Password (minimum 6 characters)
   - Role (Admin or User)
5. Click **"Create User"**
6. The new user will receive an email verification link
7. They must verify their email before they can log in

## User Roles

### Admin
- Can view and manage all customers
- Can create new user accounts
- Can change user roles
- Can delete user accounts (except their own)
- Has access to the User Management screen

### User
- Can view and manage all customers
- Can add, edit, and delete customer records
- Cannot create new user accounts
- Cannot access the User Management screen

## Security Features

### Row Level Security (RLS)

All database tables have RLS enabled with the following policies:

**user_profiles table:**
- Users can view their own profile
- Admins can view all profiles
- Only admins can create new profiles
- Users can update their own profile (except role)
- Admins can update any profile
- Only admins can delete profiles

**customers table:**
- Only authenticated users can view customers
- Only authenticated users can insert customers
- Only authenticated users can update customers
- Only authenticated users can delete customers

### Authentication Flow

1. **Unauthenticated users** are automatically redirected to the login screen
2. **Authenticated users** can access the main app
3. **Sessions are persisted** using AsyncStorage for seamless experience
4. **Tokens are automatically refreshed** to maintain security

## User Management

### Creating Users

Admins can create new users through the User Management screen:

1. Navigate to **Profile > User Management**
2. Click **"Create New User"**
3. Enter user details
4. Select role (Admin or User)
5. Click **"Create User"**

**Note:** New users must verify their email before they can log in.

### Changing User Roles

Admins can change user roles:

1. Navigate to **Profile > User Management**
2. Find the user you want to modify
3. Click the swap icon next to their name
4. Confirm the role change

**Note:** You cannot change your own role.

### Deleting Users

Admins can delete user accounts:

1. Navigate to **Profile > User Management**
2. Find the user you want to delete
3. Click the delete icon next to their name
4. Confirm the deletion

**Note:** You cannot delete your own account.

## Troubleshooting

### Cannot Log In

- Verify your email and password are correct
- Check if your email has been verified (check your inbox)
- Ensure Supabase is properly configured in your .env file

### Email Verification Not Received

- Check your spam folder
- Verify the email address is correct
- Contact your administrator to resend the verification email

### Access Denied Errors

- Ensure you're logged in
- Check if your user role has the necessary permissions
- Contact your administrator if you need elevated permissions

### Database Connection Issues

- Verify EXPO_PUBLIC_SUPABASE_URL is set correctly
- Verify EXPO_PUBLIC_SUPABASE_ANON_KEY is set correctly
- Check your internet connection
- Verify your Supabase project is active

## Best Practices

1. **Use Strong Passwords**: Require users to use passwords with at least 8 characters, including uppercase, lowercase, numbers, and special characters
2. **Regular Audits**: Periodically review user accounts and remove inactive users
3. **Principle of Least Privilege**: Only grant admin access to users who absolutely need it
4. **Email Verification**: Always require email verification for new accounts
5. **Session Management**: Users should sign out when finished, especially on shared devices

## Database Schema

### user_profiles Table

```sql
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);
```

### Indexes

- `user_profiles_role_idx` on `role` column for efficient role-based queries
- `user_profiles_email_idx` on `email` column for efficient email lookups

## Support

For additional support or questions about the user management system, please contact your system administrator or refer to the Supabase documentation at https://supabase.com/docs
