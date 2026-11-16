import admin from "firebase-admin";
import { readFileSync } from "node:fs";
import { env } from "./env";

function initializeFirebase(): admin.app.App {
  if (admin.apps.length > 0) return admin.app();

  const options: admin.AppOptions = {};
  if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const raw = readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8");
    const serviceAccount = JSON.parse(raw) as admin.ServiceAccount;
    options.credential = admin.credential.cert(serviceAccount);
  } else {
    options.credential = admin.credential.applicationDefault();
  }
  if (env.FIREBASE_PROJECT_ID) options.projectId = env.FIREBASE_PROJECT_ID;

  return admin.initializeApp(options);
}

const app = initializeFirebase();
export const firestore = app.firestore();
export const chatCollection = (chatId: string) =>
  firestore.collection(env.FIRESTORE_CHATS_COLLECTION).doc(chatId);
