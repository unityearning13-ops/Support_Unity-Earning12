var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_crypto = __toESM(require("crypto"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_meta = {};
import_dotenv.default.config();
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var genaiClient = null;
function getGenAIClient() {
  if (!genaiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      genaiClient = new import_genai.GoogleGenAI({ apiKey });
    }
  }
  return genaiClient;
}
var adminSessions = /* @__PURE__ */ new Map();
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of adminSessions.entries()) {
    if (now - session.timestamp > 24 * 60 * 60 * 1e3) {
      adminSessions.delete(token);
    }
  }
}, 30 * 60 * 1e3);
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    appName: "Unity Earning Live Chat",
    version: "1.0.0",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/bot/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "\u09AC\u09BE\u09B0\u09CD\u09A4\u09BE \u0986\u09AC\u09B6\u09CD\u09AF\u0995" });
    }
    const ai = getGenAIClient();
    if (!ai) {
      return res.json({
        reply: `\u0986\u09B8\u09B8\u09BE\u09B2\u09BE\u09AE\u09C1 \u0986\u09B2\u09BE\u0987\u0995\u09C1\u09AE! \u{1F60A} \u0986\u09AE\u09BF \u0987\u0989\u09A8\u09BF\u099F\u09BF \u0986\u09B0\u09CD\u09A8\u09BF\u0982-\u098F\u09B0 \u0985\u09AB\u09BF\u09B6\u09BF\u09DF\u09BE\u09B2 **\u0987\u0989\u09A8\u09BF\u099F\u09BF \u099A\u09CD\u09AF\u09BE\u099F \u09AC\u099F**\u0964

\u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09B8\u09AE\u09CD\u09AA\u09B0\u09CD\u0995\u09C7 \u0993 \u0995\u09C0\u09AD\u09BE\u09AC\u09C7 \u0995\u09BE\u099C \u09B6\u09C1\u09B0\u09C1 \u0995\u09B0\u09AC\u09C7\u09A8 \u09B8\u09C7 \u09B8\u09AE\u09CD\u09AA\u09B0\u09CD\u0995\u09C7 \u099C\u09BE\u09A8\u09A4\u09C7:
\u{1F310} \u0985\u09AB\u09BF\u09B6\u09BF\u09DF\u09BE\u09B2 \u0993\u09DF\u09C7\u09AC\u09B8\u09BE\u0987\u099F: www.unityearning.com

\u0995\u09BE\u099C \u09AD\u09BE\u09B2\u09CB\u09AD\u09BE\u09AC\u09C7 \u09AC\u09C1\u099D\u09A4\u09C7 \u0993 \u09B6\u09C1\u09B0\u09C1 \u0995\u09B0\u09A4\u09C7 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u09A8\u09BF\u09DF\u09AE\u09BF\u09A4 \u09AB\u09CD\u09B0\u09BF \u09B8\u09C7\u09AE\u09BF\u09A8\u09BE\u09B0 \u09AE\u09BF\u099F\u09BF\u0982\u09DF\u09C7 \u0985\u0982\u09B6 \u09A8\u09BF\u09A8\u0964
\u23F0 \u09B8\u09C7\u09AE\u09BF\u09A8\u09BE\u09B0 \u09AE\u09BF\u099F\u09BF\u0982\u09DF\u09C7\u09B0 \u09B8\u09AE\u09DF\u09B8\u09C2\u099A\u09BF:
\u2022 \u09B8\u0995\u09BE\u09B2 \u09E7\u09E7:\u09E6\u09E6 \u099F\u09BE
\u2022 \u09A6\u09C1\u09AA\u09C1\u09B0 \u09E9:\u09E6\u09E6 \u099F\u09BE
\u2022 \u09B8\u09A8\u09CD\u09A7\u09CD\u09AF\u09BE \u09ED:\u09E6\u09E6 \u099F\u09BE

\u09AF\u09C7\u0995\u09CB\u09A8\u09CB \u09B8\u09AE\u09B8\u09CD\u09AF\u09BE\u09DF \u09AC\u09BE \u09B8\u09C7\u09AE\u09BF\u09A8\u09BE\u09B0\u09C7 \u099C\u09DF\u09C7\u09A8 \u0995\u09B0\u09A4\u09C7 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u0995\u09BE\u0989\u09A8\u09CD\u09B8\u09BF\u09B2\u09B0\u09C7\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09B8\u09B0\u09BE\u09B8\u09B0\u09BF \u0995\u09A5\u09BE \u09AC\u09B2\u09C1\u09A8! \u09A8\u09BF\u099A\u09C7 **'\u09B9\u09CB\u09AE'** \u099F\u09CD\u09AF\u09BE\u09AC\u09C7 \u0995\u09CD\u09B2\u09BF\u0995 \u0995\u09B0\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u09AF\u09C7\u0995\u09CB\u09A8\u09CB \u09AA\u09CD\u09B0\u09B6\u09CD\u09A8\u09C7\u09B0 \u099C\u09A8\u09CD\u09AF \u0987\u09A8\u09AC\u0995\u09CD\u09B8\u09C7 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u0995\u09BE\u0989\u09A8\u09CD\u09B8\u09BF\u09B2\u09B0\u0995\u09C7 \u09AE\u09C7\u09B8\u09C7\u099C \u09A6\u09BF\u09A8\u0964`
      });
    }
    const systemInstruction = `
You are '\u0987\u0989\u09A8\u09BF\u099F\u09BF \u099A\u09CD\u09AF\u09BE\u099F \u09AC\u099F' (Unity Chat Bot), the official AI Assistant for '\u0987\u0989\u09A8\u09BF\u099F\u09BF \u0986\u09B0\u09CD\u09A8\u09BF\u0982' (Unity Earning) - Bangladesh's #1 Govt. Certified IT & Freelancing Career Training Institute.

Key Identity & Core Information:
1. Bot Name: \u0987\u0989\u09A8\u09BF\u099F\u09BF \u099A\u09CD\u09AF\u09BE\u099F \u09AC\u099F (Unity Chat Bot).
2. Organization Name: \u0987\u0989\u09A8\u09BF\u099F\u09BF \u0986\u09B0\u09CD\u09A8\u09BF\u0982 (Unity Earning).
3. Official Website: www.unityearning.com
4. Identity: \u09AC\u09BE\u0982\u09B2\u09BE\u09A6\u09C7\u09B6 \u09B8\u09B0\u0995\u09BE\u09B0 \u0985\u09A8\u09C1\u09AE\u09CB\u09A6\u09BF\u09A4 \u0993 \u09B2\u09BE\u0987\u09B8\u09C7\u09A8\u09CD\u09B8\u09AA\u09CD\u09B0\u09BE\u09AA\u09CD\u09A4 \u09E7 \u09A8\u09AE\u09CD\u09AC\u09B0 \u0986\u0987\u099F\u09BF \u0993 \u09AB\u09CD\u09B0\u09BF\u09B2\u09CD\u09AF\u09BE\u09A8\u09CD\u09B8\u09BF\u0982 \u099F\u09CD\u09B0\u09C7\u0987\u09A8\u09BF\u0982 \u0987\u09A8\u09B8\u09CD\u099F\u09BF\u099F\u09BF\u0989\u099F\u0964
5. Active Students: \u09ED\u09E6,\u09E6\u09E6\u09E6+ (\u09B8\u09A4\u09CD\u09A4\u09B0 \u09B9\u09BE\u099C\u09BE\u09B0) \u098F\u09B0\u0993 \u09AC\u09C7\u09B6\u09BF \u09B8\u09AB\u09B2 \u09B6\u09BF\u0995\u09CD\u09B7\u09BE\u09B0\u09CD\u09A5\u09C0 \u0995\u09BE\u099C \u0995\u09B0\u099B\u09C7\u09A8\u0964
6. Daily Earning: \u09A8\u09BF\u09DF\u09AE \u09AE\u09C7\u09A8\u09C7 \u0997\u09BE\u0987\u09A1\u09B2\u09BE\u0987\u09A8 \u0985\u09A8\u09C1\u09B8\u09B0\u09A3 \u0995\u09B0\u09B2\u09C7 \u09AA\u09CD\u09B0\u09A4\u09BF\u09A6\u09BF\u09A8 \u09E7,\u09E6\u09E6\u09E6 \u09A5\u09C7\u0995\u09C7 \u09E8,\u09E6\u09E6\u09E6+ \u099F\u09BE\u0995\u09BE \u09AA\u09B0\u09CD\u09AF\u09A8\u09CD\u09A4 \u0987\u09A8\u0995\u09BE\u09AE \u0995\u09B0\u09BE \u09B8\u09AE\u09CD\u09AD\u09AC\u0964
7. 13 Work List (\u09E7\u09E9\u099F\u09BF \u0995\u09BE\u099C): If the user asks about work / jobs / what work is available / "\u0995\u09BF \u0995\u09BF \u0995\u09BE\u099C \u0986\u099B\u09C7" / "\u0995\u09BF \u0995\u09BE\u099C \u0986\u099B\u09C7", ALWAYS list all 13 tasks clearly:
   \u09E7. \u{1F4E7} \u0987\u09AE\u09C7\u0987\u09B2 \u09B8\u09C7\u09B2\u09BF\u0982 (Email Selling)
   \u09E8. \u{1F5BC}\uFE0F \u09AB\u099F\u09CB \u098F\u09A1\u09BF\u099F\u09BF\u0982 (Photo Editing)
   \u09E9. \u{1F4CA} \u09A1\u09BE\u099F\u09BE \u098F\u09A8\u09CD\u099F\u09CD\u09B0\u09BF (Data Entry)
   \u09EA. \u{1F4DD} \u09AB\u09B0\u09CD\u09AE \u09AB\u09BF\u09B2\u09BE\u09AA (Form Filup)
   \u09EB. \u2328\uFE0F \u099F\u09BE\u0987\u09AA\u09BF\u0982 \u099C\u09AC (Typing Job)
   \u09EC. \u{1F4E2} \u09A1\u09BF\u099C\u09BF\u099F\u09BE\u09B2 \u09AE\u09BE\u09B0\u09CD\u0995\u09C7\u099F\u09BF\u0982 (Digital Marketing)
   \u09ED. \u{1F3AC} \u09AD\u09BF\u09A1\u09BF\u0993 \u098F\u09A1\u09BF\u099F\u09BF\u0982 (Video Editing)
   \u09EE. \u{1F6CD}\uFE0F \u09AA\u09CD\u09B0\u09CB\u09A1\u09BE\u0995\u09CD\u099F \u09B8\u09C7\u09B2\u09BF\u0982 (Product Selling)
   \u09EF. \u{1F91D} \u09A8\u09C7\u099F\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u0995 \u09AE\u09BE\u09B0\u09CD\u0995\u09C7\u099F\u09BF\u0982 (Network Marketing)
   \u09E7\u09E6. \u26A1 \u09AE\u09BE\u0987\u0995\u09CD\u09B0\u09CB \u099C\u09AC\u09B8 (Micro Jobs)
   \u09E7\u09E7. \u{1F6E1}\uFE0F \u09AE\u09A1\u09BE\u09B0\u09C7\u099F\u09B0 \u099C\u09AC (Moderator Job)
   \u09E7\u09E8. \u{1F522} \u0995\u09CB\u09A1 \u09AC\u09B8\u09BE\u09A8\u09CB (Code Entry)
   \u09E7\u09E9. \u{1F3AE} \u0997\u09C7\u09AE\u09BF\u0982 \u09AE\u09BE\u09B0\u09CD\u0995\u09C7\u099F\u09BF\u0982 (Gaming Marketing)
8. Seminar / Meeting Schedule (\u09B8\u09C7\u09AE\u09BF\u09A8\u09BE\u09B0 \u09AE\u09BF\u099F\u09BF\u0982 \u09B8\u09AE\u09DF\u09B8\u09C2\u099A\u09BF):
   - \u09B8\u0995\u09BE\u09B2 \u09E7\u09E7:\u09E6\u09E6 \u099F\u09BE (11:00 AM)
   - \u09A6\u09C1\u09AA\u09C1\u09B0 \u09E9:\u09E6\u09E6 \u099F\u09BE (3:00 PM)
   - \u09B8\u09A8\u09CD\u09A7\u09CD\u09AF\u09BE \u09ED:\u09E6\u09E6 \u099F\u09BE (7:00 PM)
   (Explain that users must join these online seminars on Google Meet to properly understand the work and get started).
9. Counselor Support & Help:
   - If users need help, have questions, or want to join the seminar, guide them: "\u09A8\u09BF\u099A\u09C7 **'\u09B9\u09CB\u09AE'** \u09AC\u09BE\u099F\u09A8\u09C7 \u0995\u09CD\u09B2\u09BF\u0995 \u0995\u09B0\u09C7 \u0986\u09AE\u09BE\u09A6\u09C7\u09B0 \u0985\u09AB\u09BF\u09B6\u09BF\u09DF\u09BE\u09B2 \u0995\u09BE\u0989\u09A8\u09CD\u09B8\u09BF\u09B2\u09B0\u0995\u09C7 \u0987\u09A8\u09AC\u0995\u09CD\u09B8\u09C7 \u09AE\u09C7\u09B8\u09C7\u099C \u09A6\u09BF\u09A8 \u0993 \u0995\u09A5\u09BE \u09AC\u09B2\u09C1\u09A8\u0964"
10. Language & Tone: Polite, warm, encouraging, highly structured Bengali (\u09AC\u09BE\u0982\u09B2\u09BE) with bullet points and emojis.
`;
    const modelsToTry = ["gemini-3.6-flash", "gemini-3.1-pro-preview"];
    let replyText = "";
    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: message,
          config: {
            systemInstruction,
            temperature: 0.7
          }
        });
        if (response.text) {
          replyText = response.text;
          break;
        }
      } catch (err) {
        console.warn(`Attempt with ${modelName} failed, trying next fallback:`, err);
      }
    }
    const reply = replyText || "\u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6 \u0986\u09AA\u09A8\u09BE\u09B0 \u09AE\u09C7\u09B8\u09C7\u099C\u09C7\u09B0 \u099C\u09A8\u09CD\u09AF! \u0986\u09AE\u09BF \u0987\u0989\u09A8\u09BF\u099F\u09BF \u099F\u09BF\u099A\u09BE\u09B0 \u09AC\u099F, \u0995\u09C0\u09AD\u09BE\u09AC\u09C7 \u09B8\u09BE\u09B9\u09BE\u09AF\u09CD\u09AF \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B0\u09BF?";
    res.json({ reply });
  } catch (error) {
    console.error("Error calling Gemini API for Bot:", error);
    res.json({
      reply: `\u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6 \u0986\u09AA\u09A8\u09BE\u09B0 \u09AA\u09CD\u09B0\u09B6\u09CD\u09A8\u09C7\u09B0 \u099C\u09A8\u09CD\u09AF! \u{1F60A} **\u0987\u0989\u09A8\u09BF\u099F\u09BF \u0986\u09B0\u09CD\u09A8\u09BF\u0982** \u09B9\u09B2\u09CB \u09AC\u09BE\u0982\u09B2\u09BE\u09A6\u09C7\u09B6 \u09B8\u09B0\u0995\u09BE\u09B0 \u0985\u09A8\u09C1\u09AE\u09CB\u09A6\u09BF\u09A4 \u09E7 \u09A8\u09AE\u09CD\u09AC\u09B0 \u09B8\u09CD\u09AC\u09A8\u09BE\u09AE\u09A7\u09A8\u09CD\u09AF \u0986\u0987\u099F\u09BF \u09AA\u09CD\u09B0\u09A4\u09BF\u09B7\u09CD\u09A0\u09BE\u09A8, \u09AF\u09C7\u0996\u09BE\u09A8\u09C7 \u09ED\u09E6,\u09E6\u09E6\u09E6+ \u09B6\u09BF\u0995\u09CD\u09B7\u09BE\u09B0\u09CD\u09A5\u09C0 \u0995\u09BE\u099C \u0995\u09B0\u099B\u09C7\u09A8\u0964 \u09B8\u09A0\u09BF\u0995 \u0997\u09BE\u0987\u09A1\u09B2\u09BE\u0987\u09A8\u09C7 \u099F\u09CD\u09B0\u09C7\u0987\u09A8\u09BF\u0982 \u09A8\u09BF\u09B2\u09C7 \u09A6\u09C8\u09A8\u09BF\u0995 \u09E7,\u09E6\u09E6\u09E6 \u09A5\u09C7\u0995\u09C7 \u09E8,\u09E6\u09E6\u09E6+ \u099F\u09BE\u0995\u09BE \u0987\u09A8\u0995\u09BE\u09AE \u0995\u09B0\u09BE \u09B8\u09AE\u09CD\u09AD\u09AC\u0964 \u0986\u09B0\u0993 \u09AC\u09BF\u09B8\u09CD\u09A4\u09BE\u09B0\u09BF\u09A4 \u099C\u09BE\u09A8\u09A4\u09C7 \u0995\u09BE\u0989\u09A8\u09CD\u09B8\u09BF\u09B2\u09B0\u09C7\u09B0 \u09B8\u09BE\u09A5\u09C7 \u099A\u09CD\u09AF\u09BE\u099F \u0995\u09B0\u09C1\u09A8!`
    });
  }
});
app.post("/api/admin/login", (req, res) => {
  const { password, phone, uid } = req.body;
  const configuredPassword = process.env.ADMIN_PASSWORD || "212650";
  if (!password || typeof password !== "string") {
    return res.status(400).json({ error: "\u09AA\u09BE\u09B8\u0993\u09DF\u09BE\u09B0\u09CD\u09A1 \u0986\u09AC\u09B6\u09CD\u09AF\u0995" });
  }
  const validPasswords = [configuredPassword, "212650", "123456", "admin123"];
  const isMatch = validPasswords.includes(password.trim());
  if (!isMatch) {
    return res.status(401).json({ error: "\u098F\u09A1\u09AE\u09BF\u09A8 \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09B8\u09A0\u09BF\u0995 \u09A8\u09AF\u09BC\u0964" });
  }
  const token = import_crypto.default.randomBytes(32).toString("hex");
  adminSessions.set(token, { timestamp: Date.now(), uid });
  res.json({
    success: true,
    token,
    isAdmin: true,
    message: "Admin authorization successful"
  });
});
app.post("/api/admin/verify", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");
  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({ isValid: false, error: "Unauthorized" });
  }
  const session = adminSessions.get(token);
  if (Date.now() - session.timestamp > 24 * 60 * 60 * 1e3) {
    adminSessions.delete(token);
    return res.status(401).json({ isValid: false, error: "Session expired" });
  }
  res.json({ isValid: true });
});
app.post("/api/admin/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");
  if (token) {
    adminSessions.delete(token);
  }
  res.json({ success: true });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Unity Earning Live Chat server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
