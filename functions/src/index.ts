import { onDocumentDeleted, onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onValueUpdated } from "firebase-functions/v2/database";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { google } from "googleapis";
import * as cors from "cors";

admin.initializeApp();

// Initialize CORS middleware
const corsHandler = cors({ origin: true });

export const testFunction = functions.https.onRequest((request, response) => {
  response.send("Hello from Firebase!");
});

// Cloud Function to delete related shipping schedule entries when a purchase order is deleted
export const onPurchaseOrderDelete = onDocumentDeleted("purchaseOrders/{purchaseOrderId}", async (event) => {
  const purchaseOrderId = event.params.purchaseOrderId;
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
export const syncPresenceToFirestore = onValueUpdated("/status/{userId}", async (event) => {
  const eventStatus = event.data.after.val();
  const userId = event.params.userId;
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
// export const onPartnerRequestCreate = onDocumentCreated("partnerRequests/{requestId}", async (event) => {
//   const startTime = Date.now();
//   const request = event.data?.data();
//   if (!request) {
//     console.error('[onPartnerRequestCreate] No data in partner request');
//     return;
//   }
//   
//   const { poNumber, carrierId, loadId, userId } = request;
//   
//   if (!poNumber || !carrierId || !userId) {
//     console.error('[onPartnerRequestCreate] Missing required fields:', { poNumber, carrierId, userId });
//     return;
//   }

//   const db = admin.firestore();
//   
//   try {
//     console.log('[onPartnerRequestCreate] Processing partner request:', { poNumber, carrierId, userId });
//     
//     // 1. Find and update the PO
//     const poSnap = await db.collection('purchaseOrders').where('poNumber', '==', poNumber).get();
//     if (poSnap.empty) {
//       console.error('[onPartnerRequestCreate] PO not found for poNumber:', poNumber);
//       return;
//     }
//     const poRef = poSnap.docs[0].ref;
//     const poData = poSnap.docs[0].data();

//     // Get carrier info for notification
//     const carrierSnap = await db.collection('users').doc(carrierId).get();
//     const carrierData = carrierSnap.exists ? carrierSnap.data() : {};

//     // Update PO with carrier pending status
//     await poRef.update({
//       status: 'Carrier Pending',
//       shippingScheduleStatus: 'Carrier Pending',
//       pendingCarrier: {
//         id: carrierId,
//         companyName: carrierData?.companyName || carrierData?.displayName || '',
//         email: carrierData?.email || '',
//         status: 'pending',
//         createdAt: admin.firestore.FieldValue.serverTimestamp()
//       },
//       updatedAt: admin.firestore.FieldValue.serverTimestamp()
//     });

//     // 2. Update all loads for this PO to remove from marketplace
//     const loadsSnap = await db.collection('loads').where('poNumber', '==', poNumber).get();
//     let updatedLoads = 0;
//     const loadUpdatePromises = loadsSnap.docs.map(async (loadDoc) => {
//       const loadData = loadDoc.data();
//       
//       // Only update if it's currently a marketplace load (no carrierId)
//       if (loadData.isMarketplace === true && !loadData.carrierId) {
//         console.log('[onPartnerRequestCreate] Updating load to partner:', loadDoc.id);
//         updatedLoads++;
//         return loadDoc.ref.update({
//           isMarketplace: false,
//           carrierId: carrierId,
//           status: 'pending',
//           updatedAt: admin.firestore.FieldValue.serverTimestamp()
//         });
//       } else {
//         console.log('[onPartnerRequestCreate] Load already partnered or invalid state:', loadDoc.id, loadData);
//       }
//     });

//     await Promise.all(loadUpdatePromises);

//     // 3. Create notification for shipper
//     await db.collection('notifications').add({
//       userId: userId,
//       carrierId: carrierId,
//       recipientId: userId,
//       poNumber: poNumber,
//       status: 'pending',
//       type: 'partner_request',
//       message: `${carrierData?.companyName || carrierData?.displayName || 'A carrier'} has requested to partner on PO ${poNumber}`,
//       createdAt: admin.firestore.FieldValue.serverTimestamp(),
//       updatedAt: admin.firestore.FieldValue.serverTimestamp(),
//       requiresAction: true
//     });

//     const duration = Date.now() - startTime;
//     console.log(`[onPartnerRequestCreate] Successfully processed partner request for PO: ${poNumber} (${updatedLoads} loads updated, ${duration}ms)`);
//     
//     // Production monitoring: Log success metrics
//     await db.collection('metrics').doc('partnerRequests').set({
//       totalProcessed: admin.firestore.FieldValue.increment(1),
//       lastProcessed: admin.firestore.FieldValue.serverTimestamp(),
//       averageProcessingTime: duration
//     }, { merge: true });
//     
//   } catch (error) {
//     const duration = Date.now() - startTime;
//     console.error(`[onPartnerRequestCreate] Error processing partner request (${duration}ms):`, error);
//     
//     // Production monitoring: Log error metrics
//     await db.collection('metrics').doc('partnerRequests').set({
//       totalErrors: admin.firestore.FieldValue.increment(1),
//       lastError: {
//         timestamp: admin.firestore.FieldValue.serverTimestamp(),
//         error: error instanceof Error ? error.message : String(error),
//         poNumber,
//         carrierId
//       }
//     }, { merge: true });
//     
//     // In production, you might want to send this to an error monitoring service
//     throw error;
//   }
// });

// Cloud Function: On partner request status change
// DISABLED: This function may conflict with existing workflows
// export const onPartnerRequestStatusChange = onDocumentUpdated("partnerRequests/{requestId}", async (event) => {
//   const beforeData = event.data?.before.data();
//   const afterData = event.data?.after.data();
//   
//   if (!beforeData || !afterData) {
//     console.error('[onPartnerRequestStatusChange] No data in partner request');
//     return;
//   }
//   
//   // Only process if status changed
//   if (beforeData.status === afterData.status) {
//     return;
//   }

//   const { poNumber, carrierId, userId } = afterData;
//   if (!poNumber || !carrierId || !userId) {
//     return;
//   }

//   const db = admin.firestore();

//   try {
//     if (afterData.status === 'accepted') {
//       // Update PO to Active
//       const poSnap = await db.collection('purchaseOrders').where('poNumber', '==', poNumber).get();
//       if (!poSnap.empty) {
//         await poSnap.docs[0].ref.update({
//           status: 'Active',
//           shippingScheduleStatus: 'Active',
//           selectedCarrier: {
//             id: carrierId,
//             status: 'active'
//           },
//           updatedAt: admin.firestore.FieldValue.serverTimestamp()
//         });
//       }

//       // Update loads to Active
//       const loadsSnap = await db.collection('loads').where('poNumber', '==', poNumber).get();
//       const loadUpdatePromises = loadsSnap.docs.map(loadDoc => 
//         loadDoc.ref.update({
//           status: 'active',
//           updatedAt: admin.firestore.FieldValue.serverTimestamp()
//         })
//       );
//       await Promise.all(loadUpdatePromises);

//     } else if (afterData.status === 'rejected' || afterData.status === 'cancelled') {
//       // Reset loads back to marketplace
//       const loadsSnap = await db.collection('loads').where('poNumber', '==', poNumber).get();
//       const loadUpdatePromises = loadsSnap.docs.map(loadDoc => 
//         loadDoc.ref.update({
//           isMarketplace: true,
//           carrierId: null,
//           status: 'open',
//           updatedAt: admin.firestore.FieldValue.serverTimestamp()
//         })
//       );
//       await Promise.all(loadUpdatePromises);

//       // Reset PO status
//       const poSnap = await db.collection('purchaseOrders').where('poNumber', '==', poNumber).get();
//       if (!poSnap.empty) {
//         await poSnap.docs[0].ref.update({
//           status: 'Open',
//           shippingScheduleStatus: 'Open',
//           pendingCarrier: null,
//           selectedCarrier: null,
//           updatedAt: admin.firestore.FieldValue.serverTimestamp()
//         });
//       }
//     }
//   } catch (error) {
//     console.error('[onPartnerRequestStatusChange] Error processing status change:', error);
//     throw error;
//   }
// });

// For production, use Firebase environment config instead of hardcoding:
// const CLIENT_ID = functions.config().gmail.client_id;
// const CLIENT_SECRET = functions.config().gmail.client_secret;
// const REFRESH_TOKEN = functions.config().gmail.refresh_token;
const CLIENT_ID = "243323136379-7m2p94rulrdrpnqvp7ksgrf156avomka.apps.googleusercontent.com";
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || "YOUR_CLIENT_SECRET_HERE";
const REFRESH_TOKEN = process.env.GOOGLE_OAUTH_REFRESH_TOKEN || "YOUR_REFRESH_TOKEN_HERE";
const ADMIN_EMAIL = "srose@norwalkls.com";

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

export const sendAdminEmail = functions.https.onCall(async (data: any, context) => {
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

export const sendDiscountEmail = functions.https.onCall(async (data: any, context) => {
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

// Cloud Function to handle new user registration approval
export const onUserCreate = onDocumentCreated("users/{userId}", async (event) => {
  const snap = event.data;
  const userData = snap?.data();
  const userId = event.params.userId;

  console.log('onUserCreate triggered for userId:', userId);
  console.log('User data received:', userData);

  if (!userData || !snap) {
    console.error('No user data found for userId:', userId);
    return null;
  }

  // Set user status to pending approval
  await snap.ref.update({
    status: 'pending',
    approvalStatus: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Send admin notification email
  try {
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

    const subject = "New User Registration - Approval Required";
    const message = `
      <h2>New User Registration</h2>
      <p>A new user has registered and requires approval:</p>
      <ul>
        <li><strong>Company:</strong> ${userData.companyName || 'N/A'}</li>
        <li><strong>Email:</strong> ${userData.email || 'N/A'}</li>
        <li><strong>Phone:</strong> ${userData.phoneNumber || 'N/A'}</li>
        <li><strong>User Type:</strong> ${userData.userType || 'N/A'}</li>
        <li><strong>User ID:</strong> ${userId}</li>
      </ul>
      <p>Please review and approve this user in the admin dashboard.</p>
    `;

    const rawMessage = [
      `To: ${ADMIN_EMAIL}`,
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

    console.log('Admin notification sent for new user:', userId);
  } catch (error) {
    console.error('Failed to send admin notification:', error);
  }

  return null;
});

// Cloud Function to approve users
export const approveUser = functions.https.onCall(async (data: any, context) => {
  const { userId } = data;

  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'User ID is required');
  }

  const db = admin.firestore();

  try {
    // Update user status to approved
    await db.collection('users').doc(userId).update({
      status: 'approved',
      approvalStatus: 'approved',
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Send approval email to user
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (userData && userData.email) {
      const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

      const subject = "Your Tranzit.io Account Has Been Approved!";
      const message = `
        <h2>Welcome to Tranzit.io!</h2>
        <p>Your account has been approved and you can now access the platform.</p>
        <p><strong>Company:</strong> ${userData.companyName || 'N/A'}</p>
        <p><strong>User Type:</strong> ${userData.userType || 'N/A'}</p>
        <p>You can now log in to your account and start using Tranzit.io.</p>
        <br>
        <p>If you have any questions, please contact support.</p>
      `;

      const rawMessage = [
        `To: ${userData.email}`,
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
    }

    return { success: true, message: 'User approved successfully' };
  } catch (error) {
    console.error('Error approving user:', error);
    throw new functions.https.HttpsError('internal', 'Failed to approve user');
  }
});

// Cloud Function to set admin role (one-time setup)
export const setupAdminRole = functions.https.onCall(async (data: any, context: any) => {
  try {
    console.log('setupAdminRole called with data:', data);
    
    // Check if user is authenticated
    if (!context?.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const { email } = data;
    if (!email) {
      throw new functions.https.HttpsError('invalid-argument', 'Email is required');
    }
    
    // For now, only allow srose@norwalkls.com to be set as admin
    if (email !== 'srose@norwalkls.com') {
      throw new functions.https.HttpsError('permission-denied', 'Only srose@norwalkls.com can be set as admin');
    }
    
    // Check if user exists in Firebase Auth
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('Found user:', userRecord.uid);
    } catch (error) {
      throw new functions.https.HttpsError('not-found', `User with email ${email} not found in Firebase Auth`);
    }
    
    // Set custom claims for admin role
    await admin.auth().setCustomUserClaims(userRecord.uid, { 
      role: 'admin',
      isAdmin: true 
    });
    
    console.log('Admin role set successfully for:', email);
    return { 
      success: true, 
      message: `Admin role set successfully for ${email}`,
      uid: userRecord.uid
    };
  } catch (error) {
    console.error('Error setting admin role:', error);
    
    // If it's already a Firebase HttpsError, re-throw it
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    // Otherwise, wrap it in a generic error
    throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Unknown error');
  }
});

// Cloud Function to check if user is admin
export const checkAdminStatus = functions.https.onCall(async (data: any, context: any) => {
  if (!context?.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userEmail = context.auth.token.email;
  
  // Only srose@norwalkls.com is admin
  const isAdmin = userEmail === 'srose@norwalkls.com';
  
  return { isAdmin, email: userEmail };
});

// Cloud Function to get all admin users (for future expansion)
export const getAdminUsers = functions.https.onCall(async (data: any, context: any) => {
  if (!context?.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    // List all users and check for admin claims
    const listUsersResult = await admin.auth().listUsers();
    const adminUsers = listUsersResult.users.filter(user => 
      user.customClaims?.role === 'admin' || user.customClaims?.isAdmin === true
    );

    return { 
      adminUsers: adminUsers.map(user => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      }))
    };
  } catch (error) {
    console.error('Error getting admin users:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get admin users');
  }
});

// Cloud Function to add personnel
export const addPersonnel = functions.https.onCall(async (data: any, context: any) => {
  if (!context?.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { email, name, role, department, isActive } = data;

  if (!email || !name || !role) {
    throw new functions.https.HttpsError('invalid-argument', 'Email, name, and role are required');
  }

  try {
    const db = admin.firestore();
    
    // Check if personnel already exists
    const personnelRef = db.collection('personnel');
    const existingPersonnel = await personnelRef.where('email', '==', email).get();
    
    if (!existingPersonnel.empty) {
      throw new functions.https.HttpsError('already-exists', 'Personnel with this email already exists');
    }

    // Add new personnel
    const newPersonnel = await personnelRef.add({
      email,
      name,
      role,
      department: department || '',
      isActive: isActive !== false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Personnel added successfully:', newPersonnel.id);
    return {
      success: true,
      message: 'Personnel added successfully',
      id: newPersonnel.id
    };
  } catch (error) {
    console.error('Error adding personnel:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to add personnel');
  }
});

// Cloud Function to update personnel status
export const updatePersonnelStatus = functions.https.onCall(async (data: any, context: any) => {
  if (!context?.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { personnelId, isActive } = data;

  if (!personnelId) {
    throw new functions.https.HttpsError('invalid-argument', 'Personnel ID is required');
  }

  try {
    const db = admin.firestore();
    const personnelRef = db.collection('personnel').doc(personnelId);
    
    await personnelRef.update({
      isActive: isActive,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      message: 'Personnel status updated successfully'
    };
  } catch (error) {
    console.error('Error updating personnel status:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update personnel status');
  }
});

// Cloud Function to get all personnel
export const getPersonnel = functions.https.onCall(async (data: any, context: any) => {
  if (!context?.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const db = admin.firestore();
    const personnelRef = db.collection('personnel');
    const querySnapshot = await personnelRef.orderBy('createdAt', 'desc').get();
    
    const personnel = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      success: true,
      personnel
    };
  } catch (error) {
    console.error('Error getting personnel:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get personnel');
  }
});
