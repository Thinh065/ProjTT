// Test tích hợp các API chính trên MongoDB chạy trong bộ nhớ (mongodb-memory-server).
// Chạy: npm test   (lần đầu có thể tải binary mongod ~ 100 MB vào ~/.cache/mongodb-binaries)
process.env.JWT_SECRET = "test-secret-".padEnd(64, "x");
process.env.NODE_ENV = "test";
process.env.OPENROUTER_API_KEY = "";

const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const app = require("../app");
const User = require("../models/User");

let mongo;
let server;
let base;

async function api(path, { method = "GET", body, token, raw } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function registerAndLogin(name, email, password = "secret123") {
  const reg = await api("/api/auth/register", { method: "POST", body: { name, email, password } });
  assert.equal(reg.status, 201, JSON.stringify(reg.data));
  const login = await api("/api/auth/login", { method: "POST", body: { email, password } });
  assert.equal(login.status, 200);
  return { token: login.data.token, id: login.data.user._id };
}

test.before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: "projtt-test" });
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongo.stop();
});

let alice;
let bob;
let admin;

test("register validates input and rejects duplicate emails (case-insensitive)", async () => {
  assert.equal((await api("/api/auth/register", { method: "POST", body: { name: "x", email: "bad", password: "secret123" } })).status, 400);
  assert.equal((await api("/api/auth/register", { method: "POST", body: { name: "x", email: "a@b.co", password: "123" } })).status, 400);
  alice = await registerAndLogin("Alice", "alice@example.com");
  const dup = await api("/api/auth/register", { method: "POST", body: { name: "A", email: "ALICE@example.com", password: "secret123" } });
  assert.equal(dup.status, 400);
  bob = await registerAndLogin("Bob", "bob@example.com");
  admin = await registerAndLogin("Admin", "admin@example.com");
  await User.updateOne({ _id: admin.id }, { role: "admin" });
});

test("login never reveals whether an email exists and never returns the password hash", async () => {
  const wrongPass = await api("/api/auth/login", { method: "POST", body: { email: "alice@example.com", password: "nope123" } });
  const noUser = await api("/api/auth/login", { method: "POST", body: { email: "ghost@example.com", password: "nope123" } });
  assert.equal(wrongPass.status, 400);
  assert.equal(noUser.status, 400);
  assert.equal(wrongPass.data.message, noUser.data.message);
  const ok = await api("/api/auth/login", { method: "POST", body: { email: " Alice@Example.com ", password: "secret123" } });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.user.password, undefined);
});

test("/api/auth/me needs a valid token and reflects the current role", async () => {
  assert.equal((await api("/api/auth/me")).status, 401);
  assert.equal((await api("/api/auth/me", { token: "garbage" })).status, 401);
  const me = await api("/api/auth/me", { token: admin.token });
  assert.equal(me.status, 200);
  assert.equal(me.data.user.role, "admin"); // role đổi sau khi đăng nhập vẫn được cập nhật
  assert.equal(me.data.user.password, undefined);
});

test("admin-only routes reject normal users", async () => {
  assert.equal((await api("/api/auth/users", { token: alice.token })).status, 403);
  assert.equal((await api("/api/apikeys/admin", { token: alice.token })).status, 403);
  assert.equal((await api(`/api/users/${bob.id}/role`, { method: "PATCH", token: alice.token, body: { role: "admin" } })).status, 403);
  const users = await api("/api/auth/users", { token: admin.token });
  assert.equal(users.status, 200);
  assert.ok(users.data.every((u) => u.password === undefined));
});

test("users can only edit themselves; admins cannot change their own role", async () => {
  assert.equal((await api(`/api/users/${bob.id}`, { method: "PATCH", token: alice.token, body: { name: "Hacked" } })).status, 403);
  const renamed = await api(`/api/users/${alice.id}`, { method: "PATCH", token: alice.token, body: { name: "Alice 2" } });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.data.name, "Alice 2");
  assert.equal((await api(`/api/users/${admin.id}/role`, { method: "PATCH", token: admin.token, body: { role: "user" } })).status, 400);
  assert.equal((await api("/api/users/not-an-id/avatar", { method: "POST", token: admin.token })).status, 400);
});

test("change-password requires the current password for self", async () => {
  const wrong = await api(`/api/users/${bob.id}/change-password`, { method: "POST", token: bob.token, body: { currentPassword: "xxxxxx", newPassword: "newpass1" } });
  assert.equal(wrong.status, 400);
  const ok = await api(`/api/users/${bob.id}/change-password`, { method: "POST", token: bob.token, body: { currentPassword: "secret123", newPassword: "newpass1" } });
  assert.equal(ok.status, 200);
  const login = await api("/api/auth/login", { method: "POST", body: { email: "bob@example.com", password: "newpass1" } });
  assert.equal(login.status, 200);
});

