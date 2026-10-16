require("dotenv").config();

const path = require("path");
const express = require("express");
const { createServerClient, parseCookieHeader, serializeCookieHeader } = require("@supabase/ssr");

const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SITE_URL } = process.env;
const PORT = process.env.PORT || 3000;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error("SUPABASE_URL et SUPABASE_PUBLISHABLE_KEY doivent être renseignés dans .env (voir .env.example).");
  process.exit(1);
}

const app = express();
const TABLE_NAME = "publications";
const COLUMNS = "id, date, network, subject, format, status";

const NETWORKS = ["Instagram", "LinkedIn", "TikTok", "Facebook", "X"];
const FORMATS = ["", "Post", "Story", "Reel", "Carrousel", "Article"];
const STATUSES = ["Idée", "Rédigé", "Publié"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const AUTH_ERRORS = {
  invalid_credentials: [401, "Email ou mot de passe incorrect."],
  email_not_confirmed: [403, "Confirme d'abord ton adresse email grâce au lien reçu."],
  user_already_exists: [409, "Un compte existe déjà avec cet email."],
  email_exists: [409, "Un compte existe déjà avec cet email."],
  weak_password: [400, `Mot de passe trop faible (${MIN_PASSWORD_LENGTH} caractères minimum).`],
  email_address_invalid: [400, "Adresse email invalide."],
  signup_disabled: [403, "Les inscriptions sont désactivées."],
  over_email_send_rate_limit: [429, "Trop d'emails envoyés. Réessaie dans quelques minutes."],
  over_request_rate_limit: [429, "Trop de tentatives. Réessaie dans quelques minutes."],
};

// Le serveur utilise un proxy (Replit, hébergeur…) : on lui fait confiance
// pour savoir si la requête d'origine était en HTTPS.
app.set("trust proxy", 1);

// Un client Supabase par requête : la session de l'utilisateur est lue et
// écrite dans des cookies httpOnly, inaccessibles au JavaScript de la page.
// La clé publishable reste sur le serveur ; la RLS de Supabase garantit que
// chaque utilisateur ne voit que ses propres publications.
function createSupabase(req, res) {
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: req.secure,
    },
    cookies: {
      getAll() {
        return parseCookieHeader(req.headers.cookie ?? "");
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value, options } of cookiesToSet) {
          res.append("Set-Cookie", serializeCookieHeader(name, value, options));
        }
        for (const [key, value] of Object.entries(headers || {})) {
          res.set(key, value);
        }
      },
    },
  });
}

function sendAuthError(res, error) {
  const [status, message] = AUTH_ERRORS[error.code] || [];
  if (status) return res.status(status).json({ error: message });
  console.error(error);
  res.status(500).json({ error: "Erreur lors de l'authentification. Réessaie." });
}

function sendDatabaseError(res, error) {
  console.error(error);
  res.status(500).json({ error: "Erreur lors de l'accès à Supabase." });
}

function readCredentials(body) {
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  return { email, password };
}

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

// Renvoie une publication propre, ou null si les données sont invalides.
function parsePublication(body) {
  if (!body || typeof body !== "object") return null;

  const publication = {
    id: body.id,
    date: body.date,
    network: body.network,
    subject: typeof body.subject === "string" ? body.subject.trim() : "",
    format: body.format || "",
    status: body.status || "Idée",
  };

  const isValid = typeof publication.id === "string" && UUID_PATTERN.test(publication.id)
    && isValidDate(publication.date)
    && NETWORKS.includes(publication.network)
    && publication.subject.length >= 1 && publication.subject.length <= 120
    && FORMATS.includes(publication.format)
    && STATUSES.includes(publication.status);

  return isValid ? publication : null;
}

app.use(express.json({ limit: "1mb" }));

const api = express.Router();

api.use((req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  req.supabase = createSupabase(req, res);
  next();
});

// --- Authentification -------------------------------------------------------

