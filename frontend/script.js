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
const submitButton = document.querySelector('[data-action="submit"]');
const submitStatus = document.querySelector('[data-ui="submit-status"]');
document.querySelector('[data-ui="endpoint"]').textContent = API_URL;

let activeController = null;
let searchTimeoutId;

function setListState(state, title, message) {
  status.className = `status status--${state}`;
  statusTitle.textContent = title;
  statusText.textContent = message;
  collection.hidden = state !== "success";
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

    card.append(title, meta);
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

  submitButton.disabled = true;
  submitStatus.textContent = "Сохраняем книгу...";

  try {
    const formData = new FormData(entryForm);
    const book = {
      title: formData.get("title"),
      author: formData.get("author"),
      genre: formData.get("genre"),
      year: Number(formData.get("year")),
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(book),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    entryForm.reset();
    submitStatus.textContent = "Книга сохранена.";
    await loadBooks();
  } catch (error) {
    console.error("Не удалось сохранить книгу", error);
    submitStatus.textContent = "Не удалось сохранить книгу. Проверьте API и повторите отправку.";
  } finally {
    submitButton.disabled = false;
  }
}

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeoutId);
  activeController?.abort();
  activeController = null;
  searchTimeoutId = setTimeout(loadBooks, SEARCH_DELAY_MS);
});

sortSelect.addEventListener("change", loadBooks);
entryForm.addEventListener("submit", submitBook);
reloadButton.addEventListener("click", loadBooks);
loadBooks();

