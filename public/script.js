const form = document.querySelector("#publication-form");
const publicationCount = document.querySelector("#publication-count");
const formFeedback = document.querySelector("#form-feedback");
const dateInput = document.querySelector("#publication-date");
const calendarMonthTitle = document.querySelector("#calendar-month-title");
const calendarDays = document.querySelector("#calendar-days");
const calendarEmptyState = document.querySelector("#calendar-empty-state");
const previousMonthButton = document.querySelector("#previous-month");
const currentMonthButton = document.querySelector("#current-month");
const nextMonthButton = document.querySelector("#next-month");
const networkFilter = document.querySelector("#network-filter");
const statusFilter = document.querySelector("#status-filter");
const resetFiltersButton = document.querySelector("#reset-filters");
const statusCounters = document.querySelectorAll(".status-counter");
const monthProgressFill = document.querySelector("#month-progress-fill");
const monthProgressLabel = document.querySelector("#month-progress-label");
const saveStatus = document.querySelector("#save-status");
const appView = document.querySelector("#app-view");
const authView = document.querySelector("#auth-view");
const authForm = document.querySelector("#auth-form");
const authTitle = document.querySelector("#auth-title");
const authFeedback = document.querySelector("#auth-feedback");
const authSubmit = document.querySelector("#auth-submit");
const authSubmitLabel = document.querySelector("#auth-submit-label");
const authPassword = document.querySelector("#auth-password");
const passwordHint = document.querySelector("#password-hint");
const loginTab = document.querySelector("#login-tab");
const signupTab = document.querySelector("#signup-tab");
const headerNote = document.querySelector("#header-note");
const account = document.querySelector("#account");
const accountEmail = document.querySelector("#account-email");
const logoutButton = document.querySelector("#logout-button");

// Anciennes publications enregistrées dans le navigateur, avant les comptes.
const LEGACY_STORAGE_KEY = "calendrier-editorial.publications";
const API_URL = "/api";
const statuses = ["Idée", "Rédigé", "Publié"];
const publications = [];
let authMode = "login";
const networkClassNames = {
  Instagram: "network-instagram",
  LinkedIn: "network-linkedin",
  TikTok: "network-tiktok",
  Facebook: "network-facebook",
  X: "network-x",
};
const statusClassNames = {
  Idée: "status-idee",
  Rédigé: "status-redige",
  Publié: "status-publie",
};
let viewedMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

function isValidPublication(publication) {
  return Boolean(publication)
    && typeof publication.id === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(publication.date)
    && typeof publication.network === "string"
    && typeof publication.subject === "string"
    && statuses.includes(publication.status);
}

function readLegacyPublications() {
  try {
    const saved = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter(isValidPublication) : [];
  } catch {
    return [];
  }
}

function setSaveStatus(message, isError = false) {
  saveStatus.textContent = message;
  saveStatus.classList.toggle("is-error", isError);
}

function setAuthFeedback(message, isError = false) {
  authFeedback.textContent = message;
  authFeedback.classList.toggle("is-error", isError);
}

function toPublication(row) {
  return {
    id: row.id,
    date: row.date,
    network: row.network,
    subject: row.subject,
    format: row.format || "",
    status: row.status,
  };
}

// Appelle l'API du serveur. La session est portée par un cookie httpOnly.
async function callApi(path, method = "GET", body) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.error || `Erreur ${response.status} sur ${method} ${API_URL}${path}`);
    error.status = response.status;
    if (response.status === 401 && path.startsWith("/publications")) {
      showAuth("Ta session a expiré. Reconnecte-toi.", true);
    }
    throw error;
  }
  return data;
}

async function importLegacyPublications() {
  const legacyPublications = readLegacyPublications();
  if (legacyPublications.length === 0) return;

  await callApi("/publications/import", "POST", legacyPublications);
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Rien à faire : l'import sera simplement ignoré la prochaine fois (doublons évités par l'id).
  }
}

async function loadPublications() {
  setSaveStatus("Chargement de tes publications…");
  try {
    await importLegacyPublications();
    const data = await callApi("/publications");
    publications.splice(0, publications.length, ...data.map(toPublication).filter(isValidPublication));
    renderCalendar();
    setSaveStatus("Tes publications sont sauvegardées en ligne (Supabase).");
  } catch (error) {
    console.error(error);
    if (error.status !== 401) {
      setSaveStatus("Impossible de charger tes publications. Recharge la page.", true);
    }
  }
}

