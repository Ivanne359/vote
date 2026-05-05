# 🚀 Quick Start Guide - Email Verification with Google OAuth

## Installation Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Environment Variables

Create or update `.env.local` file in your project root:

```env
# Firebase (keep existing)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# NEW: Gmail Configuration for Email Verification
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### Step 3: Get Gmail App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer" (or your device)
3. Google will generate a 16-character password
4. Copy and paste as `EMAIL_PASSWORD` in `.env.local`

**Example `.env.local`:**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyD...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=cetvote.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=cetvote-abc123
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=cetvote-abc123.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123...

EMAIL_USER=cetvote@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
```

### Step 4: Test Locally

```bash
npm run dev
```

Visit: `http://localhost:3000`

---

## Testing the Flow

### Test 1: Login with Google + Verification
1. Click "Sign in with Google"
2. Select your `@hcdc.edu.ph` Google account
3. Check your email for 6-digit code
4. Enter code in the modal
5. You'll be redirected to voting page ✓

### Test 2: Register with Google + Verification  
1. Click "Register now"
2. Click "Sign in with Google"
3. Select `@hcdc.edu.ph` account
4. Verify email code
5. Email auto-fills in form
6. Complete registration ✓

### Test 3: Domain Validation
1. Try signing in with non-@hcdc.edu.ph email
2. Should see error ✓

---

## 📧 Email Testing (Dev Mode)

During development, if email sending fails:
- Check browser console
- You'll see `testCode: "123456"` in the response
- Use this code for testing
- No real email needed during dev

---

## Files Changed

### New Files:
- ✅ `app/api/auth/send-verification-code/route.ts` - Email API
- ✅ `app/components/VerificationCodeModal.tsx` - Verification UI
- ✅ `EMAIL_VERIFICATION_SETUP.md` - Full setup documentation

### Updated Files:
- ✅ `app/context/AuthContext.tsx` - Added verification functions
- ✅ `app/page.tsx` - Added Google OAuth with verification
- ✅ `package.json` - Added nodemailer dependency

---

## What Happens After Verification?

### For Google Sign-In (Login):
```
Google Login → Email Verification → Redirect to /vote/candidate
```

### For Google Sign-In (Registration):
```
Google Login → Email Verification → Email Auto-fills Form → Register
```

User's Gmail automatically becomes their verified email for voting.

---

## 🔒 Security Features

✅ Domain restricted to `@hcdc.edu.ph` only
✅ 6-digit codes expire after 10 minutes
✅ One verification per email
✅ OAuth 2.0 standard authentication
✅ No plaintext passwords stored
✅ Secure cookie handling

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Only @hcdc.edu.ph emails allowed" | Use correct Gmail account |
| Code not received | Check spam folder / verify EMAIL_USER |
| Code expired | Request new code by signing in again |
| Firebase not configured | Check `.env.local` variables |
| Module not found errors | Run `npm install` |

---

## Production Deployment

1. Set environment variables on your hosting platform
2. Update Google Cloud redirect URIs
3. Configure HTTPS
4. Test email sending works
5. Monitor logs for errors

See `EMAIL_VERIFICATION_SETUP.md` for detailed production setup.

---

## Next Steps

1. ✅ Install packages: `npm install`
2. ✅ Configure `.env.local` with email & Firebase
3. ✅ Get Gmail App Password
4. ✅ Run `npm run dev`
5. ✅ Test Google OAuth with verification
6. ✅ Deploy to production

---

**You're all set! Start voting securely.** 🎉
