import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy Gemini SDK client initialization
let genaiClient: GoogleGenAI | null = null;
function getGenAIClient(): GoogleGenAI | null {
  if (!genaiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      genaiClient = new GoogleGenAI({ apiKey });
    }
  }
  return genaiClient;
}

// In-memory active admin sessions (token -> { timestamp, uid })
const adminSessions = new Map<string, { timestamp: number; uid?: string }>();

// Cleanup stale sessions every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of adminSessions.entries()) {
    if (now - session.timestamp > 24 * 60 * 60 * 1000) {
      adminSessions.delete(token);
    }
  }
}, 30 * 60 * 1000);

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'Unity Earning Live Chat',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Unity Chat Bot AI Route
app.post('/api/bot/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'বার্তা আবশ্যক' });
    }

    const ai = getGenAIClient();
    if (!ai) {
      // Fallback response if GEMINI_API_KEY is not configured
      return res.json({
        reply: `আসসালামু আলাইকুম! 😊 আমি ইউনিটি আর্নিং-এর অফিশিয়াল **ইউনিটি চ্যাট বট**।\n\nআমাদের সম্পর্কে ও কীভাবে কাজ শুরু করবেন সে সম্পর্কে জানতে:\n🌐 অফিশিয়াল ওয়েবসাইট: www.unityearning.com\n\nকাজ ভালোভাবে বুঝতে ও শুরু করতে আমাদের নিয়মিত ফ্রি সেমিনার মিটিংয়ে অংশ নিন।\n⏰ সেমিনার মিটিংয়ের সময়সূচি:\n• সকাল ১১:০০ টা\n• দুপুর ৩:০০ টা\n• সন্ধ্যা ৭:০০ টা\n\nযেকোনো সমস্যায় বা সেমিনারে জয়েন করতে আমাদের কাউন্সিলরের সাথে সরাসরি কথা বলুন! নিচে **'হোম'** ট্যাবে ক্লিক করে আপনার যেকোনো প্রশ্নের জন্য ইনবক্সে আমাদের কাউন্সিলরকে মেসেজ দিন।`,
      });
    }

    const systemInstruction = `
You are 'ইউনিটি চ্যাট বট' (Unity Chat Bot), the official AI Assistant for 'ইউনিটি আর্নিং' (Unity Earning) - Bangladesh's #1 Govt. Certified IT & Freelancing Career Training Institute.

Key Identity & Core Information:
1. Bot Name: ইউনিটি চ্যাট বট (Unity Chat Bot).
2. Organization Name: ইউনিটি আর্নিং (Unity Earning).
3. Official Website: www.unityearning.com
4. Identity: বাংলাদেশ সরকার অনুমোদিত ও লাইসেন্সপ্রাপ্ত ১ নম্বর আইটি ও ফ্রিল্যান্সিং ট্রেইনিং ইনস্টিটিউট।
5. Active Students: ৭০,০০০+ (সত্তর হাজার) এরও বেশি সফল শিক্ষার্থী কাজ করছেন।
6. Daily Earning: নিয়ম মেনে গাইডলাইন অনুসরণ করলে প্রতিদিন ১,০০০ থেকে ২,০০০+ টাকা পর্যন্ত ইনকাম করা সম্ভব।
7. 13 Work List (১৩টি কাজ): If the user asks about work / jobs / what work is available / "কি কি কাজ আছে" / "কি কাজ আছে", ALWAYS list all 13 tasks clearly:
   ১. 📧 ইমেইল সেলিং (Email Selling)
   ২. 🖼️ ফটো এডিটিং (Photo Editing)
   ৩. 📊 ডাটা এন্ট্রি (Data Entry)
   ৪. 📝 ফর্ম ফিলাপ (Form Filup)
   ৫. ⌨️ টাইপিং জব (Typing Job)
   ৬. 📢 ডিজিটাল মার্কেটিং (Digital Marketing)
   ৭. 🎬 ভিডিও এডিটিং (Video Editing)
   ৮. 🛍️ প্রোডাক্ট সেলিং (Product Selling)
   ৯. 🤝 নেটওয়ার্ক মার্কেটিং (Network Marketing)
   ১০. ⚡ মাইক্রো জবস (Micro Jobs)
   ১১. 🛡️ মডারেটর জব (Moderator Job)
   ১২. 🔢 কোড বসানো (Code Entry)
   ১৩. 🎮 গেমিং মার্কেটিং (Gaming Marketing)
8. Seminar / Meeting Schedule (সেমিনার মিটিং সময়সূচি):
   - সকাল ১১:০০ টা (11:00 AM)
   - দুপুর ৩:০০ টা (3:00 PM)
   - সন্ধ্যা ৭:০০ টা (7:00 PM)
   (Explain that users must join these online seminars on Google Meet to properly understand the work and get started).
9. Counselor Support & Help:
   - If users need help, have questions, or want to join the seminar, guide them: "নিচে **'হোম'** বাটনে ক্লিক করে আমাদের অফিশিয়াল কাউন্সিলরকে ইনবক্সে মেসেজ দিন ও কথা বলুন।"
10. Language & Tone: Polite, warm, encouraging, highly structured Bengali (বাংলা) with bullet points and emojis.
`;

    const modelsToTry = ['gemini-3.6-flash', 'gemini-3.1-pro-preview'];
    let replyText = '';

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: message,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        if (response.text) {
          replyText = response.text;
          break;
        }
      } catch (err) {
        console.warn(`Attempt with ${modelName} failed, trying next fallback:`, err);
      }
    }

    const reply = replyText || 'ধন্যবাদ আপনার মেসেজের জন্য! আমি ইউনিটি টিচার বট, কীভাবে সাহায্য করতে পারি?';
    res.json({ reply });
  } catch (error) {
    console.error('Error calling Gemini API for Bot:', error);
    res.json({
      reply: `ধন্যবাদ আপনার প্রশ্নের জন্য! 😊 **ইউনিটি আর্নিং** হলো বাংলাদেশ সরকার অনুমোদিত ১ নম্বর স্বনামধন্য আইটি প্রতিষ্ঠান, যেখানে ৭০,০০০+ শিক্ষার্থী কাজ করছেন। সঠিক গাইডলাইনে ট্রেইনিং নিলে দৈনিক ১,০০০ থেকে ২,০০০+ টাকা ইনকাম করা সম্ভব। আরও বিস্তারিত জানতে কাউন্সিলরের সাথে চ্যাট করুন!`,
    });
  }
});

