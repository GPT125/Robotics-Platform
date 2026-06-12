import { initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAuth, GoogleAuthProvider, OAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// IMPORTANT: every initializer below is wrapped so that a misconfigured key,
// a blocked reCAPTCHA/App Check script, or a restricted WebView origin (e.g.
// Capacitor's capacitor:// scheme) can NEVER throw at module-evaluation time.
// A throw here would crash the very first import and leave the user staring at
// a black screen. Instead we log, fall back to null, and let the UI degrade
// gracefully (auth simply reports it is unavailable).
function warn(scope: string, error: unknown) {
  // eslint-disable-next-line no-console
  console.warn(`[firebase] ${scope} unavailable:`, error instanceof Error ? error.message : error);
}

let app: FirebaseApp | null = null;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  warn("initializeApp", error);
}

// App Check uses reCAPTCHA, which loads a third-party script and validates the
// page origin. This is the single most likely thing to throw on localhost or
// inside a native WebView, so it is fully isolated.
if (app && import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    warn("App Check", error);
  }
}

function safe<T>(scope: string, factory: (a: FirebaseApp) => T): T | null {
  if (!app) return null;
  try {
    return factory(app);
  } catch (error) {
    warn(scope, error);
    return null;
  }
}

export const firebaseReady = app !== null;
export const auth = safe<Auth>("auth", getAuth);
export const googleProvider = (() => {
  try {
    return new GoogleAuthProvider();
  } catch (error) {
    warn("GoogleAuthProvider", error);
    return null;
  }
})();
export const appleProvider = (() => {
  try {
    return new OAuthProvider("apple.com");
  } catch (error) {
    warn("OAuthProvider", error);
    return null;
  }
})();
export const db = safe<Firestore>("firestore", getFirestore);
export const functions = safe<Functions>("functions", getFunctions);
export const storage = safe<FirebaseStorage>("storage", getStorage);

export default app;
