/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as serviceAccount from "./service-account.json";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

interface SetRoleData {
  role: "shipper" | "carrier";
}

export const setUserRole = onCall<SetRoleData>(async (request) => {
  // Check if user is authenticated
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated.",
    );
  }

  const {role} = request.data;

  // Validate role
  if (role !== "shipper" && role !== "carrier") {
    throw new HttpsError(
      "invalid-argument",
      "Role must be either 'shipper' or 'carrier'.",
    );
  }

  try {
    // Set custom claims
    await admin.auth().setCustomUserClaims(request.auth.uid, {role});
    return {success: true, role};
  } catch (error) {
    console.error("Error setting custom claims:", error);
    throw new HttpsError("internal", "Error setting user role.");
  }
});

export const getUserRole = onCall(async (request) => {
  // Check if user is authenticated
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated.",
    );
  }

  try {
    const user = await admin.auth().getUser(request.auth.uid);
    return user.customClaims?.role || null;
  } catch (error) {
    console.error("Error getting user role:", error);
    throw new HttpsError("internal", "Error getting user role.");
  }
});
