# CETVOTE - Google OAuth 2.0 with Email Verification Setup

## ✨ New Features Implemented

Your voting system now has **enterprise-grade Google OAuth 2.0 authentication** with the following features:

### 1. **Domain-Restricted Google Sign-In**
- Only `@hcdc.edu.ph` email addresses allowed
- Automatic domain validation after Google sign-in
- Non-HCDC emails are immediately rejected

### 2. **6-Digit Email Verification Code**
- Automatic code generation and email delivery
- 10-minute expiration for security
- User-friendly verification modal
- Code resend capability

### 3. **Secure Authentication Flow**

#### Login with Google:
1. Click "Sign in with Google"
2. Select your `@hcdc.edu.ph` Gmail account
3. Receive 6-digit verification code via email
4. Enter code to verify
5. Automatically redirected to voting page

#### Registration with Google:
1. Click "Sign in with Google" on register side
2. Select your `@hcdc.edu.ph` Gmail account
3. Receive 6-digit verification code via email
4. Enter code to verify
5. Email auto-fills in registration form
6. Complete registration form with strong password
7. Account created

---

## 📋 Setup Requirements

### Email Service Setup (Required)

To send verification codes, configure your email service in `.env.local`:

```env
# Gmail Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

#### Getting Gmail App Password:
1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and "Windows Computer"
3. Google generates a 16-character password
4. Copy this as your `EMAIL_PASSWORD`

**⚠️ WARNING:** Never use your regular Gmail password! Always use App Password.

### Firebase Configuration

Ensure your `.env.local` has:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=xxxxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxxxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxxxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxxxx
```

### Google Cloud Console Configuration

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. **Create Credentials** → **OAuth 2.0 Client ID**
4. Add **Authorized redirect URIs**:
   ```
   http://localhost:3000
   https://yourdomain.com
   https://yourdomain.firebaseapp.com
   https://yourdomain.web.app
   ```
5. Save your Client ID

---

## 🔐 Security Features

✅ **Email Domain Validation** - Only HCDC students (@hcdc.edu.ph)  
✅ **6-Digit Verification Codes** - Time-limited (10 minutes)  
✅ **OAuth 2.0 Standard** - Industry-standard security  
✅ **HTTP-Only Cookies** - No XSS vulnerabilities  
✅ **HTTPS Required** - In production  
✅ **Timing-Safe Comparison** - Protection against timing attacks  

---

## 📁 New Files Created

| File | Purpose |
|------|---------|
| `app/api/auth/send-verification-code/route.ts` | Sends and verifies 6-digit codes |
| `app/components/VerificationCodeModal.tsx` | Modal UI for code entry |
| `app/context/AuthContext.tsx` | Updated with verification functions |

---

## 🧪 Testing Locally

### Prerequisites:
- npm packages installed
- Firebase configured
- Gmail app password set

### Test Steps:

1. **Start development server:**
   ```bash
   npm run dev
   ```

2. **Test Google Login:**
   - Visit `http://localhost:3000`
   - Click "Sign in with Google"
   - Sign in with a `@hcdc.edu.ph` account
   - Check console for verification code (dev mode)
   - Or check your Gmail for the code
   - Enter the 6-digit code
   - Should redirect to voting page

3. **Test Registration:**
   - Click "Register now"
   - Click "Sign in with Google"
   - Follow same verification flow
   - Email auto-fills in registration form
   - Complete registration

4. **Test Domain Validation:**
   - Try signing in with non-HCDC email
   - Should see error: "Only @hcdc.edu.ph email addresses are allowed"

---

## 🔌 API Endpoints

### Send Verification Code
```
POST /api/auth/send-verification-code
Content-Type: application/json

{
  "email": "student@hcdc.edu.ph"
}

Response: 200 OK
{
  "success": true,
  "message": "Verification code sent to your email",
  "testCode": "123456" // Only in dev mode
}
```

### Verify Code
```
PUT /api/auth/send-verification-code
Content-Type: application/json

{
  "email": "student@hcdc.edu.ph",
  "code": "123456"
}

Response: 200 OK
{
  "success": true,
  "message": "Email verified successfully"
}
```

---

## 🛠️ Development vs Production

### Development:
- Codes displayed in browser console
- Test codes work immediately
- Email not required

### Production:
- Codes only sent via email
- Must have working Gmail configuration
- HTTPS required
- Proper domain in Firebase

---

## ⚠️ Troubleshooting

### "Only @hcdc.edu.ph email addresses allowed"
- Ensure you're using an @hcdc.edu.ph Google account
- Not a personal Gmail account

### "Verification code not received"
- Check spam folder in Gmail
- Ensure EMAIL_USER and EMAIL_PASSWORD are correct
- Check Firebase Cloud Functions logs

### "Invalid verification code"
- Code is case-insensitive (if needed)
- Code expires after 10 minutes
- Request a new code by signing in again

### Firebase not configured
- Double-check all `.env.local` variables
- Restart `npm run dev`
- Check browser console for details

---

## 📊 User Data Flow

```
Google Sign-In
     ↓
Domain Validation (@hcdc.edu.ph)
     ↓
Generate 6-Digit Code
     ↓
Send via Email
     ↓
User Enters Code
     ↓
Code Verification
     ↓
For Login: Redirect to /vote/candidate
For Register: Auto-fill email + continue registration
```

---

## 🚀 Production Deployment

### Pre-Deployment Checklist:

- [ ] Gmail App Password configured
- [ ] All environment variables set in hosting platform
- [ ] Google Cloud redirect URIs include production domain
- [ ] Firebase security rules configured
- [ ] Database schema prepared for vote verification
- [ ] Email templates customized
- [ ] Test email delivery works
- [ ] HTTPS enabled on domain
- [ ] Rate limiting configured (optional)

### After Deployment:

1. Test sign-in on production URL
2. Verify email delivery works
3. Monitor error logs
4. Set up email backup if needed

---

## 📝 Notes

- Each `@hcdc.edu.ph` email can only register once
- Verification codes are tied to email addresses
- Codes are stored in memory (consider Redis for production)
- One vote per verified email
- User profile uses Google profile picture if available

---

## 💡 Future Enhancements

- [ ] SMS verification as backup
- [ ] Social media profile linking
- [ ] Two-factor authentication (2FA)
- [ ] Biometric authentication
- [ ] Account recovery options
- [ ] Admin email verification dashboard

---

**Setup Complete!** Your system now has enterprise-grade authentication. 🎉