test("chat history is private to its owner and visible to admins", async () => {
  const saved = await api("/api/chat/history/save", {
    method: "POST",
    token: alice.token,
    body: {
      botId: "esh-bot",
      botName: "Tư vấn ESH",
      title: "Học phí",
      messages: [
        { role: "user", content: "Xin chào", tokens: 5 },
        { role: "assistant", content: "Chào bạn", tokens: 7 },
        { role: "hacker", content: "bị loại" },
      ],
    },
  });
  assert.equal(saved.status, 201);
  const chatId = saved.data.chat.id;
  assert.equal(saved.data.chat.messages.length, 2);
  assert.equal(saved.data.chat.totalTokens, 12);

  const list = await api("/api/chat/history?botId=esh-bot", { token: alice.token });
  assert.equal(list.data.chats.length, 1);
  assert.equal(list.data.chats[0].lastMessage, "Chào bạn");

  assert.equal((await api(`/api/chat/history/${chatId}`, { token: bob.token })).status, 404);
  assert.equal((await api(`/api/chat/history?userId=${alice.id}`, { token: bob.token })).status, 403);
  assert.equal((await api(`/api/chat/history/${chatId}`, { method: "DELETE", token: bob.token })).status, 404);
  const overwrite = await api("/api/chat/history/save", { method: "POST", token: bob.token, body: { id: chatId, messages: [] } });
  assert.equal(overwrite.status, 404);

  const asAdmin = await api(`/api/chat/history?userId=${alice.id}`, { token: admin.token });
  assert.equal(asAdmin.data.chats.length, 1);
  assert.equal(asAdmin.data.totalTokens, 12);

  const stats = await api("/api/auth/users", { token: admin.token });
  assert.equal(stats.data.find((u) => u._id === alice.id).totalTokens, 12);

  assert.equal((await api(`/api/chat/history/${chatId}`, { method: "PUT", token: alice.token, body: { title: "Mới" } })).status, 200);
  assert.equal((await api(`/api/chat/history/${chatId}`, { method: "DELETE", token: alice.token })).status, 200);
  assert.equal((await api("/api/chat/history", { token: alice.token })).data.chats.length, 0);
});

test("chatbot list never exposes keys; hidden bots are admin-only", async () => {
  const noKey = await api("/api/apikeys", { method: "POST", token: admin.token, body: { name: "Bot", baseURL: "https://example.com/v1" } });
  assert.equal(noKey.status, 400);
  const created = await api("/api/apikeys", {
    method: "POST",
    token: admin.token,
    body: { name: "Bot", baseURL: "https://example.com/v1", apiKey: "sk-test-1234567890", model: "m" },
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.apiKey, undefined);

  const forUser = await api("/api/apikeys", { token: alice.token });
  assert.equal(forUser.data.length, 1);
  assert.equal(forUser.data[0].apiKey, undefined);
  assert.equal(forUser.data[0].baseURL, undefined);

  const forAdmin = await api("/api/apikeys/admin", { token: admin.token });
  assert.equal(forAdmin.data[0].apiKey, undefined);
  assert.equal(forAdmin.data[0].apiKeyMasked, "sk-t…7890");

  await api(`/api/apikeys/${created.data._id}/hide`, { method: "PATCH", token: admin.token, body: { hidden: true } });
  assert.equal((await api("/api/apikeys", { token: alice.token })).data.length, 0);
  const hiddenChat = await api("/api/chatbot/dynamic", {
    method: "POST",
    token: alice.token,
    body: { botId: created.data._id, messages: [{ role: "user", content: "hi" }] },
  });
  assert.equal(hiddenChat.status, 404);
});

test("chatbot endpoint validates the message list", async () => {
  const bad = await api("/api/chatbot/dynamic", { method: "POST", token: alice.token, body: { botId: "esh-bot", messages: [] } });
  assert.equal(bad.status, 400);
  const endsWithAssistant = await api("/api/chatbot/dynamic", {
    method: "POST",
    token: alice.token,
    body: { botId: "esh-bot", messages: [{ role: "assistant", content: "hi" }] },
  });
  assert.equal(endsWithAssistant.status, 400);
});

test("malformed JSON gets a 400, unknown routes a 404", async () => {
  const malformed = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{bad" });
  assert.equal(malformed.status, 400);
  assert.equal((await api("/api/nope")).status, 404);
});

test("blocked users are locked out immediately, even with an old token", async () => {
  const blocked = await api(`/api/users/${bob.id}/status`, { method: "PATCH", token: admin.token, body: { status: "blocked" } });
  assert.equal(blocked.status, 200);
  assert.equal((await api("/api/auth/me", { token: bob.token })).status, 403);
  const login = await api("/api/auth/login", { method: "POST", body: { email: "bob@example.com", password: "newpass1" } });
  assert.equal(login.status, 403);
});

test("deleting a user also deletes their chat history", async () => {
  await api("/api/chat/history/save", { method: "POST", token: alice.token, body: { botId: "x", messages: [{ role: "user", content: "a" }] } });
  assert.equal((await api(`/api/users/${alice.id}`, { method: "DELETE", token: admin.token })).status, 200);
  assert.equal((await api(`/api/chat/history?userId=${alice.id}`, { token: admin.token })).data.chats.length, 0);
  assert.equal((await api("/api/auth/me", { token: alice.token })).status, 401);
});

test("login is rate limited per IP", async () => {
  let last;
  for (let i = 0; i < 25; i++) {
    last = await api("/api/auth/login", { method: "POST", body: { email: "ghost@example.com", password: "nope123" } });
  }
  assert.equal(last.status, 429);
});
