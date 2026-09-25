const form = document.querySelector("#publication-form");
const publicationList = document.querySelector("#publication-list");
const publicationCount = document.querySelector("#publication-count");
const emptyState = document.querySelector("#empty-state");
const formFeedback = document.querySelector("#form-feedback");
const dateInput = document.querySelector("#publication-date");

const publications = [];

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

function renderPublications() {
  publicationList.replaceChildren();

  const orderedPublications = [...publications].sort((a, b) => a.date.localeCompare(b.date));

  for (const publication of orderedPublications) {
    const dateParts = formatDateParts(publication.date);
    const item = document.createElement("li");
    item.className = "publication-card";

    const dateTile = document.createElement("div");
    dateTile.className = "date-tile";
    dateTile.setAttribute("aria-label", dateParts.full);

    const dateDay = document.createElement("span");
    dateDay.className = "date-day";
    dateDay.textContent = dateParts.day;

    const dateMonth = document.createElement("span");
    dateMonth.className = "date-month";
    dateMonth.textContent = dateParts.month;
    dateTile.append(dateDay, dateMonth);

    const details = document.createElement("div");
    details.className = "publication-details";

    const subject = document.createElement("p");
    subject.className = "publication-subject";
    subject.textContent = publication.subject;
    subject.title = publication.subject;

    const meta = document.createElement("div");
    meta.className = "publication-meta";

    const network = document.createElement("span");
    network.className = "network-tag";
    network.textContent = publication.network;
    meta.append(network);

    if (publication.format) {
      const format = document.createElement("span");
      format.textContent = publication.format;
      meta.append(format);
    }

    details.append(subject, meta);

    const removeButton = document.createElement("button");
    removeButton.className = "remove-button";
    removeButton.type = "button";
    removeButton.textContent = "Supprimer";
    removeButton.setAttribute("aria-label", `Supprimer : ${publication.subject}`);
    removeButton.addEventListener("click", () => {
      const index = publications.findIndex((entry) => entry.id === publication.id);
      if (index !== -1) {
        publications.splice(index, 1);
        renderPublications();
        formFeedback.textContent = "Publication supprimée.";
      }
    });

    item.append(dateTile, details, removeButton);
    publicationList.append(item);
  }

  publicationCount.textContent = String(publications.length);
  emptyState.classList.toggle("is-hidden", publications.length > 0);
}

function getLocalDateValue(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

dateInput.value = getLocalDateValue();

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
  renderPublications();
  formFeedback.textContent = `« ${publication.subject} » a été ajoutée.`;

  form.elements.subject.value = "";
  form.elements.format.value = "";
  form.elements.subject.focus();
});