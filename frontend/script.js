const API_URL = "http://localhost:3000/books";

const collection = document.querySelector('[data-ui="collection"]');
document.querySelector('[data-ui="endpoint"]').textContent = API_URL;

function renderBooks(books) {
  collection.replaceChildren();

  for (const book of books) {
    const title = document.createElement("p");
    title.textContent = book.title;
    collection.append(title);
  }
}

async function loadBooks() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const books = await response.json();
    renderBooks(books);
  } catch (error) {
    console.error("Не удалось загрузить книги", error);
  }
}

loadBooks();

