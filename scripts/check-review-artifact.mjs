import { verifyArtifact } from "./lib/review-artifact.mjs";

const files = await verifyArtifact(process.argv[2] ?? "dist-review");
console.log(`Review artifact PASS: ${files.length} files (complete manifest, hashes, routes, assets and forbidden-code gate)`);
