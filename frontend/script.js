const API_URL = "http://localhost:3000/books";
const REQUEST_TIMEOUT_MS = 5000;
const SEARCH_DELAY_MS = 300;

const collection = document.querySelector('[data-ui="collection"]');
const status = document.querySelector('[data-ui="status"]');
const statusTitle = status.querySelector(".status__title");
const statusText = status.querySelector(".status__text");
const reloadButton = document.querySelector('[data-action="reload"]');
const searchInput = document.querySelector('[data-ui="search"]');
const sortSelect = document.querySelector('[data-ui="sort"]');
const entryForm = document.querySelector('[data-form="entry"]');
const formTitle = document.querySelector("#form-title");
const submitButton = document.querySelector('[data-action="submit"]');
const cancelEditButton = document.querySelector('[data-action="cancel-edit"]');
const submitStatus = document.querySelector('[data-ui="submit-status"]');
document.querySelector('[data-ui="endpoint"]').textContent = API_URL;

let activeController = null;
let searchTimeoutId;
let editingBook = null;

function setListState(state, title, message) {
  status.className = `status status--${state}`;
  statusTitle.textContent = title;
  statusText.textContent = message;
  collection.hidden = state !== "success";
}

function resetEntryForm() {
  editingBook = null;
  entryForm.reset();
  formTitle.textContent = "Добавить объект";
  submitButton.textContent = "Отправить в API";
  cancelEditButton.hidden = true;
  submitStatus.textContent = "";
}

function editBook(book) {
  if (submitButton.disabled) {
    return;
  }

  editingBook = book;

  for (const name of ["title", "author", "genre", "year"]) {
    entryForm.elements[name].value = book[name];
  }

  formTitle.textContent = "Редактировать книгу";
  submitButton.textContent = "Сохранить изменения";
  cancelEditButton.hidden = false;
  submitStatus.textContent = "";
  entryForm.elements.title.focus();
}

function renderBooks(books) {
  collection.replaceChildren();

  if (books.length === 0) {
    setListState("empty", "Книг пока нет", "API вернул пустой список.");
    return;
  }

  for (const book of books) {
    const card = document.createElement("article");
    card.className = "card";

    const title = document.createElement("h3");
    title.className = "card__title";
    title.textContent = book.title;

    const meta = document.createElement("p");
    meta.className = "card__meta";
    meta.textContent = `Автор: ${book.author}. Жанр: ${book.genre}. Год: ${book.year}.`;

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "button button--secondary";
    editButton.textContent = "Редактировать";
    editButton.addEventListener("click", () => editBook(book));

    card.append(title, meta, editButton);
    collection.append(card);
  }

  setListState("success", "Книги загружены", `Получено книг: ${books.length}`);
}

async function loadBooks() {
  clearTimeout(searchTimeoutId);
  activeController?.abort();

  const controller = new AbortController();
  activeController = controller;
  setListState("loading", "Загрузка", "Загружаем книги...");
  reloadButton.disabled = true;
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = new URL(API_URL);
    const query = searchInput.value.trim();

    if (query) {
      url.searchParams.set("title:contains", query);
    }

    if (sortSelect.value) {
      url.searchParams.set("_sort", sortSelect.value);
    }

    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const books = await response.json();

    if (controller !== activeController) {
      return;
    }

    renderBooks(books);
  } catch (error) {
    if (controller !== activeController) {
      return;
    }

    console.error("Не удалось загрузить книги", error);
    const timedOut = controller.signal.aborted;
    setListState(
      "error",
      timedOut ? "Время ожидания истекло" : "Не удалось загрузить книги",
      timedOut
        ? 'Сервер не ответил вовремя. Нажмите "Обновить".'
        : 'Проверьте, что API запущен, и нажмите "Обновить".'
    );
  } finally {
    clearTimeout(timeoutId);

    if (controller === activeController) {
      activeController = null;
      reloadButton.disabled = false;
    }
  }
}

async function submitBook(event) {
  event.preventDefault();

  if (submitButton.disabled || !entryForm.reportValidity()) {
    return;
  }

  const formData = new FormData(entryForm);
  for (const field of entryForm.elements) {
    field.disabled = true;
  }
  submitStatus.textContent = "Сохраняем книгу...";

  try {
    const book = {
      title: formData.get("title"),
      author: formData.get("author"),
      genre: formData.get("genre"),
      year: Number(formData.get("year")),
    };

    const isEditing = editingBook !== null;
    const url = isEditing ? `${API_URL}/${encodeURIComponent(editingBook.id)}` : API_URL;
    const payload = isEditing
      ? Object.fromEntries(Object.entries(book).filter(([name, value]) => value !== editingBook[name]))
      : book;

    const response = await fetch(url, {
      method: isEditing ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    resetEntryForm();
    submitStatus.textContent = "Книга сохранена.";
    await loadBooks();
  } catch (error) {
    console.error("Не удалось сохранить книгу", error);
    submitStatus.textContent = "Не удалось сохранить книгу. Проверьте API и повторите отправку.";
  } finally {
    for (const field of entryForm.elements) {
      field.disabled = false;
    }
  }
}

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeoutId);
  activeController?.abort();
  activeController = null;
  searchTimeoutId = setTimeout(loadBooks, SEARCH_DELAY_MS);
});

sortSelect.addEventListener("change", loadBooks);
cancelEditButton.addEventListener("click", resetEntryForm);
entryForm.addEventListener("submit", submitBook);
reloadButton.addEventListener("click", loadBooks);
loadBooks();

