import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  ALL_REASON_CODES,
  CARD_JSON_KEYS,
  EVENT_KINDS,
  FACET_KEYS,
  REASON_CODE_MAPPING,
  REPORT_ONLY_FIELDS,
  cardJson,
  checkPostingItem,
  eventsResponse,
  overlay,
  postingsRequest,
  postingsRequestForEngine,
  profilesRequest,
  scrubPosting,
  syncEvent,
  type EventKind,
  type EventPayload,
  type OverlayInput,
} from "@/lib/contracts";
import { EXCERPT_MAX_CHARS, FOLLOW_UP_DAYS_DEFAULT } from "@/lib/limits";

// Synthetic fixtures only: the repository is public.
const USER = "usr_7Hq2LmZx9TbWc4Rk";
const OTHER_USER = "usr_K3vNp8YdQe1JsA6f";
const SHA = "a".repeat(64);

function posting(overrides: Record<string, unknown> = {}) {
  return {
    external_id: "note-2026-10-25-0007",
    profile_id: "V3",
    company: "Example Assurance Co",
    role: "Senior IT Audit Manager",
    url: "https://careers.example.com/jobs/4821",
    location: "Remote, US",
    comp_min: 140000,
    comp_max: 165000,
    fit: "strong",
    fit_why: "Leads SOX ITGC testing at the person's rung; CISA asked for.",
    facets: {
      title_match: "exact",
      level: "at ceiling",
      domain: "IT audit",
      employer_type: "public company",
      competitive: "moderate",
      logistics: "remote",
    },
    card_json: {
      summary: "Own the ITGC program across two ERPs.",
      highlights: ["Remote", "Reports to the CAE"],
      work_mode: "remote",
    },
    excerpt: "You will plan and lead IT general control testing across SAP and Workday.",
    status: "new",
    status_date: "2026-10-25",
    source_board: "greenhouse",
    tier_hint: "standard",
    proposed: true,
    rank: 1,
    pick_reason: "Closest match to the person's last two roles.",
    posting_date: "2026-10-21",
    ...overrides,
  };
}

function body(postings: unknown[]) {
  return { run_id: "6f1c2b8e-3d4a-4f5b-9c6d-7e8f9a0b1c2d", week_key: "2026-W44", user_id: USER, postings };
}

describe("posting export", () => {
  it("accepts a realistic posting and scrubs it clean", () => {
    expect(postingsRequest.safeParse(body([posting()])).success).toBe(true);
    expect(postingsRequestForEngine.safeParse(body([posting()])).success).toBe(true);
    expect(scrubPosting(posting(), USER, [OTHER_USER])).toBeNull();
    expect(checkPostingItem(posting(), USER, [OTHER_USER]).ok).toBe(true);
  });

  it("rejects bad items one at a time and keeps the rest of the request", () => {
    const items = [
      posting(),
      posting({ external_id: "b", card_json: { summary: "ok", salary: "x" } }),
      posting({ external_id: "c", url: "ftp://example.com/x" }),
      posting({ external_id: "d", excerpt: "x".repeat(EXCERPT_MAX_CHARS + 1) }),
      posting({ external_id: "e", comp_min: 200000, comp_max: 100000 }),
    ];
    const parsed = postingsRequest.safeParse(body(items));
    expect(parsed.success).toBe(true);
    const reasons = items.map((item) => {
      const check = checkPostingItem(item, USER, []);
      return check.ok ? "stored" : check.reason;
    });
    expect(reasons).toEqual(["stored", "card_json_key", "url_not_http", "excerpt_too_long", "validation"]);
  });

  it("fails the whole request only for envelope problems", () => {
    expect(postingsRequest.safeParse(body([{ company: "no id" }])).success).toBe(false);
    expect(postingsRequest.safeParse({ ...body([posting()]), run_id: "not-a-uuid" }).success).toBe(false);
    expect(postingsRequest.safeParse(body(Array.from({ length: 201 }, (_, i) => posting({ external_id: `n${i}` })))).success).toBe(false);
  });

  it("exports exactly the card_json allowlist to JSON Schema", () => {
    const json = z.toJSONSchema(cardJson, { io: "input" }) as { properties: object; additionalProperties: unknown };
    expect(Object.keys(json.properties).sort()).toEqual([...CARD_JSON_KEYS].sort());
    expect(json.additionalProperties).toBe(false);
  });

  it("refuses more than 2,000 characters of excerpt, counted in code points", () => {
    const astral = "\u{1F600}".repeat(EXCERPT_MAX_CHARS); // 2,000 characters, 4,000 UTF-16 units
    expect(checkPostingItem(posting({ excerpt: astral }), USER, []).ok).toBe(true);
    expect(checkPostingItem(posting({ excerpt: `${astral}x` }), USER, [])).toMatchObject({ ok: false, reason: "excerpt_too_long" });
  });

  it("refuses two items with the same external_id in one request", () => {
    expect(postingsRequest.safeParse(body([posting(), posting()])).success).toBe(false);
  });

  it("refuses an unknown week key shape", () => {
    expect(postingsRequest.safeParse({ ...body([posting()]), week_key: "2026-44" }).success).toBe(false);
    expect(postingsRequest.safeParse({ ...body([posting()]), week_key: "2025-W53" }).success).toBe(false);
  });
});

