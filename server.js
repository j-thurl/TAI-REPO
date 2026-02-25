const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number.parseInt(process.env.PORT || "8787", 10);
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "latest.json");

const DEFAULT_DATA = {
  whoop: {
    recovery: 82,
    sleepPerformance: 77,
    dayStrain: 13.4,
    wakeTime: "07:00",
    bedTime: "23:30",
  },
  screentime: {
    socialHours: 3.1,
    otherHours: 2.4,
  },
  updatedAt: new Date().toISOString(),
};

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
  }
}

function readData() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return { ...DEFAULT_DATA };
  }
}

function writeData(payload) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2));
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  });
  res.end(JSON.stringify(payload));
}

function sendFile(res, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
  };

  const contentType = contentTypes[extension] || "application/octet-stream";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
}

function collectJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
      }
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", reject);
  });
}

function isValidTime(value) {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

function normalizeWhoop(payload) {
  const recovery = Number.parseFloat(payload.recovery);
  const sleepPerformance = Number.parseFloat(payload.sleepPerformance);
  const dayStrain = Number.parseFloat(payload.dayStrain);

  if ([recovery, sleepPerformance, dayStrain].some((v) => Number.isNaN(v))) {
    throw new Error("WHOOP payload must include numeric recovery, sleepPerformance, and dayStrain");
  }

  if (!isValidTime(payload.wakeTime) || !isValidTime(payload.bedTime)) {
    throw new Error("WHOOP payload must include wakeTime and bedTime in HH:MM format");
  }

  return {
    recovery,
    sleepPerformance,
    dayStrain,
    wakeTime: payload.wakeTime,
    bedTime: payload.bedTime,
  };
}

function normalizeScreentime(payload) {
  const socialHours = Number.parseFloat(payload.socialHours);
  const otherHours = Number.parseFloat(payload.otherHours);

  if ([socialHours, otherHours].some((v) => Number.isNaN(v))) {
    throw new Error("Screen payload must include numeric socialHours and otherHours");
  }

  return { socialHours, otherHours };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/whoop/today") {
    const data = readData();
    sendJson(res, 200, data.whoop);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/screentime/today") {
    const data = readData();
    sendJson(res, 200, data.screentime);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/ingest/whoop") {
    try {
      const body = await collectJsonBody(req);
      const whoop = normalizeWhoop(body);
      const existing = readData();
      const next = { ...existing, whoop, updatedAt: new Date().toISOString() };
      writeData(next);
      sendJson(res, 200, { ok: true, whoop });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/ingest/screentime") {
    try {
      const body = await collectJsonBody(req);
      const screentime = normalizeScreentime(body);
      const existing = readData();
      const next = { ...existing, screentime, updatedAt: new Date().toISOString() };
      writeData(next);
      sendJson(res, 200, { ok: true, screentime });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/debug/latest") {
    sendJson(res, 200, readData());
    return;
  }

  const staticPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = path.normalize(staticPath).replace(/^\.\.(\/|\\|$)/, "");
  const filePath = path.join(__dirname, safePath);

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  sendFile(res, filePath);
});

server.listen(PORT, "0.0.0.0", () => {
  ensureDataFile();
  console.log(`WHOOP Score app + API running on http://0.0.0.0:${PORT}`);
});
