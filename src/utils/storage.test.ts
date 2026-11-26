import { describe, expect, it } from "vitest";
import {
  MAX_IMPORT_BYTES,
  SCHEMA_VERSION,
  migrate,
  parseImportFile,
} from "./storage";

const file = (content: string) =>
  new File([content], "backup.json", { type: "application/json" });

describe("migrate", () => {
  it("fills defaults for an empty / legacy object", () => {
    const d = migrate({});
    expect(d.schemaVersion).toBe(SCHEMA_VERSION);
    expect(d.entries).toEqual({});
    expect(d.customHolidays).toEqual([]);
    expect(d.selectedRegion).toBe("south");
  });

  it("drops invalid entries and normalises statuses", () => {
    const d = migrate({
      entries: {
        "2026-11-18": { status: "wfo", note: "ok" },
        "2026-11-19": { status: "bogus", note: "kept as note" },
        "2026-11-20": { status: "none" }, // empty → dropped
        "not-a-date": { status: "wfo" },
        "2026-11-21": "garbage",
        "2026-11-22": { status: "wfh", note: 42 }, // bad note type
      },
    });
    expect(d.entries).toEqual({
      "2026-11-18": { date: "2026-11-18", status: "wfo", note: "ok" },
      "2026-11-19": { date: "2026-11-19", status: "none", note: "kept as note" },
      "2026-11-22": { date: "2026-11-22", status: "wfh" },
    });
  });

  it("drops holidays without a valid date, name or region", () => {
    const d = migrate({
      customHolidays: [
        { id: "a", date: "2026-01-01", name: "Ok", regions: ["south", "mars"] },
        { id: "b", date: "2026-01-02", name: "No regions" },
        { id: "c", date: "bad", name: "Bad date", regions: ["south"] },
        null,
      ],
    });
    expect(d.customHolidays).toEqual([
      { id: "a", date: "2026-01-01", name: "Ok", regions: ["south"], isCustom: true },
    ]);
  });

  it("rejects unsafe keys and clamps counts", () => {
    const d = migrate(
      JSON.parse(
        '{"annualCarryForwardSeed":{"2026":99,"__proto__":5,"x":1},"expectedOverride":{"2026-07-01":31.7,"2026-10-01":-2}}',
      ),
    );
    expect(d.annualCarryForwardSeed).toEqual({ "2026": 45 });
    expect(d.expectedOverride).toEqual({ "2026-07-01": 31 });
    expect(Object.getPrototypeOf(d.annualCarryForwardSeed)).toBe(
      Object.prototype,
    );
  });

  it("falls back for an unknown region", () => {
    expect(migrate({ selectedRegion: "moon" }).selectedRegion).toBe("south");
  });
});

describe("parseImportFile", () => {
  it("accepts a valid backup and returns its mode", async () => {
    const r = await parseImportFile(
      file(JSON.stringify({ entries: {}, exportedMode: "quarter" })),
    );
    expect(r.exportedMode).toBe("quarter");
    expect(r.data.entries).toEqual({});
  });

  it("rejects non-JSON, non-backups, newer schemas and huge files", async () => {
    await expect(parseImportFile(file("nope"))).rejects.toThrow("Invalid JSON");
    await expect(parseImportFile(file("{}"))).rejects.toThrow(
      "Not a valid attendance backup",
    );
    await expect(parseImportFile(file("[]"))).rejects.toThrow(
      "Not a valid attendance backup",
    );
    await expect(
      parseImportFile(
        file(JSON.stringify({ entries: {}, schemaVersion: SCHEMA_VERSION + 1 })),
      ),
    ).rejects.toThrow("newer version");
    const big = { size: MAX_IMPORT_BYTES + 1 } as File;
    await expect(parseImportFile(big)).rejects.toThrow("too large");
  });
});
