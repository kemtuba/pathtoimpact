// Writes contracts/*.schema.json from the zod contracts in src/lib/contracts,
// for the engine and engine/sync.py. Keys are sorted, so a re-run with no
// contract change leaves no diff and CI can fail on a stale export.
//   pnpm contracts:json
// Relative imports, because tsx does not resolve the @/ alias.
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { CONTRACT_VERSION } from "../src/lib/limits";
import {
  REASON_CODE_MAPPING,
  eventsResponse,
  overlay,
  postingsRequestForEngine,
  profilesRequest,
  reasonCode,
} from "../src/lib/contracts/index";

type Contract = {
  file: string;
  title: string;
  description: string;
  schema: z.ZodType;
  // "input" for bodies the engine sends, "output" for what the portal serves.
  io: "input" | "output";
  extra?: Record<string, unknown>;
};

const contracts: Contract[] = [
  {
    file: "events",
    title: "Sync event stream",
    description: "Response of GET /api/sync/v1/events. Apply events idempotently, keyed by id.",
    schema: eventsResponse,
    io: "output",
  },
  {
    file: "posting-export",
    title: "Postings push",
    description:
      "Body of POST /api/sync/v1/postings, with each item held to the item schema. The portal checks items one at a time and rejects a failing item alone; only the envelope fails the whole request. card_json may carry only the keys listed here.",
    schema: postingsRequestForEngine,
    io: "input",
  },
  {
    file: "profile-mirror",
    title: "Profiles mirror",
    description: "Body of PUT /api/sync/v1/profiles.",
    schema: profilesRequest,
    io: "input",
  },
  {
    file: "overlay",
    title: "Participant overlay",
    description: "An approved overlay version, grouped by form. Fields marked x-report-only are never scored.",
    schema: overlay,
    io: "output",
  },
  {
    file: "reason-codes",
    title: "Reason codes",
    description: "Decision reason codes. x-mapping names the fit facet or sourcing rule each one tunes.",
    schema: reasonCode,
    io: "output",
    extra: { "x-mapping": REASON_CODE_MAPPING },
  },
];

/**
 * zod closes every object in output mode. Only strictObject is meant to be
 * closed: a plain object the portal serves stays open, so a field added within
 * a contract major does not break an engine validating against an older copy.
 */
const openPlainObjects: NonNullable<Parameters<typeof z.toJSONSchema>[1]>["override"] = (ctx) => {
  const def = ctx.zodSchema._zod.def;
  if (def.type === "object" && def.catchall === undefined) delete ctx.jsonSchema.additionalProperties;
};

/** Sorts object keys at every depth, and required lists, which are sets. Other arrays keep their order. */
function sorted(value: unknown, key?: string): unknown {
  if (Array.isArray(value)) {
    const items = value.map((item) => sorted(item));
    return key === "required" ? items.sort() : items;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((k) => [k, sorted(record[k], k)]),
    );
  }
  return value;
}

const outDir = fileURLToPath(new URL("../contracts/", import.meta.url));
mkdirSync(outDir, { recursive: true });

for (const contract of contracts) {
  const generated = z.toJSONSchema(contract.schema, { io: contract.io, override: openPlainObjects });
  const doc = {
    ...generated,
    title: contract.title,
    description: contract.description,
    "x-contract-version": CONTRACT_VERSION,
    ...contract.extra,
  };
  const path = `${outDir}${contract.file}.schema.json`;
  writeFileSync(path, `${JSON.stringify(sorted(doc), null, 2)}\n`);
  console.log(`wrote contracts/${contract.file}.schema.json`);
}
