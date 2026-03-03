// ============================================================
// FIREBASE ADMIN SDK - Server-side only
// Used in API routes and middleware for token verification
// ============================================================
import admin from "firebase-admin";
import type { ServiceAccount } from "firebase-admin";

function initFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Handle both: double-quoted .env (dotenv expands \n → real newline) and unquoted (literal \n)
  const rawKey = process.env.FIREBASE_PRIVATE_KEY ?? "";
  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin environment variables are not set. " +
        "Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
    );
  }

  const serviceAccount: ServiceAccount = {
    projectId,
    clientEmail,
    privateKey,
  };

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Singleton initialization
let _adminApp: admin.app.App | null = null;

function getAdminApp(): admin.app.App {
  if (!_adminApp) {
    _adminApp = initFirebaseAdmin();
  }
  return _adminApp;
}

// ---- Token Verification ----
export async function verifyIdToken(idToken: string) {
  const app = getAdminApp();
  const auth = admin.auth(app);
  const decoded = await auth.verifyIdToken(idToken);
  return decoded;
}

// ---- User Management ----
export async function createFirebaseUser(email: string, password: string) {
  const app = getAdminApp();
  const auth = admin.auth(app);
  return auth.createUser({ email, password });
}

export async function deleteFirebaseUser(uid: string) {
  const app = getAdminApp();
  const auth = admin.auth(app);
  await auth.deleteUser(uid);
}

export async function getFirebaseUser(uid: string) {
  const app = getAdminApp();
  const auth = admin.auth(app);
  return auth.getUser(uid);
}

export async function setCustomClaims(
  uid: string,
  claims: Record<string, unknown>
) {
  const app = getAdminApp();
  const auth = admin.auth(app);
  await auth.setCustomUserClaims(uid, claims);
}

export { admin };
