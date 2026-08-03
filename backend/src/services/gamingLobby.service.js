const GAME_NAMES = ["Valorant", "PUBGMobile", "LienQuan", "FreeFire", "TFT"];
const LOBBY_GROUPS = ["group1", "group2", "group3"];

function normalizeRank(rank) {
  return String(rank || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

const RANK_RULES = {
  Valorant: [
    {
      lobbyGroup: "group1",
      ranks: ["sat", "dong", "bac", "vang", "iron", "bronze", "silver", "gold"],
    },
    {
      lobbyGroup: "group2",
      ranks: [
        "bach kim",
        "kim cuong",
        "ascendant",
        "ascedent",
        "platinum",
        "diamond",
      ],
    },
    {
      lobbyGroup: "group3",
      ranks: ["immortal", "radiant", "imortal"],
    },
  ],
  PUBGMobile: [
    {
      lobbyGroup: "group1",
      ranks: ["dong", "bac", "vang", "bach kim", "bronze", "silver", "gold", "platinum"],
    },
    {
      lobbyGroup: "group2",
      ranks: ["kim cuong", "cao thu", "diamond", "crown"],
    },
    {
      lobbyGroup: "group3",
      ranks: ["quan quan", "ace", "conqueror", "ace master", "ace dominator"],
    },
  ],
  FreeFire: [
    {
      lobbyGroup: "group1",
      ranks: ["bach kim", "kim cuong", "platinum", "diamond"],
    },
    {
      lobbyGroup: "group2",
      ranks: [
        "huyen thoai",
        "huyen thoai 1 sao",
        "heroic",
        "heroic 1 star",
        "master",
        "grandmaster",
      ],
    },
  ],
  TFT: [
    {
      lobbyGroup: "group1",
      ranks: ["dong", "bac", "vang", "bronze", "silver", "gold"],
    },
    {
      lobbyGroup: "group2",
      ranks: ["bach kim", "luc bao", "kim cuong", "platinum", "emerald", "diamond"],
    },
    {
      lobbyGroup: "group3",
      ranks: ["cao thu", "dai cao thu", "thach dau", "master", "grandmaster", "challenger"],
    },
  ],
  LienQuan: [
    {
      lobbyGroup: "group1",
      ranks: ["dong", "bac", "vang", "bronze", "silver", "gold"],
    },
    {
      lobbyGroup: "group2",
      ranks: ["bach kim", "kim cuong", "platinum", "diamond"],
    },
    {
      lobbyGroup: "group3",
      ranks: ["tinh anh", "cao thu", "chien tuong", "thach dau", "veteran", "master"],
    },
  ],
};

function getLobbyGroupForRank(gameName, currentRank) {
  if (!GAME_NAMES.includes(gameName)) {
    return null;
  }

  const normalizedRank = normalizeRank(currentRank);
  if (!normalizedRank) {
    return null;
  }

  const rule = RANK_RULES[gameName].find((group) =>
    group.ranks.some((rank) =>
      normalizedRank === rank ||
      normalizedRank.startsWith(`${rank} `),
    ),
  );

  return rule?.lobbyGroup || null;
}

function normalizeGamingProfiles(gamingProfiles) {
  if (gamingProfiles === undefined) {
    return undefined;
  }

  return gamingProfiles.map((profile) => {
    const gameName = String(profile?.gameName || "").trim();
    const currentRank = String(profile?.currentRank || "").trim();
    const inGameID = String(profile?.inGameID || "").trim();
    const lobbyGroup = getLobbyGroupForRank(gameName, currentRank);

    return {
      gameName,
      currentRank,
      lobbyGroup,
      inGameID,
    };
  });
}

module.exports = {
  GAME_NAMES,
  LOBBY_GROUPS,
  RANK_RULES,
  getLobbyGroupForRank,
  normalizeGamingProfiles,
  normalizeRank,
};
