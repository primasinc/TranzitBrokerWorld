import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as firestoreV1 from "firebase-functions/v1/firestore";
import * as functionsV1 from "firebase-functions/v1";

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
export const onPartnerRequestCreate = functions.firestore
  .document('partnerRequests/{requestId}')
  .onCreate(async (snap, context) => {
    const request = snap.data();
    const { poNumber, carrierId } = request;
    if (!poNumber || !carrierId) return;

    const db = admin.firestore();
    // Find the PO
    const poSnap = await db.collection('purchaseOrders').where('poNumber', '==', poNumber).get();
    if (poSnap.empty) return;
    const poRef = poSnap.docs[0].ref;

    // Get carrier info
    const carrierSnap = await db.collection('users').doc(carrierId).get();
    const carrierData = carrierSnap.exists ? carrierSnap.data() : {};

    // Update PO
    await poRef.update({
      status: 'Carrier Pending',
      shippingScheduleStatus: 'Carrier Pending',
      pendingCarrier: {
        id: carrierId,
        companyName: carrierData.companyName || '',
        email: carrierData.email || '',
        status: 'pending'
      }
    });

    // Update all loads for this PO to remove from marketplace
    const loadsSnap = await db.collection('loads').where('poNumber', '==', poNumber).get();
    for (const loadDoc of loadsSnap.docs) {
      await loadDoc.ref.update({ isMarketplace: false });
    }
  });
