import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const readmePath = join(root, "README.md");
const guardrailPath = join(root, "src", "config", "productGuardrails.ts");
const removedModelDoc = join(root, "docs", "minipay-and-web-model.md");

const expectedIds = [
  "MG-CORE-001",
  "MG-UX-001",
  "MG-MINIPAY-001",
  "MG-WEB-001",
  "MG-CONTRACT-001",
  "MG-GROWTH-001",
  "MG-COACH-001",
];

const readme = readFileSync(readmePath, "utf8");
const guardrails = readFileSync(guardrailPath, "utf8");
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

for (const id of expectedIds) {
  expect(readme.includes(id), `${id} is missing from README.md traceable blocks`);
  expect(guardrails.includes(`id: "${id}"`), `${id} is missing from productGuardrails.ts`);
}

expect(readme.includes("## Mangooal solution"), "README.md is missing the Mangooal solution section");
expect(readme.includes("### Traceable product blocks"), "README.md is missing traceable product blocks");
expect(readme.includes("MiniPay users auto-connect"), "README.md must keep the MiniPay auto-connect rule explicit");
expect(readme.includes("Direct user attribution"), "README.md must keep the user-attribution contract rule explicit");
expect(!existsSync(removedModelDoc), "docs/minipay-and-web-model.md should stay removed from the repo");

const duplicateIds = expectedIds.filter((id, index) => expectedIds.indexOf(id) !== index);
expect(duplicateIds.length === 0, `Duplicate expected guardrail ids: ${duplicateIds.join(", ")}`);

if (failures.length > 0) {
  console.error("Product guardrail check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Product guardrail check passed: ${expectedIds.length} traceable blocks verified.`);