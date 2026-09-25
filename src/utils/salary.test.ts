import { describe, it, expect } from "vitest";
import { formatSalaryRange, salaryFilterLabel } from "./salary";

// Pin locale to INR so tests are deterministic regardless of the test runner's timezone.
const INR_LOCALE = "en-IN";

describe("formatSalaryRange", () => {
  it("returns empty string for empty input", () => {
    expect(formatSalaryRange("", INR_LOCALE)).toBe("");
    expect(formatSalaryRange(null, INR_LOCALE)).toBe("");
    expect(formatSalaryRange(undefined, INR_LOCALE)).toBe("");
  });

  it("formats a plain LPA range (INR)", () => {
    const result = formatSalaryRange("5-10 LPA", INR_LOCALE);
    expect(result).toBe("₹5–10 LPA");
  });

  it("formats a single LPA value (INR)", () => {
    const result = formatSalaryRange("12 LPA", INR_LOCALE);
    expect(result).toBe("₹12 LPA");
  });

  it("formats lakh notation", () => {
    const result = formatSalaryRange("5L - 10L", INR_LOCALE);
    expect(result).toBe("₹5–10 LPA");
  });

  it("formats crore notation", () => {
    const result = formatSalaryRange("1 Cr", INR_LOCALE);
    // 1 Cr = 100 LPA
    expect(result).toBe("₹100 LPA");
  });

  it("handles reversed range (max < min in text)", () => {
    const result = formatSalaryRange("10-5 LPA", INR_LOCALE);
    expect(result).toBe("₹5–10 LPA");
  });

  it("returns original text when no numbers found", () => {
    const result = formatSalaryRange("Competitive", INR_LOCALE);
    expect(result).toBe("Competitive");
  });

  it("detects USD from $ symbol", () => {
    const result = formatSalaryRange("$80k - $120k", "en-US");
    // Should contain a dollar sign and /yr suffix
    expect(result).toMatch(/\$/);
    expect(result).toMatch(/\/yr/);
  });

  it("detects GBP from £ symbol", () => {
    const result = formatSalaryRange("£50,000 - £70,000", "en-GB");
    expect(result).toMatch(/£/);
  });

  it("detects monthly period", () => {
    const result = formatSalaryRange("₹50,000/month", INR_LOCALE);
    expect(result).toMatch(/\/mo/);
  });

  it("detects hourly period", () => {
    const result = formatSalaryRange("$25/hr", "en-US");
    expect(result).toMatch(/\/hr/);
  });

  it("handles k suffix", () => {
    const result = formatSalaryRange("$80k", "en-US");
    expect(result).toMatch(/\$/);
  });

  it("handles comma-separated numbers", () => {
    const result = formatSalaryRange("₹5,00,000 - ₹10,00,000", INR_LOCALE);
    expect(result).toBe("₹5–10 LPA");
  });
});

describe("salaryFilterLabel", () => {
  it("returns 'Any salary' for 'all'", () => {
    expect(salaryFilterLabel("all", INR_LOCALE)).toBe("Any salary");
  });

  it("returns INR labels for INR locale", () => {
    expect(salaryFilterLabel("0-5", INR_LOCALE)).toBe("Up to ₹5 LPA");
    expect(salaryFilterLabel("5-10", INR_LOCALE)).toBe("₹5–10 LPA");
    expect(salaryFilterLabel("10-20", INR_LOCALE)).toBe("₹10–20 LPA");
    expect(salaryFilterLabel("20+", INR_LOCALE)).toBe("₹20 LPA+");
  });

  it("returns 'Any salary' for unknown filter value", () => {
    expect(salaryFilterLabel("unknown", INR_LOCALE)).toBe("Any salary");
  });
});