describe("export scrub", () => {
  it("rejects a /Users/name/ path in the excerpt", () => {
    const item = posting({ excerpt: "Notes kept in /Users/kem/vault/notes.md for this role." });
    expect(scrubPosting(item, USER, [])).toBe("filesystem_path");
  });

  it("rejects /home/name/ after a quote and a leading tilde slash", () => {
    expect(scrubPosting(posting({ fit_why: 'see "/home/kem/vault/x.md"' }), USER, [])).toBe("filesystem_path");
    expect(scrubPosting(posting({ pick_reason: "~/vault/picks.md" }), USER, [])).toBe("filesystem_path");
    expect(scrubPosting(posting({ card_json: { summary: "/home/kem/a/" } }), USER, [])).toBe("filesystem_path");
  });

  it("accepts a careers URL with /home/ in it, as the url and inside text", () => {
    const url = "https://careers.example.com/home/kem/jobs/4821";
    expect(scrubPosting(posting({ url }), USER, [])).toBeNull();
    expect(scrubPosting(posting({ excerpt: `Apply at ${url} by Friday.` }), USER, [])).toBeNull();
  });

  it("rejects a javascript: url, and the item schema refuses it too", () => {
    const item = posting({ url: "javascript:alert(1)" });
    expect(scrubPosting(item, USER, [])).toBe("url_not_http");
    expect(postingsRequestForEngine.safeParse(body([item])).success).toBe(false);
  });

  it("catches paths in links, after punctuation and as file URIs", () => {
    for (const text of [
      "[resume](/Users/kem/Career/vaults/x/resume.pdf)",
      "(/Users/kem/Career/x.md)",
      "file:///Users/kem/Career/x.md",
      "path=/home/kem/vault/",
      "a,/Users/kem/x/y",
      "see:~/vault/x",
    ]) {
      expect(scrubPosting(posting({ fit_why: text }), USER, []), text).toBe("filesystem_path");
    }
    for (const text of ["https://acme.com/home/jobs/", "https://acme.com/a/home/b/c", "https://x.edu/~kem/"]) {
      expect(scrubPosting(posting({ excerpt: `Apply at ${text} today.` }), USER, []), text).toBeNull();
    }
  });

  it("rejects another participant's user id anywhere in the item, url included", () => {
    expect(scrubPosting(posting({ fit_why: `Also shown to ${OTHER_USER}.` }), USER, [OTHER_USER])).toBe(
      "foreign_user_id",
    );
    expect(scrubPosting(posting({ url: `https://example.com/?u=${OTHER_USER}` }), USER, [OTHER_USER])).toBe(
      "foreign_user_id",
    );
    // The body's own user is never foreign, even if the caller passes it in the list.
    expect(scrubPosting(posting({ fit_why: `For ${USER}.` }), USER, [USER])).toBeNull();
  });

  it("rejects an item whose user_id differs from the body's", () => {
    expect(scrubPosting(posting({ user_id: OTHER_USER }), USER, [])).toBe("user_id_mismatch");
    expect(scrubPosting(posting({ user_id: USER }), USER, [])).toBeNull();
  });

  it("rejects a card_json key outside the allowlist", () => {
    expect(scrubPosting(posting({ card_json: { summary: "ok", vault_path: "x" } }), USER, [])).toBe("card_json_key");
  });

  it("rejects an excerpt over the cap", () => {
    expect(scrubPosting(posting({ excerpt: "x".repeat(EXCERPT_MAX_CHARS + 1) }), USER, [])).toBe("excerpt_too_long");
  });
});

function fullOverlay(): OverlayInput {
  return {
    form_1: { primary_profile_id: "V3" },
    form_2: {
      name_printed: "Alex Example",
      email: "alex@example.com",
      resume_filename: "alex-example.pdf",
      metro: "New York",
      pay_floor_annual: 120000,
      work_authorization: "US citizen",
      timezone: "America/New_York",
    },
    form_3: {
      roles: [
        {
          title: "IT Audit Manager",
          employer: "Example Bank",
          start_month: "2021-03",
          current: true,
          kinds: [{ kind_id: "itgc", evidence: "Led ITGC testing for 40 applications." }],
        },
      ],
      highest_degree: "bachelor",
      certifications: ["CISA"],
      rung: "manager",
    },
    form_5: { apps_per_week: 5, heavy_portal_per_week: 1 },
  };
}

