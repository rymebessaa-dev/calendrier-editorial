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

const publications = [];
const statuses = ["Idée", "Rédigé", "Publié"];
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
    publication.status = statusControl.value;
    renderCalendar();
    formFeedback.textContent = `Statut de « ${publication.subject} » mis à jour : ${publication.status}.`;
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
      renderCalendar();
      formFeedback.textContent = "Publication supprimée.";
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
  renderCalendar();
  formFeedback.textContent = `« ${publication.subject} » a été ajoutée.`;

  form.elements.subject.value = "";
  form.elements.format.value = "";
  form.elements.subject.focus();
});

renderCalendar();