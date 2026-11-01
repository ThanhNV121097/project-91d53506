// Package migrate applies ordered .up.sql files from an embed.FS, tracking
// what has already run in a schema_migrations table so re-running is a
// no-op. Kept to stdlib database/sql: this project's migration needs are
// "apply what hasn't run, in filename order" and nothing more, so a
// dedicated library (golang-migrate, goose) would be a dependency for what
// this file already does in full.
package migrate

import (
	"database/sql"
	"fmt"
	"io/fs"
	"sort"
	"strings"
)

// Run creates schema_migrations if needed, then applies every *.up.sql file
// in dir (an embed.FS) whose version is not already recorded, in filename
// order, each inside its own transaction.
func Run(db *sql.DB, dir fs.FS) error {
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		version text PRIMARY KEY,
		applied_at timestamptz NOT NULL DEFAULT now()
	)`); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	entries, err := fs.Glob(dir, "*.up.sql")
	if err != nil {
		return fmt.Errorf("list migrations: %w", err)
	}
	sort.Strings(entries)

	for _, name := range entries {
		version := strings.TrimSuffix(name, ".up.sql")
		var applied int
		if err := db.QueryRow(`SELECT count(*) FROM schema_migrations WHERE version = $1`, version).Scan(&applied); err != nil {
			return fmt.Errorf("check %s: %w", version, err)
		}
		if applied > 0 {
			continue
		}

		sqlBytes, err := fs.ReadFile(dir, name)
		if err != nil {
			return fmt.Errorf("read %s: %w", name, err)
		}

		tx, err := db.Begin()
		if err != nil {
			return fmt.Errorf("begin %s: %w", version, err)
		}
		if _, err := tx.Exec(string(sqlBytes)); err != nil {
			tx.Rollback()
			return fmt.Errorf("apply %s: %w", version, err)
		}
		if _, err := tx.Exec(`INSERT INTO schema_migrations (version) VALUES ($1)`, version); err != nil {
			tx.Rollback()
			return fmt.Errorf("record %s: %w", version, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("commit %s: %w", version, err)
		}
	}
	return nil
}
