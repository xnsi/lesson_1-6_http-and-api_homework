const API_URL = "http://localhost:3000/books";
const REQUEST_TIMEOUT_MS = 5000;

const collection = document.querySelector('[data-ui="collection"]');
const status = document.querySelector('[data-ui="status"]');
const statusTitle = status.querySelector(".status__title");
const statusText = status.querySelector(".status__text");
const reloadButton = document.querySelector('[data-action="reload"]');
const entryForm = document.querySelector('[data-form="entry"]');
const submitButton = document.querySelector('[data-action="submit"]');
const submitStatus = document.querySelector('[data-ui="submit-status"]');
document.querySelector('[data-ui="endpoint"]').textContent = API_URL;

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
  setListState("loading", "Загрузка", "Загружаем книги...");
  reloadButton.disabled = true;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const books = await response.json();
    renderBooks(books);
  } catch (error) {
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
    reloadButton.disabled = false;
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

entryForm.addEventListener("submit", submitBook);
reloadButton.addEventListener("click", loadBooks);
loadBooks();

