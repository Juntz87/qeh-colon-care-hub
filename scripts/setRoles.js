// scripts/setRoles.js
// Usage examples:
// node scripts/setRoles.js master email@example.com
// node scripts/setRoles.js officer email@example.com

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const SERVICE_KEY = path.resolve(process.cwd(), "./serviceAccountKey.json");

if (!fs.existsSync(SERVICE_KEY)) {
  console.error("serviceAccountKey.json not found:", SERVICE_KEY);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_KEY, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();

(async () => {
  const role = process.argv[2];
  const email = process.argv[3];

  if (!["master", "officer"].includes(role) || !email) {
    console.log("Usage: node scripts/setRoles.js master|officer email@example.com");
    process.exit(1);
  }

  try {
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { role });
    console.log(`✅ Assigned ${role} to ${email}`);
    console.log("User must sign out and sign back in.");
  } catch (err) {
    console.error("❌ Error:", err.message);
  }

  process.exit(0);
})();