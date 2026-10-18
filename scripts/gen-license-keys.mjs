// Generates the ES256 key pair used to sign panel licence tokens.
// Paste both lines into .env.local (and Vercel). Ship only the public key in the panel.
import { generateKeyPairSync } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const oneLine = (pem) => pem.trim().replace(/\n/g, "\\n");

console.log(`LICENSE_PRIVATE_KEY="${oneLine(privateKey.export({ type: "pkcs8", format: "pem" }))}"`);
console.log(`LICENSE_PUBLIC_KEY="${oneLine(publicKey.export({ type: "spki", format: "pem" }))}"`);