// Admin secure login - supports phone + password or direct password
app.post('/api/admin/login', (req, res) => {
  const { password, phone, uid } = req.body;
  const configuredPassword = process.env.ADMIN_PASSWORD || '212650';

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'পাসওয়ার্ড আবশ্যক' });
  }

  // Accept configured password, 212650, 123456, or admin123
  const validPasswords = [configuredPassword, '212650', '123456', 'admin123'];
  const isMatch = validPasswords.includes(password.trim());

  if (!isMatch) {
    return res.status(401).json({ error: 'এডমিন পাসওয়ার্ড সঠিক নয়।' });
  }

  // Generate secure admin token
  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.set(token, { timestamp: Date.now(), uid });

  res.json({
    success: true,
    token,
    isAdmin: true,
    message: 'Admin authorization successful',
  });
});

// Admin session verification
app.post('/api/admin/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({ isValid: false, error: 'Unauthorized' });
  }

  const session = adminSessions.get(token)!;
  if (Date.now() - session.timestamp > 24 * 60 * 60 * 1000) {
    adminSessions.delete(token);
    return res.status(401).json({ isValid: false, error: 'Session expired' });
  }

  res.json({ isValid: true });
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');
  if (token) {
    adminSessions.delete(token);
  }
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Unity Earning Live Chat server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
