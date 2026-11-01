// Package contact implements POST /v1/contact (services.md §3.10,
// CONTACT-001): forwards a visitor's message to the platform's Agent Team
// inbox. Nothing here writes to this project's own database.
package contact

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/ThanhNV121097/project-91d53506/backend/internal/httpx"
)

type request struct {
	Name     string `json:"name"`
	Contact  string `json:"contact"`
	Message  string `json:"message"`
	Honeypot string `json:"honeypot"`
}

// forwarder is the one method of *http.Client this handler needs — kept as
// an interface so a test can supply a stub without a real network call.
type forwarder interface {
	Do(req *http.Request) (*http.Response, error)
}

// Handler builds POST /v1/contact. agentTeamAPI/agentTeamKey are the
// platform's own copies of site.json's endpoint/key (AGENT_TEAM_API_URL,
// AGENT_TEAM_KEY); empty when unconfigured, which this handler treats as an
// ordinary forwarding failure (UNAVAILABLE) rather than a special state —
// the contract has no "offline" response.
func Handler(agentTeamAPI, agentTeamKey string, client forwarder) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			httpx.WriteError(w, r, http.StatusMethodNotAllowed, "MALFORMED_REQUEST", "Method not allowed.", nil)
			return
		}

		raw, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		if err != nil {
			httpx.WriteError(w, r, http.StatusBadRequest, "MALFORMED_REQUEST", "Could not read the request body.", nil)
			return
		}

		dec := json.NewDecoder(strings.NewReader(string(raw)))
		dec.DisallowUnknownFields()
		var req request
		if err := dec.Decode(&req); err != nil {
			httpx.WriteError(w, r, http.StatusBadRequest, "MALFORMED_REQUEST", "Body is not valid JSON, or carries a field this endpoint does not define.", nil)
			return
		}
		if dec.More() {
			httpx.WriteError(w, r, http.StatusBadRequest, "MALFORMED_REQUEST", "Body is not valid JSON.", nil)
			return
		}

		var details []httpx.Detail
		if strings.TrimSpace(req.Name) == "" {
			details = append(details, httpx.Detail{Field: "name", Code: "VALIDATION_FAILED", Message: "Name is required."})
		}
		if strings.TrimSpace(req.Contact) == "" {
			details = append(details, httpx.Detail{Field: "contact", Code: "VALIDATION_FAILED", Message: "A phone number or email is required."})
		}
		if len(details) > 0 {
			httpx.WriteError(w, r, http.StatusUnprocessableEntity, "VALIDATION_FAILED", "Required fields are missing.", details)
			return
		}

		// Checked after validation, before forwarding — a bot that fills the
		// honeypot but leaves name/contact blank still gets 422, not the
		// fake 202 (§3.10.1 Behaviour).
		if strings.TrimSpace(req.Honeypot) != "" {
			httpx.WriteJSON(w, http.StatusAccepted, struct{}{})
			return
		}

		if agentTeamAPI == "" || agentTeamKey == "" {
			httpx.WriteError(w, r, http.StatusServiceUnavailable, "UNAVAILABLE", "The message could not be delivered right now. Please try again, or call us.", nil)
			return
		}

		payload, err := json.Marshal(struct {
			Name    string `json:"name"`
			Contact string `json:"contact"`
			Message string `json:"message"`
		}{req.Name, req.Contact, req.Message})
		if err != nil {
			httpx.WriteError(w, r, http.StatusInternalServerError, "INTERNAL", "Could not prepare the message for delivery.", nil)
			return
		}

		url := strings.TrimSuffix(agentTeamAPI, "/") + "/" + agentTeamKey + "/messages"
		fwdReq, err := http.NewRequestWithContext(r.Context(), http.MethodPost, url, strings.NewReader(string(payload)))
		if err != nil {
			httpx.WriteError(w, r, http.StatusInternalServerError, "INTERNAL", "Could not build the forward request.", nil)
			return
		}
		fwdReq.Header.Set("Content-Type", "application/json; charset=utf-8")

		resp, err := client.Do(fwdReq)
		if err != nil {
			httpx.WriteError(w, r, http.StatusServiceUnavailable, "UNAVAILABLE", "The message could not be delivered right now. Please try again, or call us.", nil)
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			httpx.WriteError(w, r, http.StatusServiceUnavailable, "UNAVAILABLE", "The message could not be delivered right now. Please try again, or call us.", nil)
			return
		}

		httpx.WriteJSON(w, http.StatusAccepted, struct{}{})
	}
}
