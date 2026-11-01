// Package migrations embeds the project's SQL migrations into the binary.
// The embed directive is resolved relative to this file, so it finds the
// *.sql files sitting beside it regardless of where the binary is built.
package migrations

import "embed"

//go:embed *.up.sql *.down.sql
var FS embed.FS
