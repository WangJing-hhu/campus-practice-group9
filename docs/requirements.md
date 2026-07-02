# Campus QA Requirements

## Scope

Build a teaching-ready, locally run campus knowledge assistant with authentication,
document management, DashScope-backed RAG, cited answers, and conversation history.

## User Stories

1. As a student, I can register and sign in so my conversations are private.
2. As a student, I can ask campus questions and see the supporting sources.
3. As a student, I can review and delete my previous conversations.
4. As an administrator, I can upload and manage knowledge-base documents.
5. As an administrator, I can manage user status and roles.

## Acceptance Criteria

- When a visitor submits valid registration data, the system shall create an
  active student account and return an authenticated session.
- When a user submits a question, the system shall retrieve relevant chunks,
  produce an answer, persist the exchange, and return cited sources.
- The local demo shall require a valid DashScope API key for embedding and answer
  generation.
- When an administrator uploads TXT, Markdown, PDF, or DOCX content, the system
  shall extract text, split it into chunks, and make it searchable.
- When a non-administrator calls an administrator endpoint, the system shall
  return HTTP 403.
- When an administrator disables a user, that user shall no longer be able to
  authenticate or use protected endpoints.
- While using a mobile viewport, the system shall preserve all primary chat,
  history, and document-management workflows.

## Non-goals

- Production-scale vector infrastructure.
- Multi-tenant organization isolation.
- OCR for scanned documents.
- Public deployment or production secret management.
