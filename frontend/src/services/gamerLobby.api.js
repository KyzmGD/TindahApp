import api from "./api";

export async function exploreGamerLobby({ game, lobbyGroup, limit = 20 }) {
  const response = await api.get("/v1/gamer-lobby/explore", {
    params: {
      game,
      lobbyGroup,
      limit,
    },
  });

  return response.data;
}

export async function listGamerRecruitments({ game, lobbyGroup, limit = 20 }) {
  const response = await api.get("/v1/gamer-lobby/recruitments", {
    params: {
      game,
      lobbyGroup,
      limit,
    },
  });

  return response.data;
}

export async function createGamerRecruitment(payload) {
  const response = await api.post("/v1/gamer-lobby/recruitments", payload);

  return response.data;
}

export async function joinGamerRecruitment(recruitmentId) {
  const response = await api.post(`/v1/gamer-lobby/recruitments/${recruitmentId}/join`);

  return response.data;
}

export async function closeGamerRecruitment(recruitmentId) {
  const response = await api.patch(`/v1/gamer-lobby/recruitments/${recruitmentId}/close`);

  return response.data;
}
