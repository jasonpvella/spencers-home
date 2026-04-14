"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteUser = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const resend_1 = require("resend");
admin.initializeApp();
const resendApiKey = (0, params_1.defineSecret)("RESEND_API_KEY");
exports.inviteUser = (0, https_1.onCall)({ secrets: [resendApiKey] }, async (request) => {
    // Verify caller is authenticated
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Must be signed in.");
    }
    // Verify caller is state_admin or platform_admin
    const callerDoc = await admin
        .firestore()
        .collection("users")
        .doc(request.auth.uid)
        .get();
    const caller = callerDoc.data();
    if (!caller ||
        !["state_admin", "platform_admin"].includes(caller.role)) {
        throw new https_1.HttpsError("permission-denied", "Must be an admin.");
    }
    const { email, displayName, role } = request.data;
    const stateId = caller.stateId;
    // Create the Firebase Auth user
    let userRecord;
    try {
        userRecord = await admin.auth().createUser({
            email,
            displayName,
            emailVerified: false,
        });
    }
    catch (err) {
        const firebaseErr = err;
        if (firebaseErr.code === "auth/email-already-exists") {
            throw new https_1.HttpsError("already-exists", "A user with this email already exists.");
        }
        throw new https_1.HttpsError("internal", "Failed to create user account.");
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
    const resend = new resend_1.Resend(resendApiKey.value());
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
});
//# sourceMappingURL=index.js.map