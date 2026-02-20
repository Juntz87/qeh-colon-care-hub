// scripts/setRoles.js
// Usage examples:
//  node scripts/setRoles.js master djthan87@gmail.com
//  node scripts/setRoles.js officer yvonnewong5140@gmail.com
//  node scripts/setRoles.js create-officer yvonnewong5140@gmail.com TempP@ssw0rd
//  node scripts/setRoles.js batch master emails.txt    (one email per line in emails.txt)

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const SERVICE_KEY = path.resolve(process.cwd(), "./serviceAccountKey.json");

if (!fs.existsSync(SERVICE_KEY)) {
  console.error("serviceAccountKey.json not found in current directory:", SERVICE_KEY);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_KEY, "utf8"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const auth = admin.auth();

function usageAndExit() {
  console.log(`
Usage:
  node scripts/setRoles.js master <email>
  node scripts/setRoles.js officer <email>
  node scripts/setRoles.js create-officer <email> <temporaryPassword>
  node scripts/setRoles.js batch <role> <emails-file.txt>   (one email per line)

Notes:
  - Role values applied are lowercase: "master" or "officer"
  - If a user does not exist, the script will error unless you use create-officer with a temp password.
  - After assigning roles, users must sign out and sign back in (tokens update).
`);
  process.exit(1);
}

async function setRoleForEmail(email, role) {
  try {
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { role: role.toLowerCase() });
    console.log(`✅ Assigned ${role.toLowerCase()} to ${email}`);
  } catch (err) {
    console.error(`❌ Failed ${email}: ${err.message}`);
  }
}

async function createUserAndSetRole(email, tempPassword, role) {
  try {
    const user = await auth.createUser({
      email,
      emailVerified: false,
      password: tempPassword,
    });
    await auth.setCustomUserClaims(user.uid, { role: role.toLowerCase() });
    console.log(`✅ Created user and assigned ${role.toLowerCase()} to ${email}`);
  } catch (err) {
    console.error(`❌ Could not create ${email}: ${err.message}`);
  }
}

(async () => {
  if (process.argv.length < 4) usageAndExit();

  const cmd = process.argv[2];

  if (cmd === "batch") {
    const role = process.argv[3];
    const file = process.argv[4];
    if (!role || !file) usageAndExit();
    if (!fs.existsSync(file)) {
      console.error("Emails file not found:", file);
      process.exit(1);
    }
    const emails = fs.readFileSync(file, "utf8").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    for (const e of emails) {
      await setRoleForEmail(e, role);
    }
    console.log("🎯 Done.");
    process.exit(0);
  }

  if (cmd === "create-officer") {
    const email = process.argv[3];
    const pass = process.argv[4];
    if (!email || !pass) usageAndExit();
    await createUserAndSetRole(email, pass, "officer");
    process.exit(0);
  }

  // single set
  const role = cmd; // 'master' or 'officer'
  const email = process.argv[3];
  if (!["master", "officer"].includes(role) || !email) usageAndExit();

  await setRoleForEmail(email, role);
  console.log("🎯 Done. Users must sign out and sign back in to refresh tokens.");
  process.exit(0);
})();