import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const PORT = process.env.PORT || 4173;
const DATA_PATH = join(process.cwd(), "data", "users.json");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const sendJson = (res, status, payload) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
};

const readUsers = async () => {
  const raw = await readFile(DATA_PATH, "utf-8");
  return JSON.parse(raw);
};

const writeUsers = async (users) => {
  await writeFile(DATA_PATH, JSON.stringify(users, null, 2));
};

const parseBody = async (req) => {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
  }
  return body ? JSON.parse(body) : {};
};

const handleRegister = async (req, res) => {
  const { account, password, name } = await parseBody(req);
  if (!account || !password || !name) {
    return sendJson(res, 400, { ok: false, message: "账号、密码、昵称不能为空" });
  }
  const users = await readUsers();
  if (users.find((user) => user.account === account)) {
    return sendJson(res, 409, { ok: false, message: "账号已存在" });
  }
  const level = "星耀 · 尊享";
  const points = Math.floor(1200 + Math.random() * 800);
  const id = `YWQ-${account.slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;
  const record = {
    account,
    password,
    name,
    level,
    points,
    id,
  };
  users.push(record);
  await writeUsers(users);
  return sendJson(res, 201, { ok: true, user: record });
};

const handleLogin = async (req, res) => {
  const { account, password } = await parseBody(req);
  if (!account || !password) {
    return sendJson(res, 400, { ok: false, message: "账号或密码不能为空" });
  }
  const users = await readUsers();
  const user = users.find((item) => item.account === account && item.password === password);
  if (!user) {
    return sendJson(res, 401, { ok: false, message: "账号或密码错误" });
  }
  return sendJson(res, 200, { ok: true, user });
};

const serveStatic = async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = join(process.cwd(), pathname);
  try {
    const data = await readFile(filePath);
    const type = contentTypes[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  } catch (error) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
};

const server = createServer(async (req, res) => {
  if (req.url?.startsWith("/api/register") && req.method === "POST") {
    return handleRegister(req, res);
  }
  if (req.url?.startsWith("/api/login") && req.method === "POST") {
    return handleLogin(req, res);
  }
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
