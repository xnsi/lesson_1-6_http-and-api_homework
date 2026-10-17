const API_URL = "http://localhost:3000/books";

const collection = document.querySelector('[data-ui="collection"]');
const status = document.querySelector('[data-ui="status"]');
const statusTitle = status.querySelector(".status__title");
const statusText = status.querySelector(".status__text");
const reloadButton = document.querySelector('[data-action="reload"]');
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

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const books = await response.json();
    renderBooks(books);
  } catch (error) {
    console.error("Не удалось загрузить книги", error);
    setListState(
      "error",
      "Не удалось загрузить книги",
      'Проверьте, что API запущен, и нажмите "Обновить".'
    );
  } finally {
    reloadButton.disabled = false;
  }
}

reloadButton.addEventListener("click", loadBooks);
loadBooks();

