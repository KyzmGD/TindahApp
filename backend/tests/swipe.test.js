const request = require("supertest");
const app = require("../src/app");
const { distanceInKm } = require("../src/services/geo.service");

describe("swipe routes", () => {
  it("requires authentication for discovery", async () => {
    const response = await request(app).get("/api/swipes/discover");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication token is required");
  });

  it("calculates distance between two coordinates", () => {
    const hanoi = [105.8542, 21.0285];
    const hoChiMinhCity = [106.6297, 10.8231];

    expect(distanceInKm(hanoi, hoChiMinhCity)).toBeGreaterThan(1100);
    expect(distanceInKm(hanoi, hoChiMinhCity)).toBeLessThan(1200);
  });
});
