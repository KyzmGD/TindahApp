jest.mock("../src/config/redis", () => ({
  getRedisClient: jest.fn(),
}));

const mongoose = require("mongoose");
const Swipe = require("../src/models/Swipe");
const { getRedisClient } = require("../src/config/redis");
const {
  EXCLUDED_TTL_SECONDS,
  addExcludedSwipeId,
  buildSwipeExcludedKey,
  getExcludedSwipeIds,
} = require("../src/services/swipeCache.service");

describe("swipe exclusion Redis cache", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getRedisClient.mockReturnValue(null);
  });

  it("stores swiped target ids in the expected Redis key with a 24 hour TTL", async () => {
    const userId = new mongoose.Types.ObjectId();
    const targetId = new mongoose.Types.ObjectId();
    const redisClient = {
      isOpen: true,
      sAdd: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
    };
    getRedisClient.mockReturnValue(redisClient);

    await expect(addExcludedSwipeId(userId, targetId)).resolves.toBe(true);

    expect(redisClient.sAdd).toHaveBeenCalledWith(
      buildSwipeExcludedKey(userId),
      [targetId.toString()],
    );
    expect(redisClient.expire).toHaveBeenCalledWith(
      buildSwipeExcludedKey(userId),
      EXCLUDED_TTL_SECONDS,
    );
  });

  it("reads excluded ids from Redis when the cache key exists", async () => {
    const userId = new mongoose.Types.ObjectId();
    const targetId = new mongoose.Types.ObjectId();
    const redisClient = {
      isOpen: true,
      exists: jest.fn().mockResolvedValue(1),
      sMembers: jest.fn().mockResolvedValue([targetId.toString(), "bad-id"]),
    };
    getRedisClient.mockReturnValue(redisClient);

    await expect(getExcludedSwipeIds(userId)).resolves.toEqual([targetId.toString()]);
    expect(redisClient.exists).toHaveBeenCalledWith(buildSwipeExcludedKey(userId));
    expect(redisClient.sMembers).toHaveBeenCalledWith(buildSwipeExcludedKey(userId));
  });

  it("falls back to MongoDB when Redis is unavailable", async () => {
    const userId = new mongoose.Types.ObjectId();
    const targetId = new mongoose.Types.ObjectId();
    const redisClient = {
      isOpen: true,
      exists: jest.fn().mockRejectedValue(new Error("Redis connection refused")),
    };
    getRedisClient.mockReturnValue(redisClient);

    await Swipe.create({
      swiper: userId,
      target: targetId,
      direction: "like",
    });

    await expect(getExcludedSwipeIds(userId)).resolves.toEqual([targetId.toString()]);
  });
});