// Applique le changement tout de suite à l'écran, puis l'envoie au serveur.
// En cas d'échec, `rollback` annule le changement local.
async function persistChange(sendToServer, rollback) {
  renderCalendar();

  try {
    await sendToServer();
    setSaveStatus("Tes publications sont sauvegardées en ligne (Supabase).");
  } catch (error) {
    console.error(error);
    rollback();
    renderCalendar();
    if (error.status !== 401) {
      setSaveStatus("La modification n'a pas pu être enregistrée sur Supabase. Réessaie.", true);
    }
  }
}

function showApp(email) {
  accountEmail.textContent = email;
  account.classList.remove("is-hidden");
  headerNote.classList.add("is-hidden");
  authView.classList.add("is-hidden");
  appView.classList.remove("is-hidden");
  saveStatus.classList.remove("is-hidden");
  formFeedback.textContent = "";
  loadPublications();
}

function showAuth(message = "", isError = false) {
  publications.splice(0, publications.length);
  account.classList.add("is-hidden");
  headerNote.classList.remove("is-hidden");
  appView.classList.add("is-hidden");
  saveStatus.classList.add("is-hidden");
  authView.classList.remove("is-hidden");
  setAuthFeedback(message, isError);
}

function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === "signup";
  loginTab.setAttribute("aria-pressed", String(!isSignup));
  signupTab.setAttribute("aria-pressed", String(isSignup));
  authTitle.textContent = isSignup ? "Créer un compte" : "Se connecter";
  authSubmitLabel.textContent = isSignup ? "Créer mon compte" : "Se connecter";
  authPassword.autocomplete = isSignup ? "new-password" : "current-password";
  passwordHint.classList.toggle("is-hidden", !isSignup);
  setAuthFeedback("");
}

async function initAuth() {
  const params = new URLSearchParams(window.location.search);
  const authResult = params.get("auth");
  if (authResult) window.history.replaceState(null, "", window.location.pathname);

  try {
    const user = await callApi("/auth/me");
    showApp(user.email);
    if (authResult === "confirmed") setSaveStatus("Email confirmé : bienvenue !");
  } catch {
    showAuth(
      authResult === "error" ? "Le lien de confirmation est invalide ou a expiré. Connecte-toi ou recrée un compte." : "",
      authResult === "error",
    );
  }
}

