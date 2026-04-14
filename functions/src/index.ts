import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { Resend } from "resend";

admin.initializeApp();

const resendApiKey = defineSecret("RESEND_API_KEY");

interface InviteUserData {
  email: string;
  displayName: string;
  role: "caseworker" | "supervisor" | "state_admin";
}

export const inviteUser = onCall(
  { secrets: [resendApiKey] },
  async (request) => {
    // Verify caller is authenticated
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in.");
    }

    // Verify caller is state_admin or platform_admin
    const callerDoc = await admin
      .firestore()
      .collection("users")
      .doc(request.auth.uid)
      .get();

    const caller = callerDoc.data();
    if (
      !caller ||
      !["state_admin", "platform_admin"].includes(caller.role)
    ) {
      throw new HttpsError("permission-denied", "Must be an admin.");
    }

    const { email, displayName, role } = request.data as InviteUserData;
    const stateId: string = caller.stateId;

    // Create the Firebase Auth user
    let userRecord: admin.auth.UserRecord;
    try {
      userRecord = await admin.auth().createUser({
        email,
        displayName,
        emailVerified: false,
      });
    } catch (err: unknown) {
      const firebaseErr = err as { code?: string };
      if (firebaseErr.code === "auth/email-already-exists") {
        throw new HttpsError("already-exists", "A user with this email already exists.");
      }
      throw new HttpsError("internal", "Failed to create user account.");
    }

    // Create Firestore user doc — active immediately (admin-created)
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName,
      role,
      stateId,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: request.auth.uid,
    });

    // Write audit log
    await admin.firestore().collection("audit").add({
      action: "user_created",
      targetUid: userRecord.uid,
      performedBy: request.auth.uid,
      stateId,
      role,
      email,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Generate account-setup link (password reset link, custom email copy)
    const setupLink = await admin.auth().generatePasswordResetLink(email);

    // Send invitation email via Resend
    const resend = new Resend(resendApiKey.value());
    await resend.emails.send({
      from: "Spencer's Home <onboarding@resend.dev>",
      to: email,
      subject: "You've been added to Spencer's Home",
      html: `
        <p>Hi ${displayName},</p>
        <p>You've been added to <strong>Spencer's Home</strong> as a ${role.replace("_", " ")}.</p>
        <p>Click the link below to set up your account and get started:</p>
        <p><a href="${setupLink}" style="font-size:16px;font-weight:bold;">Set Up My Account</a></p>
        <p>This link expires in 24 hours. If you didn't expect this invitation, you can ignore this email.</p>
        <p>— The Spencer's Home Team</p>
      `,
    });

    return { success: true, uid: userRecord.uid };
  }
);

// ─── submitInquiry ──────────────────────────────────────────────────────────

interface SubmitInquiryData {
  childId: string;
  stateId: string;
  name: string;
  phone: string;
  email: string;
  inquirerState: string;
  message: string;
}

export const submitInquiry = onCall(async (request) => {
  const { childId, stateId, name, phone, email, inquirerState, message } =
    request.data as SubmitInquiryData;

  if (!childId || !stateId) {
    throw new HttpsError("invalid-argument", "childId and stateId are required.");
  }

  // Server-side lookup — never trust client-supplied caseworkerId
  const childRef = admin
    .firestore()
    .collection("states")
    .doc(stateId)
    .collection("children")
    .doc(childId);

  const childSnap = await childRef.get();
  if (!childSnap.exists) {
    throw new HttpsError("not-found", "Child profile not found.");
  }

  const child = childSnap.data()!;
  const caseworkerId: string = child.caseworkerId ?? "";
  const childFirstName: string = child.firstName ?? "";

  const db = admin.firestore();

  // Write inquiry to flat collection
  const inquiryRef = await db
    .collection("states")
    .doc(stateId)
    .collection("inquiries")
    .add({
      childId,
      childFirstName,
      stateId,
      caseworkerId,
      name,
      phone,
      email,
      inquirerState,
      message,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      replyStatus: "pending",
    });

  const notificationWrite = caseworkerId
    ? db.collection("states").doc(stateId).collection("notifications").add({
        userId: caseworkerId,
        stateId,
        type: "inquiry",
        childId,
        childFirstName,
        inquirerName: name,
        message: `New inquiry for ${childFirstName} from ${name}`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    : Promise.resolve();

  await Promise.all([
    childRef.update({ inquiryCount: admin.firestore.FieldValue.increment(1) }),
    notificationWrite,
  ]);

  return { success: true, inquiryId: inquiryRef.id };
});