describe("overlay", () => {
  it("accepts a complete overlay", () => {
    expect(overlay.safeParse(fullOverlay()).success).toBe(true);
  });

  it("fails when a required field is missing", () => {
    const noEmail = fullOverlay();
    delete (noEmail.form_2 as { email?: string }).email;
    expect(overlay.safeParse(noEmail).success).toBe(false);

    const noRoles = fullOverlay();
    noRoles.form_3.roles = [];
    expect(overlay.safeParse(noRoles).success).toBe(false);

    const noAllocation = fullOverlay();
    delete (noAllocation.form_5 as { apps_per_week?: number }).apps_per_week;
    expect(overlay.safeParse(noAllocation).success).toBe(false);
  });

  it("enforces the either-or rules of section 5.7", () => {
    const noProfile = fullOverlay();
    noProfile.form_1 = {};
    expect(overlay.safeParse(noProfile).success).toBe(false);
    noProfile.form_1 = { not_sure: true };
    expect(overlay.safeParse(noProfile).success).toBe(true);

    const noPlace = fullOverlay();
    delete noPlace.form_2.metro;
    expect(overlay.safeParse(noPlace).success).toBe(false);
    noPlace.form_2.remote_ok = true;
    expect(overlay.safeParse(noPlace).success).toBe(true);

    const noPay = fullOverlay();
    delete noPay.form_2.pay_floor_annual;
    expect(overlay.safeParse(noPay).success).toBe(false);
    noPay.form_2.pay_floor_hourly = 60;
    expect(overlay.safeParse(noPay).success).toBe(true);

    const bothEnds = fullOverlay();
    bothEnds.form_3.roles[0].end_month = "2024-01";
    expect(overlay.safeParse(bothEnds).success).toBe(false);
  });

  it("defaults follow_up_days to 7", () => {
    expect(FOLLOW_UP_DAYS_DEFAULT).toBe(7);
    expect(overlay.parse(fullOverlay()).operator.follow_up_days).toBe(7);
    expect(overlay.parse({ ...fullOverlay(), operator: {} }).operator.follow_up_days).toBe(7);
    expect(overlay.parse({ ...fullOverlay(), operator: { follow_up_days: 10 } }).operator.follow_up_days).toBe(10);
  });

  it("marks the report-only fields in the JSON Schema", () => {
    const json = z.toJSONSchema(overlay) as unknown as {
      properties: { form_2: { properties: Record<string, Record<string, unknown>> } };
    };
    const form2 = json.properties.form_2.properties;
    expect([...REPORT_ONLY_FIELDS]).toEqual(["work_authorization", "clearance"]);
    for (const field of REPORT_ONLY_FIELDS) expect(form2[field]["x-report-only"]).toBe(true);
    const marked = Object.keys(form2).filter((key) => form2[key]["x-report-only"] === true);
    expect(marked.sort()).toEqual([...REPORT_ONLY_FIELDS].sort());
  });
});

const payloads: { [K in EventKind]: EventPayload<K> } = {
  "overlay.approved": { user_id: USER, version: 1, sha256: SHA },
  "resume.uploaded": { user_id: USER, resume_id: "res_1", sha256: SHA, replaces_sha256: null },
  "decision.recorded": {
    decision_id: "dec_1",
    posting_id: "pst_1",
    external_id: "note-1",
    decision: "pass",
    reason_code: "too_senior",
    text: null,
    disputed: false,
    week_key: "2026-W44",
    at: "2026-10-26T14:05:00-04:00",
  },
  "build.requested": {
    build_id: "bld_1",
    posting_id: "pst_1",
    external_id: "note-1",
    needs_draft_review: true,
    requested_at: "2026-10-26T18:05:00Z",
  },
  "build.draft_approved": {
    build_id: "bld_1",
    approved_draft: { keywords: ["ITGC", "SOX"], tailored_md: "# Alex Example", cover_letter_md: null },
  },
  "build.cancelled": { build_id: "bld_1" },
  "application.confirmed": {
    application_id: "app_1",
    posting_id: "pst_1",
    external_id: "note-1",
    build_id: null,
    applied_on: "2026-10-27",
    applied_tz: "America/New_York",
    via: "referral",
    referral_name: "Sam Example",
    tier: "standard",
    confirmed_sha256: null,
    master_sha256: SHA,
  },
  "reply.recorded": {
    reply_id: "rep_1",
    application_id: "app_1",
    external_id: "note-1",
    kind: "screen",
    on: "2026-11-02",
    note: null,
  },
  "master.approved": { master_id: "mst_1", user_id: USER, profile_id: "V3", version: 2, sha256: SHA },
  "survey.answered": {
    survey_id: "srv_1",
    user_id: USER,
    week_key: "2026-W45",
    question_id: "q_useful",
    answer: "4",
  },
  "participant.paused": { user_id: USER },
  "participant.resumed": { user_id: USER },
  "deletion.requested": {
    user_id: USER,
    vault_slug: "alex-example",
    requested_at: "2026-11-10T09:00:00Z",
    reason: "user",
  },
};

