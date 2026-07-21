const http = require("http");
const request = require("supertest");
const { io: createClient } = require("socket.io-client");
const app = require("../src/app");
const Message = require("../src/models/Message");
const registerChatSocket = require("../src/sockets/chat.socket");

async function registerUser(overrides = {}) {
  const response = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Socket User",
      email: `socket-${Date.now()}-${Math.random()}@example.com`,
      password: "password123",
      birthDate: "1998-01-01",
      gender: "other",
      ...overrides,
    });

  expect(response.status).toBe(201);
  return {
    token: response.body.token,
    user: response.body.user,
  };
}

async function createMatch(userA, userB) {
  await request(app)
    .post("/api/v1/swipes")
    .set("Authorization", `Bearer ${userA.token}`)
    .send({ targetId: userB.user.id, type: "like" })
    .expect(201);

  const response = await request(app)
    .post("/api/v1/swipes")
    .set("Authorization", `Bearer ${userB.token}`)
    .send({ targetId: userA.user.id, type: "like" })
    .expect(201);

  expect(response.body.isMatch).toBe(true);
  return response.body.match;
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, () => resolve(server.address().port));
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function connectSocket(port, token) {
  const socket = createClient(`http://localhost:${port}`, {
    auth: { token },
    forceNew: true,
    transports: ["websocket"],
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Socket connection timeout"));
    }, 2000);

    socket.once("connect", () => {
      clearTimeout(timeout);
      resolve(socket);
    });
    socket.once("connect_error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function emitWithAck(socket, event, payload) {
  return new Promise((resolve) => {
    socket.emit(event, payload, resolve);
  });
}

function waitForEvent(socket, event) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${event}`));
    }, 2000);

    socket.once(event, (payload) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe("chat socket realtime", () => {
  let server;
  let io;
  const sockets = [];

  afterEach(async () => {
    sockets.forEach((socket) => socket.disconnect());

    if (io) {
      io.close();
      io = null;
    }

    if (server?.listening) {
      await closeServer(server);
    }

    server = null;
  });

  it("stores send_message and emits receive_message only to the joined match room", async () => {
    const alice = await registerUser({ name: "Alice Socket" });
    const bob = await registerUser({ name: "Bob Socket" });
    const casey = await registerUser({ name: "Casey Socket" });
    const dana = await registerUser({ name: "Dana Socket" });

    const aliceBobMatch = await createMatch(alice, bob);
    const caseyDanaMatch = await createMatch(casey, dana);

    server = http.createServer(app);
    io = registerChatSocket(server, app);
    const port = await listen(server);

    const aliceSocket = await connectSocket(port, alice.token);
    const bobSocket = await connectSocket(port, bob.token);
    const caseySocket = await connectSocket(port, casey.token);
    sockets.push(aliceSocket, bobSocket, caseySocket);

    await expect(emitWithAck(aliceSocket, "match:join", aliceBobMatch._id))
      .resolves.toMatchObject({ ok: true });
    await expect(emitWithAck(bobSocket, "match:join", aliceBobMatch._id))
      .resolves.toMatchObject({ ok: true });
    await expect(emitWithAck(caseySocket, "match:join", caseyDanaMatch._id))
      .resolves.toMatchObject({ ok: true });

    let leakedToOtherRoom = false;
    caseySocket.on("receive_message", () => {
      leakedToOtherRoom = true;
    });

    const bobReceivePromise = waitForEvent(bobSocket, "receive_message");
    const ack = await emitWithAck(aliceSocket, "send_message", {
      matchId: aliceBobMatch._id,
      text: "Hello from realtime",
    });
    const receivedMessage = await bobReceivePromise;

    expect(ack).toMatchObject({
      ok: true,
      message: {
        text: "Hello from realtime",
      },
    });
    expect(receivedMessage).toMatchObject({
      _id: ack.message._id,
      text: "Hello from realtime",
    });

    await sleep(100);
    expect(leakedToOtherRoom).toBe(false);

    const storedMessage = await Message.findById(ack.message._id).lean();
    expect(storedMessage).toMatchObject({
      text: "Hello from realtime",
    });
    expect(storedMessage.match.toString()).toBe(aliceBobMatch._id);
    expect(storedMessage.sender.toString()).toBe(alice.user.id);
    expect(storedMessage.receiver.toString()).toBe(bob.user.id);
  });
});
