require("dotenv").config();

const path = require("path");
const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;
const TABLE_NAME = "publications";
const COLUMNS = "id, date, network, subject, format, status";

const NETWORKS = ["Instagram", "LinkedIn", "TikTok", "Facebook", "X"];
const FORMATS = ["", "Post", "Story", "Reel", "Carrousel", "Article"];
const STATUSES = ["Idée", "Rédigé", "Publié"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// La clé secrète (sb_secret_…) donne tous les droits sur la base :
// elle reste sur le serveur et n'est jamais envoyée au navigateur.
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  : null;

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

function sendError(res, error) {
  console.error(error);
  res.status(500).json({ error: "Erreur lors de l'accès à Supabase." });
}

app.use(express.json({ limit: "1mb" }));

const api = express.Router();

api.use((req, res, next) => {
  if (!supabase) {
    res.status(503).json({ error: "Supabase n'est pas configuré sur le serveur." });
    return;
  }
  next();
});

api.get("/publications", async (req, res) => {
  const { data, error } = await supabase.from(TABLE_NAME).select(COLUMNS).order("date");
  if (error) return sendError(res, error);
  res.json(data);
});

api.post("/publications", async (req, res) => {
  const publication = parsePublication(req.body);
  if (!publication) return res.status(400).json({ error: "Publication invalide." });

  const { data, error } = await supabase.from(TABLE_NAME).insert(publication).select(COLUMNS).single();
  if (error) return sendError(res, error);
  res.status(201).json(data);
});

// Envoie les publications déjà enregistrées dans le navigateur (sans écraser l'existant).
api.post("/publications/import", async (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: "Liste attendue." });

  const publications = req.body.map(parsePublication).filter(Boolean);
  if (publications.length === 0) return res.json({ imported: 0 });

  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert(publications, { onConflict: "id", ignoreDuplicates: true });
  if (error) return sendError(res, error);
  res.json({ imported: publications.length });
});

api.patch("/publications/:id", async (req, res) => {
  const { status } = req.body || {};
  if (!UUID_PATTERN.test(req.params.id) || !STATUSES.includes(status)) {
    return res.status(400).json({ error: "Statut invalide." });
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({ status })
    .eq("id", req.params.id)
    .select(COLUMNS);
  if (error) return sendError(res, error);
  if (data.length === 0) return res.status(404).json({ error: "Publication introuvable." });
  res.json(data[0]);
});

api.delete("/publications/:id", async (req, res) => {
  if (!UUID_PATTERN.test(req.params.id)) return res.status(400).json({ error: "Identifiant invalide." });

  const { error } = await supabase.from(TABLE_NAME).delete().eq("id", req.params.id);
  if (error) return sendError(res, error);
  res.status(204).end();
});

app.use("/api", api);
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`Calendrier éditorial disponible sur http://localhost:${PORT}`);
  if (!supabase) {
    console.log("SUPABASE_URL ou SUPABASE_SECRET_KEY manquant dans .env : sauvegarde dans le navigateur uniquement.");
  }
});
