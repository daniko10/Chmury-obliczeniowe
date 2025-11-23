async function searchMovies(title) {
  const resp = await fetch(`/api/movies?title=${encodeURIComponent(title)}`);
  if (!resp.ok) {
    console.error("Błąd podczas wyszukiwania filmów");
    return [];
  }
  return await resp.json();
}

async function loadMovieDetails(id) {
  const resp = await fetch(`/api/movies/${id}`);
  if (!resp.ok) {
    console.error("Błąd podczas pobierania szczegółów filmu");
    return null;
  }
  return await resp.json();
}

async function loadSimilarMovies(id) {
  const resp = await fetch(`/api/movies/${id}/similar`);
  if (!resp.ok) {
    console.error("Błąd podczas pobierania podobnych filmów");
    return [];
  }
  return await resp.json();
}

function renderResults(movies) {
  const list = document.getElementById("results-list");
  list.innerHTML = "";

  if (!movies.length) {
    const li = document.createElement("li");
    li.className = "list-group-item";
    li.textContent = "Brak wyników";
    list.appendChild(li);
    return;
  }

  movies.forEach((movie) => {
    const li = document.createElement("li");
    li.className = "list-group-item list-group-item-action";
    li.style.cursor = "pointer";

    const textParts = [];
    textParts.push(movie.title);
    if (movie.year) textParts.push(`(${movie.year})`);
    if (movie.rating) textParts.push(`ocena: ${movie.rating}`);
    li.textContent = textParts.join(" ");

    li.addEventListener("click", () => {
      showMovie(movie.id);
    });

    list.appendChild(li);
  });
}

function renderMovieDetails(data) {
  const card = document.getElementById("movie-details");
  const titleEl = document.getElementById("movie-title");
  const subtitleEl = document.getElementById("movie-subtitle");
  const actorsList = document.getElementById("actors-list");
  const directorsList = document.getElementById("directors-list");
  const genresList = document.getElementById("genres-list");

  if (!data || !data.movie) {
    card.style.display = "none";
    return;
  }

  const movie = data.movie;
  titleEl.textContent = movie.title;

  const subtitleParts = [];
  if (movie.year) subtitleParts.push(`Rok: ${movie.year}`);
  if (movie.rating) subtitleParts.push(`Ocena: ${movie.rating}`);
  subtitleEl.textContent = subtitleParts.join(" | ");

  const fillList = (ul, items, key = "name") => {
    ul.innerHTML = "";
    if (!items || !items.length) {
      const li = document.createElement("li");
      li.textContent = "brak danych";
      ul.appendChild(li);
      return;
    }
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item[key] || JSON.stringify(item);
      ul.appendChild(li);
    });
  };

  fillList(actorsList, data.actors || []);
  fillList(directorsList, data.directors || []);
  fillList(genresList, data.genres || []);

  card.style.display = "block";
}

function renderSimilarMovies(movies) {
  const list = document.getElementById("similar-list");
  list.innerHTML = "";

  if (!movies.length) {
    const li = document.createElement("li");
    li.className = "list-group-item";
    li.textContent = "Brak podobnych filmów.";
    list.appendChild(li);
    return;
  }

  movies.forEach((movie) => {
    const li = document.createElement("li");
    li.className = "list-group-item list-group-item-action";
    li.style.cursor = "pointer";
    const parts = [];
    parts.push(movie.title);
    if (movie.year) parts.push(`(${movie.year})`);
    if (movie.rating) parts.push(`ocena: ${movie.rating}`);
    li.textContent = parts.join(" ");
    li.addEventListener("click", () => {
      showMovie(movie.id);
    });
    list.appendChild(li);
  });
}

async function showMovie(id) {
  const detailsDiv = document.getElementById("details-div");
  detailsDiv.style.display = "block";
  const [details, similar] = await Promise.all([
    loadMovieDetails(id),
    loadSimilarMovies(id),
  ]);

  renderMovieDetails(details);
  renderSimilarMovies(similar);
}

async function loadAllMovies() {
  const resp = await fetch("/api/movies/all");
  if (!resp.ok) {
    console.error("Błąd ładowania pełnej listy filmów");
    return;
  }
  const movies = await resp.json();
  renderAllMovies(movies);
}

function renderAllMovies(movies) {
  const list = document.getElementById("all-movies-list");
  list.innerHTML = "";

  movies.forEach((movie) => {
    const li = document.createElement("li");
    li.className = "list-group-item list-group-item-action";
    li.style.cursor = "pointer";

    let text = movie.title;
    if (movie.year) text += ` (${movie.year})`;

    li.textContent = text;

    li.addEventListener("click", () => {
      showMovie(movie.id);
    });

    list.appendChild(li);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadAllMovies();
  const form = document.getElementById("search-form");
  const titleInput = document.getElementById("title-input");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    if (!title) return;
    const movies = await searchMovies(title);
    renderResults(movies);
  });
});
