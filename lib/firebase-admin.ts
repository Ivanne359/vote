import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminApp: App | null = null;

const getAdminCredentials = () => {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson) as {
        project_id: string;
        client_email: string;
        private_key: string;
      };

      if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
        return null;
      }

      return cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
      });
    } catch {
      return null;
    }
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return cert({ projectId, clientEmail, privateKey });
};

const initAdminApp = () => {
  if (adminApp) {
    return adminApp;
  }

  if (getApps().length > 0) {
    adminApp = getApps()[0] ?? null;
    return adminApp;
  }

  const credential = getAdminCredentials();
  if (!credential) {
    return null;
  }

  adminApp = initializeApp({ credential });
  return adminApp;
};

export const adminAuth = () => {
  const app = initAdminApp();
  return app ? getAuth(app) : null;
};