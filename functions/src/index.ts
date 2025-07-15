import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as firestoreV1 from "firebase-functions/v1/firestore";
import * as functionsV1 from "firebase-functions/v1";
import { google } from "googleapis";

admin.initializeApp();

export const testFunction = functions.https.onRequest((request, response) => {
  response.send("Hello from Firebase!");
});

// Cloud Function to delete related shipping schedule entries when a purchase order is deleted
export const onPurchaseOrderDelete = firestoreV1
  .document("purchaseOrders/{purchaseOrderId}")
  .onDelete(async (snap: FirebaseFirestore.DocumentSnapshot, context) => {
    const purchaseOrderId = context.params.purchaseOrderId;
    const db = admin.firestore();
    const schedulesRef = db.collection("shippingSchedules");
    const relatedSchedules = await schedulesRef.where("purchaseOrderId", "==", purchaseOrderId).get();
    const deletePromises: Promise<FirebaseFirestore.WriteResult>[] = [];
    relatedSchedules.forEach(doc => {
      deletePromises.push(doc.ref.delete());
    });
    await Promise.all(deletePromises);
    return null;
  });

// Cloud Function to sync presence from Realtime Database to Firestore
export const syncPresenceToFirestore = functionsV1.database
  .ref("/status/{userId}")
  .onUpdate(async (change: any, context: any) => {
    const eventStatus = change.after.val();
    const userId = context.params.userId;
    // Update the user's Firestore document with the new status
    await admin.firestore().collection("users").doc(userId).set(
      {
        status: eventStatus.state,
        lastChanged: new Date(eventStatus.last_changed)
      },
      { merge: true }
    );
    return null;
  });

// Cloud Function: On partner request creation, set PO to Carrier Pending and remove from marketplace
// DISABLED: This function incorrectly sets isMarketplace: false on all loads, causing partnered loads to show up in both marketplace and partner request lists
// export const onPartnerRequestCreate = functions.firestore
//   .document('partnerRequests/{requestId}')
//   .onCreate(async (snap, context) => {
//     const request = snap.data();
//     const { poNumber, carrierId } = request;
//     if (!poNumber || !carrierId) return;

//     const db = admin.firestore();
//     // Find the PO
//     const poSnap = await db.collection('purchaseOrders').where('poNumber', '==', poNumber).get();
//     if (poSnap.empty) return;
//     const poRef = poSnap.docs[0].ref;

//     // Get carrier info
//     const carrierSnap = await db.collection('users').doc(carrierId).get();
//     const carrierData = carrierSnap.exists ? carrierSnap.data() : {};

//     // Update PO
//     await poRef.update({
//       status: 'Carrier Pending',
//       shippingScheduleStatus: 'Carrier Pending',
//       pendingCarrier: {
//         id: carrierId,
//         companyName: carrierData.companyName || '',
//         email: carrierData.email || '',
//         status: 'pending'
//       }
//     });

//     // Update all loads for this PO to remove from marketplace
//     const loadsSnap = await db.collection('loads').where('poNumber', '==', poNumber).get();
//     for (const loadDoc of loadsSnap.docs) {
//       await loadDoc.ref.update({ isMarketplace: false });
//     }
//   });

// For production, use Firebase environment config instead of hardcoding:
// const CLIENT_ID = functions.config().gmail.client_id;
// const CLIENT_SECRET = functions.config().gmail.client_secret;
// const REFRESH_TOKEN = functions.config().gmail.refresh_token;
const CLIENT_ID = "243323136379-7m2p94rulrdrpnqvp7ksgrf156avomka.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REFRESH_TOKEN = "1//04mLVKPil_eTdCgYIARAAGAQSNwF-L9IrW3GE1yM0tUCYkGTeTyp7zG5MnyawRGogQIQgDERUqM3qvSc-JW3RQft09px6vMu1tDg";
const ADMIN_EMAIL = "srose@norwalkls.com";

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

export const sendAdminEmail = functions.https.onCall(async (data, context) => {
  const { subject, message } = data;

  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

  const rawMessage = [
    `To: ${ADMIN_EMAIL}`,
    "Subject: " + subject,
    "Content-Type: text/html; charset=utf-8",
    "",
    message,
  ].join("\n");

  const encodedMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
    },
  });

  return { success: true };
});

export const sendDiscountEmail = functions.https.onCall(async (data, context) => {
  const { email } = data;
  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required');
  }

  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

  const subject = "Your 20% Discount for Tranzit.io";
  const message = `
    <h2>Thank you for subscribing to Tranzit.io!</h2>
    <p>As promised, here is your <b>20% discount</b> for your first year with us.</p>
    <p>Use code <b>WELCOME20</b> at signup or mention it to your onboarding specialist.</p>
    <p>We appreciate your feedback and look forward to helping your business grow!</p>
    <br>
    <small>If you have any questions, reply to this email.</small>
  `;

  const rawMessage = [
    `To: ${email}`,
    `Subject: ${subject}`,
    "Content-Type: text/html; charset=utf-8",
    "",
    message,
  ].join("\n");

  const encodedMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
    },
  });

  return { success: true };
});
