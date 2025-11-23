from flask import Flask, render_template, request, jsonify
from neo4j import GraphDatabase
from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

app = Flask(__name__)

# Mam jeden globalny driver dla całej aplikacji
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

def run_query(query, parameters=None):
    # otwieram sesję i wykonuję zapytanie
    with driver.session() as session:
        result = session.run(query, parameters or {})
        return list(result)
    # Sesja jest zamykana automatycznie

@app.route("/") # main page
def index():
    return render_template("index.html") # moj template z basicowym HTMLem

@app.route("/api/movies") # endpoint do szukania filmów, query param: title
def search_movies():
    title = request.args.get("title", "").strip() # pobieram parametr z query
    if not title:
        return jsonify([]) # jesli pusty, zwracam pustą listę
    
    # szukam węzłów typu Movie
    # szukam po tytule
    # zwracam info

    query = """
        MATCH (m:Movie) 
        WHERE toLower(m.title) CONTAINS toLower($title) 
        RETURN id(m) AS id, m.title AS title, m.year AS year, m.rating AS rating 
        ORDER BY m.title
    """
    records = run_query(query, {"title": title})

    movies = [
        {
            "id": record["id"],
            "title": record["title"],
            "year": record.get("year"),
            "rating": record.get("rating"),
        }
        for record in records
    ]
    return jsonify(movies)

@app.route("/api/movies/all")
def all_movies():
    query = """
    MATCH (m:Movie)
    RETURN id(m) AS id, m.title AS title, m.year AS year, m.rating AS rating
    ORDER BY m.title
    """
    records = run_query(query)

    movies = [
        {
            "id": record["id"],
            "title": record["title"],
            "year": record.get("year"),
            "rating": record.get("rating"),
        }
        for record in records
    ]
    return jsonify(movies)

@app.route("/api/movies/<int:movie_id>")
def movie_details(movie_id):
    # szukam węzeła Movie o danym ID        Movie
    # znajdz aktorow ktorzy w nim grali     Movie < acted_in - Person
    # znajdz reżyserów tego filmu           Movie < directed - Person
    # znajdz gatunki tego filmu             Movie - in_genre -> Genre

    query = """
        MATCH (m:Movie)
        WHERE id(m) = $movie_id
        OPTIONAL MATCH (m)<-[:ACTED_IN]-(a:Person)
        OPTIONAL MATCH (m)<-[:DIRECTED]-(d:Person)
        OPTIONAL MATCH (m)-[:IN_GENRE]->(g:Genre)
        RETURN m,
            collect(DISTINCT a) AS actors,
            collect(DISTINCT d) AS directors,
            collect(DISTINCT g) AS genres
    """
    records = run_query(query, {"movie_id": movie_id})

    record = records[0]
    m = record["m"]

    def node_to_dict(node):
        if node is None:
            return None
        data = dict(node)
        data["id"] = node.id
        data["labels"] = list(node.labels)
        return data

    movie = node_to_dict(m)

    actors = [node_to_dict(a) for a in record["actors"] if a is not None]
    directors = [node_to_dict(d) for d in record["directors"] if d is not None]
    genres = [node_to_dict(g) for g in record["genres"] if g is not None]

    return jsonify(
        {
            "movie": movie,
            "actors": actors,
            "directors": directors,
            "genres": genres,
        }
    )


@app.route("/api/movies/<int:movie_id>/similar")
def similar_movies(movie_id):
    # Musze znalezc bazowy film
    # znajduje podobe na podstawie gatunku
    # oraz aktorów
    query = """
        MATCH (m:Movie)
        WHERE id(m) = $movie_id

        OPTIONAL MATCH (m)-[:IN_GENRE]->(g:Genre)<-[:IN_GENRE]-(sim1:Movie)
        WHERE id(sim1) <> id(m)

        OPTIONAL MATCH (m)<-[:ACTED_IN]-(a:Person)-[:ACTED_IN]->(sim2:Movie)
        WHERE id(sim2) <> id(m)

        WITH collect(DISTINCT sim1) + collect(DISTINCT sim2) AS sims
        UNWIND sims AS s
        WITH DISTINCT s

        RETURN id(s) AS id,
            s.title AS title,
            s.year AS year,
            s.rating AS rating
        ORDER BY s.rating DESC, s.title
    """

    records = run_query(query, {"movie_id": movie_id})

    similar = [
        {
            "id": record["id"],
            "title": record["title"],
            "year": record.get("year"),
            "rating": record.get("rating"),
        }
        for record in records
    ]
    return jsonify(similar)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
