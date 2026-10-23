// Prints a new sync token and its sha256. The token goes into the vault's
// gitignored key file on the Mac; only the hash goes into Vercel as
// SYNC_TOKEN_SHA256. Use a different token for each environment.
//   pnpm sync:token
import { createHash, randomBytes } from "node:crypto";

const token = randomBytes(32).toString("base64url");
const hash = createHash("sha256").update(token, "utf8").digest("hex");

console.log(`token   ${token}`);
console.log(`sha256  ${hash}`);
console.log("");
console.log("Put the token in the vault key file. Put the sha256 in SYNC_TOKEN_SHA256.");
console.log("When rotating, move the old hash to SYNC_TOKEN_SHA256_PREVIOUS first.");
