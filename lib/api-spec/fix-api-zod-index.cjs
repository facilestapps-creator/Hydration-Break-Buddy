#!/usr/bin/env node
// Post-codegen fix: Orval generates lib/api-zod/src/index.ts with both
// `./generated/api` and `./generated/types` exports, which causes a naming
// conflict when the same symbol is exported as both a Zod schema (value) and
// a TypeScript type. We only need the Zod schemas — types can be inferred
// from them with z.infer<> where needed.
const fs = require("fs");
const path = require("path");
const indexPath = path.resolve(__dirname, "..", "api-zod", "src", "index.ts");
fs.writeFileSync(indexPath, "export * from './generated/api';\n");
console.log("✓ Fixed lib/api-zod/src/index.ts (removed duplicate/conflicting re-exports)");
