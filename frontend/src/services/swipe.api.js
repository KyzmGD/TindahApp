import api from "./api";
export async function discover(limit = 20) {
  const response = await api.get("/swipes/discover", { params: { limit } });
  return response.data.users;
}

export async function sendSwipe(targetUserId, direction) {
  const response = await api.post("/swipes", { targetUserId, direction });
  return response.data;
}

export async function getMatches() {
  const response = await api.get("/matches");
  return response.data.matches;
}

export async function unmatch(matchId) {
  const response = await api.patch(`/matches/${matchId}/unmatch`);
  return response.data.match;
}

export async function getMessages(matchId) {
  const response = await api.get(`/chats/${matchId}/messages`);
  return response.data.messages;
}

export async function sendMessage(matchId, text) {
  const response = await api.post(`/chats/${matchId}/messages`, { text });
  return response.data.message;
}
