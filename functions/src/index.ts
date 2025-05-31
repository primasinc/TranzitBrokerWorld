import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as firestoreV1 from "firebase-functions/v1/firestore";

admin.initializeApp();

export const testFunction = functions.https.onRequest((request, response) => {
  response.send("Hello from Firebase!");
});

// Cloud Function to delete related shipping schedule entries when a purchase order is deleted
export const onPurchaseOrderDelete = firestoreV1
  .document('purchaseOrders/{purchaseOrderId}')
  .onDelete(async (snap: FirebaseFirestore.DocumentSnapshot, context) => {
    const purchaseOrderId = context.params.purchaseOrderId;
    const db = admin.firestore();
    const schedulesRef = db.collection('shippingSchedules');
    const relatedSchedules = await schedulesRef.where('purchaseOrderId', '==', purchaseOrderId).get();
    const deletePromises: Promise<FirebaseFirestore.WriteResult>[] = [];
    relatedSchedules.forEach(doc => {
      deletePromises.push(doc.ref.delete());
    });
    await Promise.all(deletePromises);
    return null;
  });
