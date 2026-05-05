# Google OAuth 2.0 Setup Guide

## Overview
Your CETVOTE application now supports Google OAuth 2.0 authentication. Users can sign in with their Gmail accounts, and their email will be automatically used for voting verification.

## What's Been Added

### New Files:
1. **`app/context/AuthContext.tsx`** - Authentication context for managing user login/logout
2. **`app/components/GoogleSignInButton.tsx`** - Google sign-in button component
3. **`app/components/GoogleUserProfile.tsx`** - User profile display with logout
4. **`app/vote/login/page.tsx`** - Login page for voters
5. **`app/vote/layout.tsx`** - Protected layout that requires authentication

### Modified Files:
1. **`lib/firebase.ts`** - Added Google OAuth Provider
2. **`app/layout.tsx`** - Added AuthProvider wrapper

## Firebase Console Configuration Steps

### Step 1: Enable Google Sign-In
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** → **Sign-in method**
4. Click **Google**
5. Enable it and save

### Step 2: Create OAuth 2.0 Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Add Authorized redirect URIs:
   - `http://localhost:3000` (for development)
   - `https://yourdomain.com` (for production)
   - `https://yourdomain.firebaseapp.com` (for Firebase Hosting)
   - `https://yourdomain.web.app` (for Firebase Hosting)

### Step 3: No Additional Environment Variables Needed
Your existing Firebase environment variables are sufficient:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## User Flow

1. **Home Page** - Users see the main election page
2. **Vote** - When users click to vote, they're redirected to `/vote/login`
3. **Google Sign-In** - Users sign in with their Google account (Gmail)
4. **Voting** - After authentication, users are redirected to `/vote/candidate` to cast votes
5. **Email Storage** - User's Gmail is stored with their vote record

## Features

✅ **One-Click Google Login** - Users sign in with their Gmail  
✅ **Secure OAuth 2.0** - Industry-standard authentication  
✅ **Automatic Email Capture** - Gmail address used for verification  
✅ **User Profile Display** - Shows user info and logout button  
✅ **Protected Routes** - Vote pages require authentication  
✅ **Automatic Redirect** - Non-logged-in users sent to login page  

## Testing Locally

1. Start your development server: `npm run dev`
2. Visit `http://localhost:3000/vote/login`
3. Click "Sign in with Google"
4. Use your Google account to sign in
5. You'll be redirected to the voting page

## Integrating GoogleUserProfile in Navbar

Add this to your existing Navbar component to show the logged-in user:

```tsx
import GoogleUserProfile from "@/app/components/GoogleUserProfile";

// In your Navbar JSX:
<GoogleUserProfile />
```

## Important Notes

1. **Development vs Production**: Google OAuth redirect URIs must match your domain
2. **Firebase Security Rules**: Update your Firestore rules to verify user authentication
3. **One Vote Per User**: Consider implementing vote validation in your API routes to prevent duplicate votes per email
4. **User Data**: User email is automatically available via `user.email` after successful Google login

## Troubleshooting

### "Sign-in failed" error
- Verify Google Sign-In is enabled in Firebase Console
- Check that redirect URIs match your application domain
- Check browser console for detailed error messages

### User not redirected after login
- Ensure `app/vote/layout.tsx` is in place
- Check that auth context is properly wrapped in `app/layout.tsx`

### "Firebase Auth is not initialized"
- Ensure all Firebase environment variables are set
- Check `.env.local` has correct values

## Security Considerations

✅ OAuth 2.0 tokens are handled by Firebase  
✅ Tokens expire automatically  
✅ Sensitive data not stored in localStorage  
✅ Email verification possible via Firebase  
✅ HTTPS required in production  

## Next Steps

1. Configure Firebase Console settings (see Step 1-3 above)
2. Test locally with `npm run dev`
3. Add `GoogleUserProfile` to your Navbar
4. Deploy to production with correct redirect URIs
5. Monitor vote submissions to track user emails
