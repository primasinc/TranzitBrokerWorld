/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onCall} from "firebase-functions/v2/https";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

initializeApp();

const db = getFirestore();

export const helloWorld = onCall(async (request) => {
  // Add a timestamp to Firestore to verify db connection
  await db.collection("logs").add({
    message: "Hello from Firebase!",
    timestamp: new Date(),
    data: request.data,
  });

  return {
    message: "Hello from Firebase!",
    timestamp: new Date(),
  };
});
