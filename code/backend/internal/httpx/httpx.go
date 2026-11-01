// Package httpx holds the small pieces every handler in this service
// shares: the request-id header (§2.1 of services.md) and the error
// envelope (§2.3). Kept to stdlib net/http — no router, no framework.
package httpx

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
)

type ctxKey int

const requestIDKey ctxKey = 0

// RequestID reads X-Request-Id from the caller, generates one if absent,
// echoes it on the response and makes it available via RequestIDFromContext
// — every handler and every error body uses the same value.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-Id")
		if id == "" {
			id = newRequestID()
		}
		w.Header().Set("X-Request-Id", id)
		ctx := context.WithValue(r.Context(), requestIDKey, id)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func RequestIDFromContext(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey).(string)
	return id
}

func newRequestID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// Detail is one field-level error, used by VALIDATION_FAILED and
// MALFORMED_REQUEST per the error catalog (§2.3).
type Detail struct {
	Field   string `json:"field"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

type errorBody struct {
	Error struct {
		Code      string   `json:"code"`
		Message   string   `json:"message"`
		Details   []Detail `json:"details,omitempty"`
		RequestID string   `json:"request_id"`
	} `json:"error"`
}

// WriteError writes the project's standard error envelope. details is nil
// for every code but VALIDATION_FAILED/MALFORMED_REQUEST.
func WriteError(w http.ResponseWriter, r *http.Request, status int, code, message string, details []Detail) {
	body := errorBody{}
	body.Error.Code = code
	body.Error.Message = message
	body.Error.Details = details
	body.Error.RequestID = RequestIDFromContext(r.Context())
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

// WriteJSON writes a 2xx JSON body with the project's standard content type.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
