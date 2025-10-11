import admin from "firebase-admin";
import { readFileSync } from "fs";

// Ensure your service account file path is correct
const serviceAccount = JSON.parse(
  readFileSync("./serviceAccountKey.json", "utf8")
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const auth = admin.auth();

const MASTER = ["djthan87@gmail.com"];
const OFFICERS = [
  "dareenfoo96@gmail.com",
  "doclaw811@gmail.com",
  "kaviena97@gmail.com",
  "qehcrcho@gmail.com",
  "colorectalhqe@gmail.com",
];

(async () => {
  console.log("🚀 Script is running...");
  for (const email of MASTER) {
    try {
      const user = await auth.getUserByEmail(email);
      await auth.setCustomUserClaims(user.uid, { role: "MASTER" });
      console.log(`✅ Assigned MASTER to ${email}`);
    } catch (err) {
      console.error(`❌ Failed ${email}: ${err.message}`);
    }
  }

  for (const email of OFFICERS) {
    try {
      const user = await auth.getUserByEmail(email);
      await auth.setCustomUserClaims(user.uid, { role: "OFFICER" });
      console.log(`✅ Assigned OFFICER to ${email}`);
    } catch (err) {
      console.error(`❌ Failed ${email}: ${err.message}`);
    }
  }

  console.log("🎯 Done assigning roles!");
  console.log("➡️  Users must sign out and sign back in to refresh tokens.");
})();