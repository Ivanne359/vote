# Vote Application

A [Next.js](https://nextjs.org) project for online voting with Firebase integration.

## Environment Variables Setup

### Local Development

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Get your Firebase credentials:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to Project Settings (gear icon)
   - Copy your Web App Configuration

3. Fill in `.env.local` with your Firebase credentials:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### Vercel Deployment

1. Go to your Vercel project settings
2. Navigate to **Settings > Environment Variables**
3. Add all Firebase environment variables from above
4. Redeploy your project

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Pages

- **User Side**: http://localhost:3000
- **Admin Login**: http://localhost:3000/admin/login
- **Admin Dashboard**: http://localhost:3000/admin/dashboard (after login)

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)

## Deploy on Vercel

The easiest way to deploy is using the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
