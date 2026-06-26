const {
  buildBirthDateFilter,
  buildParticipantsKey,
  normalizeLimit,
} = require("../src/services/matching.service");

describe("matching service helpers", () => {
  it("builds the same participants key regardless of swipe order", () => {
    const first = "65b000000000000000000002";
    const second = "65b000000000000000000001";

    expect(buildParticipantsKey(first, second)).toBe(buildParticipantsKey(second, first));
    expect(buildParticipantsKey(first, second)).toBe("65b000000000000000000001:65b000000000000000000002");
  });

  it("clamps discovery limits", () => {
    expect(normalizeLimit(undefined)).toBe(20);
    expect(normalizeLimit("0")).toBe(20);
    expect(normalizeLimit("10")).toBe(10);
    expect(normalizeLimit("500")).toBe(50);
  });

  it("creates a birth date range for age preferences", () => {
    const filter = buildBirthDateFilter({ min: 25, max: 35 });

    expect(filter.$gte).toBeInstanceOf(Date);
    expect(filter.$lte).toBeInstanceOf(Date);
    expect(filter.$gte.getTime()).toBeLessThan(filter.$lte.getTime());
  });
});
