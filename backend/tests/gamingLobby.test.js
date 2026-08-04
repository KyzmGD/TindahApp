const {
  getLobbyGroupForRank,
  normalizeGamingProfiles,
} = require("../src/services/gamingLobby.service");

describe("gaming lobby rank rules", () => {
  it("maps supported game ranks into the correct lobby groups", () => {
    expect(getLobbyGroupForRank("Valorant", "Sắt 2")).toBe("group1");
    expect(getLobbyGroupForRank("Valorant", "Ascendant 1")).toBe("group2");
    expect(getLobbyGroupForRank("Valorant", "Radiant")).toBe("group3");

    expect(getLobbyGroupForRank("PUBGMobile", "Bạch Kim V")).toBe("group1");
    expect(getLobbyGroupForRank("PUBGMobile", "Cao Thủ")).toBe("group2");
    expect(getLobbyGroupForRank("PUBGMobile", "Quán Quân")).toBe("group3");

    expect(getLobbyGroupForRank("FreeFire", "Kim Cương")).toBe("group1");
    expect(getLobbyGroupForRank("FreeFire", "Huyền Thoại 1 sao")).toBe("group2");

    expect(getLobbyGroupForRank("TFT", "Vàng")).toBe("group1");
    expect(getLobbyGroupForRank("TFT", "Lục Bảo")).toBe("group2");
    expect(getLobbyGroupForRank("TFT", "Cao Thủ")).toBe("group3");

    expect(getLobbyGroupForRank("LienQuan", "Đồng")).toBe("group1");
    expect(getLobbyGroupForRank("LienQuan", "Kim Cương")).toBe("group2");
    expect(getLobbyGroupForRank("LienQuan", "Tinh Anh")).toBe("group3");
  });

  it("normalizes gaming profiles with auto-generated lobby groups", () => {
    expect(
      normalizeGamingProfiles([
        {
          gameName: "Valorant",
          currentRank: "Bạch Kim",
          lobbyGroup: "group1",
          inGameID: "dat#vn",
        },
      ]),
    ).toEqual([
      {
        gameName: "Valorant",
        currentRank: "Bạch Kim",
        lobbyGroup: "group2",
        inGameID: "dat#vn",
      },
    ]);
  });

  it("returns null for unsupported games or ranks", () => {
    expect(getLobbyGroupForRank("CSGO", "Global Elite")).toBeNull();
    expect(getLobbyGroupForRank("Valorant", "Unknown Rank")).toBeNull();
  });
});
