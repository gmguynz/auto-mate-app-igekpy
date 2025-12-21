
# User ID Login Fix for Web/Preview

## Issue
User ID login was failing in the preview link due to CORS (Cross-Origin Resource Sharing) errors. The Edge Function `lookup-user-id` was not handling OPTIONS preflight requests properly, causing browsers to block the requests.

## Solution Implemented

### 1. Updated Edge Function with CORS Support
The `lookup-user-id` Edge Function (version 3) now includes:

- **CORS Headers**: Added proper CORS headers to all responses:
  ```typescript
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  ```

- **OPTIONS Handler**: Added explicit handling for OPTIONS preflight requests:
  ```typescript
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    });
  }
  ```

- **All Responses Include CORS**: Every response (success, error, exception) now includes CORS headers.

### 2. Enhanced Login Screen Error Handling
Updated `app/(auth)/login.tsx` with:

- Better error messages for network/CORS issues
- Specific handling for different error types (network, authentication, etc.)
- Improved user feedback for connection problems

### 3. Web Styles Support
Created `styles/webStyles.ts` with helper functions for web-specific styling to ensure proper cursor and interaction behavior.

## Testing the Fix

### Test User ID Login:
1. Open the preview link in a web browser
2. Enter a user ID (not an email) in the login field
3. Enter the password
4. Click "Sign In"

The login should now work without CORS errors. The Edge Function will:
1. Receive the OPTIONS preflight request and respond with 200 OK
2. Receive the POST request with the user_id
3. Look up the email in the database (case-insensitive)
4. Return the email to the client
5. Client uses the email to authenticate with Supabase Auth

### Expected Behavior:
- ✅ No CORS errors in browser console
- ✅ User ID lookup completes successfully
- ✅ Login proceeds with the found email
- ✅ User is redirected to the app after successful login

### Error Messages:
- "Network error. Please check your internet connection and try again." - Connection issues
- "User ID not found. Please check your user ID or contact your administrator." - Invalid user ID
- "Invalid password. Please check your password and try again." - Wrong password

## Technical Details

### Edge Function Endpoint:
```
https://sykerdryyaorziqjglwb.supabase.co/functions/v1/lookup-user-id
```

### Request Format:
```json
{
  "user_id": "user123"
}
```

### Response Format (Success):
```json
{
  "email": "user@example.com"
}
```

### Response Format (Error):
```json
{
  "error": {
    "message": "User ID not found"
  }
}
```

## Verification

To verify the fix is working:

1. Check Edge Function logs for successful OPTIONS requests (should return 200, not 500)
2. Check browser console for any CORS errors (should be none)
3. Test login with both email and user ID
4. Verify case-insensitive user ID lookup works

## Notes

- The Edge Function has `verify_jwt: false` because it needs to be called by unauthenticated users
- User ID lookup is case-insensitive using PostgreSQL's `ilike` operator
- The function uses the service role key to bypass RLS policies for the lookup
- All responses include proper CORS headers for web compatibility
