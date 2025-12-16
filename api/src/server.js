require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "2h" });
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// Health check
app.get("/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Register
app.post("/auth/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  const password_hash = await bcrypt.hash(password, 10);
  try {
    await db.query("INSERT INTO users (email, password_hash) VALUES (?, ?)", [email, password_hash]);
    res.json({ ok: true });
  } catch (e) {
    if (String(e.message).includes("Duplicate")) return res.status(409).json({ error: "Email already exists" });
    res.status(500).json({ error: e.message });
  }
});

// Login step 1: password only
// If MFA enabled, return mfa_required=true and a temp token
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  if (user.mfa_enabled) {
    // short-lived token only for MFA verification
    const temp = jwt.sign({ id: user.id, stage: "mfa" }, process.env.JWT_SECRET, { expiresIn: "5m" });
    return res.json({ mfa_required: true, temp_token: temp });
  }

  const token = signToken(user);
  res.json({ mfa_required: false, token });
});

// MFA setup: generate secret + QR code (user must be logged in normally first)
app.post("/mfa/setup", authMiddleware, async (req, res) => {
  const secret = speakeasy.generateSecret({ name: `MealMate (${req.user.email})` });

  // store secret (base32)
  await db.query("UPDATE users SET mfa_secret = ? WHERE id = ?", [secret.base32, req.user.id]);

  const otpauth = secret.otpauth_url;
  const qr = await QRCode.toDataURL(otpauth);

  res.json({ otpauth_url: otpauth, qr_data_url: qr, base32: secret.base32 });
});

// MFA enable: user submits a valid code to turn on MFA
app.post("/mfa/enable", authMiddleware, async (req, res) => {
  const { code } = req.body;
  const [rows] = await db.query("SELECT mfa_secret FROM users WHERE id = ?", [req.user.id]);
  const secret = rows[0]?.mfa_secret;
  if (!secret) return res.status(400).json({ error: "Run /mfa/setup first" });

  const ok = speakeasy.totp.verify({ secret, encoding: "base32", token: String(code), window: 1 });
  if (!ok) return res.status(401).json({ error: "Invalid MFA code" });

  await db.query("UPDATE users SET mfa_enabled = 1 WHERE id = ?", [req.user.id]);
  res.json({ ok: true, mfa_enabled: true });
});

// Login step 2: verify MFA code using temp_token
app.post("/auth/mfa", async (req, res) => {
  const { temp_token, code } = req.body;
  if (!temp_token || !code) return res.status(400).json({ error: "temp_token and code required" });

  let payload;
  try {
    payload = jwt.verify(temp_token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Invalid temp_token" });
  }
  if (payload.stage !== "mfa") return res.status(401).json({ error: "Not an MFA token" });

  const [rows] = await db.query("SELECT id, email, mfa_secret, mfa_enabled FROM users WHERE id = ?", [payload.id]);
  const user = rows[0];
  if (!user?.mfa_enabled) return res.status(400).json({ error: "MFA not enabled" });

  const ok = speakeasy.totp.verify({ secret: user.mfa_secret, encoding: "base32", token: String(code), window: 1 });
  if (!ok) return res.status(401).json({ error: "Invalid MFA code" });

  const token = signToken(user);
  res.json({ token });
});

// Meals endpoints
app.post("/meals", authMiddleware, async (req, res) => {
  const { meal_text, calories, protein_g, carbs_g, fat_g } = req.body;
  if (!meal_text) return res.status(400).json({ error: "meal_text required" });

  await db.query(
    "INSERT INTO meals (user_id, meal_text, calories, protein_g, carbs_g, fat_g) VALUES (?, ?, ?, ?, ?, ?)",
    [req.user.id, meal_text, calories ?? null, protein_g ?? null, carbs_g ?? null, fat_g ?? null]
  );

  res.json({ ok: true });
});

app.get("/meals", authMiddleware, async (req, res) => {
  const [rows] = await db.query("SELECT * FROM meals WHERE user_id = ? ORDER BY created_at DESC", [req.user.id]);
  res.json(rows);
});

app.listen(process.env.PORT || 3000, () => console.log("API running"));