api.post("/auth/signup", async (req, res) => {
  const { email, password } = readCredentials(req.body);
  if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ error: "Adresse email invalide." });
  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.` });
  }

  const siteUrl = SITE_URL || `${req.protocol}://${req.get("host")}`;
  const { data, error } = await req.supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl}/auth/callback` },
  });
  if (error) return sendAuthError(res, error);

  // Si la confirmation par email est activée, Supabase ne renvoie pas de session.
  if (!data.session) return res.status(202).json({ needsConfirmation: true });
  res.status(201).json({ email: data.user.email });
});

api.post("/auth/login", async (req, res) => {
  const { email, password } = readCredentials(req.body);
  if (!email || !password) return res.status(400).json({ error: "Email et mot de passe obligatoires." });

  const { data, error } = await req.supabase.auth.signInWithPassword({ email, password });
  if (error) return sendAuthError(res, error);
  res.json({ email: data.user.email });
});

api.post("/auth/logout", async (req, res) => {
  const { error } = await req.supabase.auth.signOut();
  if (error) console.error(error);
  res.status(204).end();
});

api.get("/auth/me", async (req, res) => {
  const { data, error } = await req.supabase.auth.getUser();
  if (error || !data.user) return res.status(401).json({ error: "Non connecté." });
  res.json({ email: data.user.email });
});

// --- Publications (réservées aux utilisateurs connectés) -------------------

async function requireUser(req, res, next) {
  const { data, error } = await req.supabase.auth.getUser();
  if (error || !data.user) return res.status(401).json({ error: "Connecte-toi pour accéder à tes publications." });
  req.user = data.user;
  next();
}

api.use("/publications", requireUser);

api.get("/publications", async (req, res) => {
  const { data, error } = await req.supabase.from(TABLE_NAME).select(COLUMNS).order("date");
  if (error) return sendDatabaseError(res, error);
  res.json(data);
});

api.post("/publications", async (req, res) => {
  const publication = parsePublication(req.body);
  if (!publication) return res.status(400).json({ error: "Publication invalide." });

  const { data, error } = await req.supabase
    .from(TABLE_NAME)
    .insert({ ...publication, user_id: req.user.id })
    .select(COLUMNS)
    .single();
  if (error) return sendDatabaseError(res, error);
  res.status(201).json(data);
});

// Envoie les publications enregistrées dans le navigateur avant la création des comptes.
api.post("/publications/import", async (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: "Liste attendue." });

  const publications = req.body
    .map(parsePublication)
    .filter(Boolean)
    .map((publication) => ({ ...publication, user_id: req.user.id }));
  if (publications.length === 0) return res.json({ imported: 0 });

  const { error } = await req.supabase
    .from(TABLE_NAME)
    .upsert(publications, { onConflict: "id", ignoreDuplicates: true });
  if (error) return sendDatabaseError(res, error);
  res.json({ imported: publications.length });
});

api.patch("/publications/:id", async (req, res) => {
  const { status } = req.body || {};
  if (!UUID_PATTERN.test(req.params.id) || !STATUSES.includes(status)) {
    return res.status(400).json({ error: "Statut invalide." });
  }

  const { data, error } = await req.supabase
    .from(TABLE_NAME)
    .update({ status })
    .eq("id", req.params.id)
    .select(COLUMNS);
  if (error) return sendDatabaseError(res, error);
  if (data.length === 0) return res.status(404).json({ error: "Publication introuvable." });
  res.json(data[0]);
});

api.delete("/publications/:id", async (req, res) => {
  if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ error: "Identifiant invalide." });

  const { error } = await req.supabase.from(TABLE_NAME).delete().eq("id", req.params.id);
  if (error) return sendDatabaseError(res, error);
  res.status(204).end();
});

app.use("/api", api);

// Lien reçu par email après l'inscription : Supabase renvoie ici avec un code
// à échanger contre une session.
app.get("/auth/callback", async (req, res) => {
  res.set("Cache-Control", "private, no-store");
  const code = typeof req.query.code === "string" ? req.query.code : "";
  if (!code) return res.redirect("/?auth=error");

  const supabase = createSupabase(req, res);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error(error);
    return res.redirect("/?auth=error");
  }
  res.redirect("/?auth=confirmed");
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`Calendrier éditorial disponible sur http://localhost:${PORT}`);
});