describe("event stream", () => {
  it("parses every event kind", () => {
    expect(EVENT_KINDS).toHaveLength(13);
    const events = EVENT_KINDS.map((kind, i) => ({
      id: String(i + 1),
      kind,
      user_id: USER,
      at: "2026-10-26T18:05:00.123Z",
      payload: payloads[kind],
    }));
    for (const event of events) expect(syncEvent.safeParse(event).success, event.kind).toBe(true);
    const page = eventsResponse.safeParse({ events, next_after: String(events.length), has_more: false });
    expect(page.success).toBe(true);
  });

  it("refuses a non-digit id, a timestamp without an offset and a pass without a reason", () => {
    const base = { id: "1", kind: "build.cancelled", user_id: USER, at: "2026-10-26T18:05:00Z", payload: { build_id: "b" } };
    expect(syncEvent.safeParse(base).success).toBe(true);
    expect(syncEvent.safeParse({ ...base, id: "12a" }).success).toBe(false);
    expect(syncEvent.safeParse({ ...base, at: "2026-10-26T18:05:00" }).success).toBe(false);
    const pass = { ...base, kind: "decision.recorded", payload: { ...payloads["decision.recorded"], reason_code: null } };
    expect(syncEvent.safeParse(pass).success).toBe(false);
  });
});

describe("reason codes", () => {
  it("maps every code, the scope's ten plus verdict_wrong", () => {
    expect(ALL_REASON_CODES).toHaveLength(11);
    expect(ALL_REASON_CODES).toContain("verdict_wrong");
    for (const code of ALL_REASON_CODES) expect(REASON_CODE_MAPPING[code], code).toBeDefined();
    expect(Object.keys(REASON_CODE_MAPPING).sort()).toEqual([...ALL_REASON_CODES].sort());
  });

  it("ties each code to what the feedback schema says it tunes", () => {
    expect(REASON_CODE_MAPPING.too_senior.kind).toBe("ceiling_words");
    expect(REASON_CODE_MAPPING.too_junior.kind).toBe("ceiling_words");
    expect(REASON_CODE_MAPPING.wrong_field).toMatchObject({ kind: "sourcing_rule", rules: ["title_patterns", "screens"] });
    expect(REASON_CODE_MAPPING.outshone).toMatchObject({ kind: "facet", facet: "competitive" });
    expect(REASON_CODE_MAPPING.location.kind).toBe("overlay");
    expect(REASON_CODE_MAPPING.pay.kind).toBe("overlay");
    for (const code of ["not_interesting", "duplicate", "posting_gone", "other", "verdict_wrong"] as const) {
      expect(REASON_CODE_MAPPING[code].kind, code).toBe("none");
    }
  });

  it("points only at facets and overlay fields that exist", () => {
    const shape = overlay.shape as unknown as Record<string, { shape: Record<string, unknown> }>;
    for (const mapping of Object.values(REASON_CODE_MAPPING)) {
      if (mapping.kind === "facet") expect(FACET_KEYS).toContain(mapping.facet);
      if (mapping.kind === "overlay" || mapping.kind === "ceiling_words") {
        for (const path of mapping.overlay_fields) {
          const [form, field] = path.split(".");
          expect(shape[form].shape, path).toHaveProperty(field);
        }
      }
    }
  });
});

describe("profile mirror", () => {
  it("accepts a profile with its form lists", () => {
    const profile = {
      id: "V3",
      name: "IT audit and controls",
      description: "Synthetic test profile.",
      node: "assurance.it_audit",
      ruling_status: null,
      status: "active",
      version: 3,
      lookup_version: 1,
      example_titles: ["IT Audit Manager"],
      form: {
        kinds: [{ id: "itgc", label: "ITGC testing", bar: "Led testing of at least one control set" }],
        tools: ["AuditBoard"],
        employer_types: ["public company"],
        screens_default: ["financial services"],
      },
      sha256: SHA,
    };
    expect(profilesRequest.safeParse({ profiles: [profile] }).success).toBe(true);
    expect(profilesRequest.safeParse({ profiles: [{ ...profile, status: "retired" }] }).success).toBe(false);
  });
});