function formatDateParts(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return {
    day: new Intl.DateTimeFormat("fr-FR", { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(date).replace(".", ""),
    full: new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date),
  };
}

function toDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function networkClass(network) {
  return networkClassNames[network] || "network-x";
}

function statusClass(status) {
  return statusClassNames[status] || "status-idee";
}

function createCalendarEvent(publication, dateParts) {
  const event = document.createElement("article");
  event.className = `calendar-event ${networkClass(publication.network)} ${statusClass(publication.status)}`;
  event.setAttribute("aria-label", `${publication.network} : ${publication.subject}, ${dateParts.full}`);
  event.title = `${publication.network} — ${publication.subject}${publication.format ? ` · ${publication.format}` : ""} · ${publication.status}`;

  const network = document.createElement("span");
  network.className = "event-network";
  network.textContent = publication.network;

  const subject = document.createElement("span");
  subject.className = "event-subject";
  subject.textContent = publication.subject;

  const statusControl = document.createElement("select");
  statusControl.className = `event-status-control ${statusClass(publication.status)}`;
  statusControl.setAttribute("aria-label", `Statut de la publication : ${publication.subject}`);

  for (const status of statuses) {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    option.selected = status === publication.status;
    statusControl.append(option);
  }

  statusControl.value = publication.status;
  statusControl.addEventListener("change", () => {
    const previousStatus = publication.status;
    const newStatus = statusControl.value;
    publication.status = newStatus;
    formFeedback.textContent = `Statut de « ${publication.subject} » mis à jour : ${newStatus}.`;
    persistChange(
      () => callApi(`/${publication.id}`, "PATCH", { status: newStatus }),
      () => { publication.status = previousStatus; },
    );
  });

  const removeButton = document.createElement("button");
  removeButton.className = "event-remove";
  removeButton.type = "button";
  removeButton.textContent = "×";
  removeButton.title = "Supprimer cette publication";
  removeButton.setAttribute("aria-label", `Supprimer : ${publication.subject}`);
  removeButton.addEventListener("click", () => {
    const index = publications.findIndex((entry) => entry.id === publication.id);
    if (index !== -1) {
      publications.splice(index, 1);
      formFeedback.textContent = "Publication supprimée.";
      persistChange(
        () => callApi(`/${publication.id}`, "DELETE"),
        () => { publications.push(publication); },
      );
    }
  });

  event.append(network, subject, statusControl, removeButton);
  return event;
}

function renderCalendar() {
  const year = viewedMonth.getFullYear();
  const month = viewedMonth.getMonth();
  const monthLabel = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(viewedMonth);
  calendarMonthTitle.textContent = monthLabel;
  calendarDays.replaceChildren();

  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const numberOfCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const publicationsByDate = new Map();
  const visiblePublications = publications.filter((publication) => {
    const matchesNetwork = !networkFilter.value || publication.network === networkFilter.value;
    const matchesStatus = !statusFilter.value || publication.status === statusFilter.value;
    return matchesNetwork && matchesStatus;
  });

  for (const publication of visiblePublications) {
    const datePublications = publicationsByDate.get(publication.date) || [];
    datePublications.push(publication);
    publicationsByDate.set(publication.date, datePublications);
  }

  const hasActiveFilter = Boolean(networkFilter.value || statusFilter.value);
  networkFilter.classList.toggle("is-active", Boolean(networkFilter.value));
  statusFilter.classList.toggle("is-active", Boolean(statusFilter.value));
  resetFiltersButton.classList.toggle("is-hidden", !hasActiveFilter);

  const todayValue = getLocalDateValue();
  let publicationsInMonth = 0;

  for (let weekStart = 0; weekStart < numberOfCells; weekStart += 7) {
    const row = document.createElement("tr");

    for (let weekday = 0; weekday < 7; weekday += 1) {
      const cellIndex = weekStart + weekday;
      const date = new Date(year, month, cellIndex - firstWeekday + 1);
      const dateValue = toDateValue(date);
      const inCurrentMonth = date.getMonth() === month;
      const dateParts = formatDateParts(dateValue);
      const cell = document.createElement("td");
      cell.className = `calendar-day${inCurrentMonth ? "" : " is-adjacent-month"}${dateValue === todayValue ? " is-today" : ""}`;

      const dayHeading = document.createElement("div");
      dayHeading.className = "calendar-day-heading";

      const dateNumber = document.createElement("time");
      dateNumber.className = "calendar-date-number";
      dateNumber.dateTime = dateValue;
      dateNumber.textContent = String(date.getDate());
      dayHeading.append(dateNumber);

      if (!inCurrentMonth) {
        const adjacentMonth = document.createElement("span");
        adjacentMonth.className = "adjacent-month-name";
        adjacentMonth.textContent = dateParts.month;
        dayHeading.append(adjacentMonth);
      }

      cell.append(dayHeading);

      const datePublications = publicationsByDate.get(dateValue) || [];
      if (inCurrentMonth) publicationsInMonth += datePublications.length;

      for (const publication of datePublications) {
        cell.append(createCalendarEvent(publication, dateParts));
      }

      cell.setAttribute(
        "aria-label",
        `${dateParts.full}${datePublications.length ? `, ${datePublications.length} publication${datePublications.length === 1 ? "" : "s"}` : ""}`,
      );
      row.append(cell);
    }

    calendarDays.append(row);
  }

  publicationCount.textContent = String(publicationsInMonth);
  publicationCount.setAttribute(
    "aria-label",
    `${publicationsInMonth} publication${publicationsInMonth === 1 ? "" : "s"} affichée${publicationsInMonth === 1 ? "" : "s"} ce mois-ci`,
  );
  calendarEmptyState.textContent = hasActiveFilter
    ? `Aucun résultat pour ces filtres en ${monthLabel}.`
    : `Aucune publication prévue en ${monthLabel}. Ajoute un contenu pour le voir apparaître ici.`;
  calendarEmptyState.classList.toggle("is-hidden", publicationsInMonth > 0);
  renderMonthStats(year, month);
}

function renderMonthStats(year, month) {
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  const monthPublications = publications.filter((publication) => publication.date.startsWith(monthPrefix));
  const total = monthPublications.length;

  for (const counter of statusCounters) {
    const status = counter.dataset.status;
    const count = monthPublications.filter((publication) => publication.status === status).length;
    const isSelected = statusFilter.value === status;
    counter.querySelector(".counter-value").textContent = String(count);
    counter.setAttribute("aria-pressed", String(isSelected));
    counter.title = isSelected ? "Afficher tous les statuts" : `Afficher uniquement : ${status}`;
  }

  const published = monthPublications.filter((publication) => publication.status === "Publié").length;
  const percent = total ? Math.round((published / total) * 100) : 0;
  monthProgressFill.style.width = `${percent}%`;
  monthProgressLabel.textContent = total
    ? `${published} sur ${total} publiée${published === 1 ? "" : "s"} · ${percent} %`
    : "Aucune publication ce mois-ci";
}

function getLocalDateValue(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

dateInput.value = getLocalDateValue();

previousMonthButton.addEventListener("click", () => {
  viewedMonth = new Date(viewedMonth.getFullYear(), viewedMonth.getMonth() - 1, 1);
  renderCalendar();
});

currentMonthButton.addEventListener("click", () => {
  const today = new Date();
  viewedMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  renderCalendar();
});

nextMonthButton.addEventListener("click", () => {
  viewedMonth = new Date(viewedMonth.getFullYear(), viewedMonth.getMonth() + 1, 1);
  renderCalendar();
});

networkFilter.addEventListener("change", renderCalendar);
statusFilter.addEventListener("change", renderCalendar);

for (const counter of statusCounters) {
  counter.addEventListener("click", () => {
    const status = counter.dataset.status;
    statusFilter.value = statusFilter.value === status ? "" : status;
    renderCalendar();
  });
}

resetFiltersButton.addEventListener("click", () => {
  networkFilter.value = "";
  statusFilter.value = "";
  renderCalendar();
  networkFilter.focus();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!form.reportValidity()) return;

  const formData = new FormData(form);
  const publication = {
    id: crypto.randomUUID(),
    date: String(formData.get("date")),
    network: String(formData.get("network")),
    subject: String(formData.get("subject")).trim(),
    format: String(formData.get("format")),
    status: "Idée",
  };

  if (!publication.subject) {
    form.elements.subject.setCustomValidity("Saisis un sujet pour cette publication.");
    form.elements.subject.reportValidity();
    form.elements.subject.setCustomValidity("");
    return;
  }

  publications.push(publication);
  networkFilter.value = "";
  statusFilter.value = "";
  const [year, month] = publication.date.split("-").map(Number);
  viewedMonth = new Date(year, month - 1, 1);
  formFeedback.textContent = `« ${publication.subject} » a été ajoutée.`;
  persistChange(
    () => callApi("", "POST", publication),
    () => {
      const index = publications.findIndex((entry) => entry.id === publication.id);
      if (index !== -1) publications.splice(index, 1);
    },
  );

  form.elements.subject.value = "";
  form.elements.format.value = "";
  form.elements.subject.focus();
});

loginTab.addEventListener("click", () => setAuthMode("login"));
signupTab.addEventListener("click", () => setAuthMode("signup"));

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!authForm.reportValidity()) return;

  const credentials = {
    email: authForm.elements.email.value,
    password: authForm.elements.password.value,
  };
  authSubmit.disabled = true;
  setAuthFeedback(authMode === "signup" ? "Création du compte…" : "Connexion…");

  try {
    if (authMode === "signup") {
      const result = await callApi("/auth/signup", "POST", credentials);
      if (result.needsConfirmation) {
        setAuthMode("login");
        setAuthFeedback("Compte créé ! Clique sur le lien reçu par email pour l'activer, puis connecte-toi.");
        return;
      }
      authForm.reset();
      showApp(result.email);
    } else {
      const user = await callApi("/auth/login", "POST", credentials);
      authForm.reset();
      showApp(user.email);
    }
  } catch (error) {
    setAuthFeedback(error.message, true);
  } finally {
    authSubmit.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await callApi("/auth/logout", "POST");
  } finally {
    setAuthMode("login");
    showAuth("Déconnexion réussie.");
  }
});

renderCalendar();
initAuth();