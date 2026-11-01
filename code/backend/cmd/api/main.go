// Command api is Nghệ An Departures' backend: it connects to Postgres,
// applies pending migrations, then serves /healthz and (as later stories
// land) the /v1/* API the frontend calls.
package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"

	"github.com/ThanhNV121097/project-91d53506/backend/internal/contact"
	"github.com/ThanhNV121097/project-91d53506/backend/internal/httpx"
	"github.com/ThanhNV121097/project-91d53506/backend/internal/migrate"
	"github.com/ThanhNV121097/project-91d53506/backend/migrations"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL is required")
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer db.Close()

	if err := migrate.Run(db, migrations.FS); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", healthz(db))

	port := os.Getenv("PORT")
	if port == "" {
		port = os.Getenv("APP_PORT")
	}
	if port == "" {
		port = "8080"
	}

	log.Printf("listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}

// healthz answers 200 only once migrations have succeeded (checked at boot,
// above) and the database still answers a live query — a crash after a
// healthy boot must flip this, not hide behind a cached flag.
func healthz(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()
		if err := db.PingContext(ctx); err != nil {
			http.Error(w, "database unreachable", http.StatusServiceUnavailable)
			return
		}
		var ok int
		if err := db.QueryRowContext(ctx, "SELECT 1").Scan(&ok); err != nil {
			http.Error(w, "database query failed", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}
}
