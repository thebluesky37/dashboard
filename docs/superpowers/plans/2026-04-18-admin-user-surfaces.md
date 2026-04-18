# Admin / User Surface Split Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the Dataline UI into two surfaces — an Admin surface (connection management, settings, default connection, per-connection instructions) and a User surface (chat only) — with hardened backend authorization enforcing the split.

**Architecture:** Admin access uses the existing HTTP-Basic-Auth (cookie-based). User routes are **publicly accessible with no authentication** — any anonymous visitor can use the chat surface. Admin routes are protected server-side with a `require_admin` dependency. The frontend routes admins to `/_admin` after login and sends everyone else directly to `/_user` with no login required. Two new DB columns (`connections.instructions`, `user.default_connection_id`) unlock the per-connection LLM customization and admin-selected default.

**Tech Stack:** FastAPI, SQLAlchemy 2 (mapped_column), Alembic, TanStack Router v1, React 18, TypeScript, Tailwind CSS, TanStack Query

---

## Current State Summary

| Area | Current behaviour |
|------|-------------------|
| Auth | Single HTTP Basic credential set (`auth_username`/`auth_password`) in env; stored in cookie; no roles |
| Connections | Full CRUD at `/connect`, `/connection/*`; all authenticated users have equal access |
| Default connection | Does not exist |
| Per-connection instructions | Does not exist; `SQL_PREFIX` is hardcoded in `backend/dataline/services/llm_flow/prompt.py` |
| Frontend routing | `/_app/chat/$conversationId`, `/_app/connection/new`, `/_app/connection/$id`, `/_app/user` — all under one protected layout |

---

## Chunk 1: Backend – Admin-Only Auth

### Task 1: Add `require_admin` dependency (admin = authenticated, user = anonymous)

**Files:**
- Modify: `backend/dataline/auth.py`

The model is simple: **anyone with valid HTTP Basic credentials is an admin**. Anonymous requests (no credentials) are users. No `user_password` is needed.

- [ ] **Step 1: Write failing test**

  Create `backend/tests/test_auth.py`:

  ```python
  from fastapi.testclient import TestClient
  import pytest
  from fastapi import HTTPException
  from dataline.auth import require_admin

  def test_require_admin_raises_403_for_anonymous(monkeypatch):
      monkeypatch.setattr("dataline.auth.config.auth_username", "admin")
      monkeypatch.setattr("dataline.auth.config.auth_password", "secret")
      # No credentials supplied → credentials will be None from Optional dependency
      with pytest.raises(HTTPException) as exc_info:
          import asyncio
          asyncio.get_event_loop().run_until_complete(require_admin(None))
      assert exc_info.value.status_code == 403
  ```

- [ ] **Step 2: Run test to confirm failure**

  ```bash
  cd backend && poetry run pytest tests/test_auth.py -v
  ```
  Expected: ImportError or AttributeError (`require_admin` not yet defined)

- [ ] **Step 3: Add `require_admin` to `backend/dataline/auth.py`**

  ```python
  from typing import Optional

  # Make the security dependency optional so anonymous requests don't auto-reject
  security_optional = HTTPBasicCustomized(auto_error=False)

  async def require_admin(
      credentials: Optional[HTTPBasicCredentials] = Depends(security_optional),
  ) -> None:
      """Dependency that allows only valid admin credentials. Rejects anonymous with 403."""
      if not config.has_auth:
          return  # auth disabled → allow all
      if credentials is None:
          raise HTTPException(
              status_code=status.HTTP_403_FORBIDDEN,
              detail="Admin access required",
          )
      validate_credentials(credentials.username, credentials.password)
  ```

- [ ] **Step 4: Run tests to confirm pass**

  ```bash
  cd backend && poetry run pytest tests/test_auth.py -v
  ```
  Expected: PASSED

- [ ] **Step 5: Commit**

  ```bash
  git add backend/dataline/auth.py backend/tests/test_auth.py
  git commit -m "feat(auth): add require_admin dependency for admin-only routes"
  ```

---

### Task 2: Protect admin routes, leave user routes open

**Files:**
- Modify: `backend/dataline/auth.py`
- Modify: `backend/dataline/app.py`

- [ ] **Step 1: Write failing tests**

  Add to `backend/tests/test_auth.py`:

  ```python
  from fastapi.testclient import TestClient

  def test_anonymous_cannot_access_connections(monkeypatch):
      monkeypatch.setenv("AUTH_USERNAME", "admin")
      monkeypatch.setenv("AUTH_PASSWORD", "adminpass")
      from dataline.main import app
      client = TestClient(app, raise_server_exceptions=False)
      # No auth at all — anonymous request
      response = client.get("/connections")
      assert response.status_code == 403

  def test_admin_can_access_connections(monkeypatch):
      monkeypatch.setenv("AUTH_USERNAME", "admin")
      monkeypatch.setenv("AUTH_PASSWORD", "adminpass")
      from dataline.main import app
      client = TestClient(app, raise_server_exceptions=False)
      response = client.get("/connections", auth=("admin", "adminpass"))
      assert response.status_code == 200

  def test_anonymous_can_access_conversations(monkeypatch):
      monkeypatch.setenv("AUTH_USERNAME", "admin")
      monkeypatch.setenv("AUTH_PASSWORD", "adminpass")
      from dataline.main import app
      client = TestClient(app, raise_server_exceptions=False)
      # No auth — anonymous user can list conversations
      response = client.get("/conversations")
      assert response.status_code == 200
  ```

- [ ] **Step 2: Run tests to confirm failure**

  ```bash
  cd backend && poetry run pytest tests/test_auth.py -v
  ```
  Expected: tests fail — all routes currently require the same auth

- [ ] **Step 3: Update `backend/dataline/app.py` to use split dependency groups**

  Replace the single `common_dependencies` with two groups:

  ```python
  from dataline.auth import authenticate, require_admin

  # ...inside App.__init__:

  if config.has_auth:
      admin_deps = [Depends(require_admin)]
      self.include_router(auth_router)
  else:
      admin_deps = []

  # Admin-only: connection management, settings
  self.include_router(settings_router, dependencies=admin_deps)
  self.include_router(connection_router, dependencies=admin_deps)

  # User-accessible (no auth required): conversations, results
  self.include_router(conversation_router)  # no dependencies
  self.include_router(result_router)        # no dependencies
  ```

- [ ] **Step 5: Run tests to confirm pass**

  ```bash
  cd backend && poetry run pytest tests/test_auth.py -v
  ```
  Expected: all PASSED

- [ ] **Step 6: Run full test suite to check for regressions**

  ```bash
  cd backend && poetry run pytest tests/ -v
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add backend/dataline/auth.py backend/dataline/app.py
  git commit -m "feat(auth): add require_admin dependency, split admin/user route protection"
  ```

---

## Chunk 2: Database Schema Changes

### Task 4: Add `instructions` column to Connection

**Files:**
- Modify: `backend/dataline/models/connection/model.py`
- Modify: `backend/dataline/models/connection/schema.py`
- Create: `backend/alembic/versions/2026_04_18_0001_add_connection_instructions.py`

- [ ] **Step 1: Write failing test**

  Add `backend/tests/test_connection_instructions.py`:

  ```python
  from dataline.models.connection.model import ConnectionModel

  def test_connection_model_has_instructions_field():
      # Verify the ORM column exists
      assert hasattr(ConnectionModel, "instructions")
  ```

- [ ] **Step 2: Run test to confirm failure**

  ```bash
  cd backend && poetry run pytest tests/test_connection_instructions.py -v
  ```
  Expected: AssertionError

- [ ] **Step 3: Add `instructions` to `ConnectionModel`**

  In `backend/dataline/models/connection/model.py`, add after the `options` column:

  ```python
  instructions: Mapped[str | None] = mapped_column("instructions", String, nullable=True)
  ```

- [ ] **Step 4: Run test to confirm pass**

  ```bash
  cd backend && poetry run pytest tests/test_connection_instructions.py -v
  ```
  Expected: PASSED

- [ ] **Step 5: Generate Alembic migration**

  ```bash
  cd backend && poetry run alembic revision --autogenerate \
    -m "add_connection_instructions"
  ```

  Open the generated file and verify it contains:
  ```python
  op.add_column("connections", sa.Column("instructions", sa.String(), nullable=True))
  ```
  and the corresponding `downgrade` drops it.

- [ ] **Step 6: Run migration against local DB**

  ```bash
  cd backend && poetry run alembic upgrade head
  ```
  Expected: no errors

- [ ] **Step 7: Commit**

  ```bash
  git add backend/dataline/models/connection/model.py \
          backend/alembic/versions/
  git commit -m "feat(db): add instructions column to connections table"
  ```

---

### Task 5: Add `default_connection_id` to User

**Files:**
- Modify: `backend/dataline/models/user/model.py`
- Create: `backend/alembic/versions/2026_04_18_0002_add_user_default_connection.py`

- [ ] **Step 1: Write failing test**

  Add `backend/tests/test_user_default_connection.py`:

  ```python
  from dataline.models.user.model import UserModel

  def test_user_model_has_default_connection_id():
      assert hasattr(UserModel, "default_connection_id")
  ```

- [ ] **Step 2: Run test to confirm failure**

  ```bash
  cd backend && poetry run pytest tests/test_user_default_connection.py -v
  ```

- [ ] **Step 3: Add `default_connection_id` to `UserModel`**

  In `backend/dataline/models/user/model.py`, add imports at top:

  ```python
  import uuid
  from sqlalchemy import ForeignKey
  from sqlalchemy.dialects.postgresql import UUID as PG_UUID
  ```

  Then add the column (use generic `String` type for SQLite compatibility):

  ```python
  default_connection_id: Mapped[uuid.UUID | None] = mapped_column(
      "default_connection_id",
      ForeignKey("connections.id", ondelete="SET NULL"),
      nullable=True,
  )
  ```

- [ ] **Step 4: Run test to confirm pass**

  ```bash
  cd backend && poetry run pytest tests/test_user_default_connection.py -v
  ```

- [ ] **Step 5: Generate and verify migration**

  ```bash
  cd backend && poetry run alembic revision --autogenerate \
    -m "add_user_default_connection_id"
  ```

  Verify the migration adds:
  ```python
  op.add_column("user", sa.Column("default_connection_id", sa.String(), nullable=True))
  op.create_foreign_key(None, "user", "connections", ["default_connection_id"], ["id"], ondelete="SET NULL")
  ```

- [ ] **Step 6: Run migration**

  ```bash
  cd backend && poetry run alembic upgrade head
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add backend/dataline/models/user/model.py \
          backend/alembic/versions/
  git commit -m "feat(db): add default_connection_id FK to user table"
  ```

---

## Chunk 3: Backend API Updates

### Task 6: Expose `instructions` through Connection API

**Files:**
- Modify: `backend/dataline/models/connection/schema.py`
- Modify: `backend/dataline/api/connection/router.py`

- [ ] **Step 1: Add `instructions` to Connection schemas**

  Open `backend/dataline/models/connection/schema.py`. Add `instructions: str | None = None` to:
  - The response schema (e.g. `ConnectionOut` or equivalent)
  - The update schema (e.g. `UpdateConnectionIn` or equivalent)

  The exact class names can be verified by reading the file. Example:

  ```python
  class ConnectionOut(BaseModel):
      id: uuid.UUID
      name: str | None
      database: str
      dialect: str | None
      type: str
      is_sample: bool
      options: ConnectionOptions | None
      instructions: str | None = None  # ← add this
  ```

  ```python
  class UpdateConnectionIn(BaseModel):
      name: str | None = None
      dsn: str | None = None
      options: ConnectionOptions | None = None
      instructions: str | None = None  # ← add this
  ```

- [ ] **Step 2: Write failing test**

  Add `backend/tests/api/test_connection_api.py` (or add to existing):

  ```python
  def test_update_connection_instructions(client_with_admin_auth, sample_connection):
      response = client_with_admin_auth.patch(
          f"/connection/{sample_connection.id}",
          json={"instructions": "Always explain results in French."},
      )
      assert response.status_code == 200
      assert response.json()["instructions"] == "Always explain results in French."
  ```

- [ ] **Step 3: Run test to confirm failure**

  ```bash
  cd backend && poetry run pytest tests/api/test_connection_api.py -v
  ```

- [ ] **Step 4: Ensure the service/repository layer passes `instructions` to the DB update**

  In `backend/dataline/repositories/connection.py` (or equivalent), ensure the update method maps `instructions` from the schema to the model column. Look for the `update` function and add `instructions` to the fields it patches.

- [ ] **Step 5: Run test to confirm pass**

  ```bash
  cd backend && poetry run pytest tests/api/test_connection_api.py -v
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add backend/dataline/models/connection/schema.py \
          backend/dataline/repositories/
  git commit -m "feat(api): expose instructions field in connection read/update endpoints"
  ```

---

### Task 7: Add default connection endpoints to Settings API

**Files:**
- Modify: `backend/dataline/api/settings/router.py`
- Modify: `backend/dataline/models/user/schema.py`
- Modify: `backend/dataline/repositories/user.py` (or service layer equivalent)

These endpoints remain admin-only (settings router is under `admin_deps`).

- [ ] **Step 1: Add `default_connection_id` to User schemas**

  Open `backend/dataline/models/user/schema.py`. Add to the user info response and update schemas:

  ```python
  default_connection_id: uuid.UUID | None = None
  ```

- [ ] **Step 2: Write failing test**

  Create/append `backend/tests/api/test_settings_api.py`:

  ```python
  def test_set_default_connection(client_with_admin_auth, sample_connection):
      response = client_with_admin_auth.patch(
          "/settings/info",
          json={"default_connection_id": str(sample_connection.id)},
      )
      assert response.status_code == 200
      assert response.json()["default_connection_id"] == str(sample_connection.id)

  def test_get_settings_returns_default_connection(client_with_admin_auth, sample_connection):
      # Set first
      client_with_admin_auth.patch(
          "/settings/info",
          json={"default_connection_id": str(sample_connection.id)},
      )
      response = client_with_admin_auth.get("/settings/info")
      assert response.json()["default_connection_id"] == str(sample_connection.id)
  ```

- [ ] **Step 3: Run tests to confirm failure**

  ```bash
  cd backend && poetry run pytest tests/api/test_settings_api.py -v
  ```

- [ ] **Step 4: Update user repository `update` to handle `default_connection_id`**

  In `backend/dataline/repositories/user.py`, add `default_connection_id` to the update mapping (same pattern as other nullable UUID fields like `openai_api_key`).

- [ ] **Step 5: Run tests to confirm pass**

  ```bash
  cd backend && poetry run pytest tests/api/test_settings_api.py -v
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add backend/dataline/models/user/schema.py \
          backend/dataline/repositories/user.py \
          backend/tests/api/test_settings_api.py
  git commit -m "feat(api): expose default_connection_id in settings info endpoints"
  ```

---

### Task 8: Add public `/settings/default-connection` endpoint for user surface

**Files:**
- Modify: `backend/dataline/api/settings/router.py`
- Modify: `backend/dataline/app.py`

Anonymous users need to know which connection is the default. This is a **public read-only** endpoint with **no authentication**.

- [ ] **Step 1: Write failing test**

  ```python
  def test_anonymous_can_read_default_connection(monkeypatch):
      monkeypatch.setenv("AUTH_USERNAME", "admin")
      monkeypatch.setenv("AUTH_PASSWORD", "adminpass")
      from dataline.main import app
      client = TestClient(app, raise_server_exceptions=False)
      # No auth credentials
      response = client.get("/settings/default-connection")
      assert response.status_code == 200
  ```

- [ ] **Step 2: Add endpoint to `backend/dataline/api/settings/router.py`**

  Create a new separate mini-router or add to an existing `user_settings_router`:

  ```python
  @router.get("/settings/default-connection")
  async def get_default_connection(
      user_service: UserService = Depends(get_user_service),
      connection_service: ConnectionService = Depends(get_connection_service),
  ):
      user = await user_service.get_user()
      if user.default_connection_id is None:
          return None
      connection = await connection_service.get_connection(user.default_connection_id)
      return ConnectionOut.model_validate(connection)
  ```

- [ ] **Step 3: Register this endpoint with NO dependencies in `app.py`**

  Create a separate `user_settings_router` containing only the default-connection GET, and include it without any dependencies. The existing `settings_router` stays under `admin_deps`.

- [ ] **Step 4: Run tests**

  ```bash
  cd backend && poetry run pytest tests/api/test_settings_api.py -v
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add backend/dataline/api/settings/router.py backend/dataline/app.py
  git commit -m "feat(api): add /settings/default-connection read endpoint for users"
  ```

---

### Task 9: Inject per-connection instructions into LLM prompt

**Files:**
- Modify: `backend/dataline/services/llm_flow/graph.py`
- Modify: `backend/dataline/services/conversation.py` (or wherever `QueryGraphService` is instantiated)

- [ ] **Step 1: Write failing test**

  Create `backend/tests/test_llm_instructions.py`:

  ```python
  from unittest.mock import MagicMock
  from langchain_core.messages import SystemMessage
  from dataline.services.llm_flow.graph import QueryGraphService

  def test_custom_instructions_appended_to_system_prompt():
      mock_conn = MagicMock()
      mock_conn.dialect = "sqlite"
      mock_conn.instructions = "Always respond in Spanish."
      svc = QueryGraphService.__new__(QueryGraphService)
      svc.toolkit = MagicMock()
      svc.toolkit.dialect = "sqlite"
      messages = svc.get_prompt_messages("hello", [], extra_instructions="Always respond in Spanish.")
      system_content = messages[0].content
      assert "Always respond in Spanish." in system_content

  def test_no_instructions_leaves_prompt_unchanged():
      svc = QueryGraphService.__new__(QueryGraphService)
      svc.toolkit = MagicMock()
      svc.toolkit.dialect = "sqlite"
      messages_with = svc.get_prompt_messages("hello", [], extra_instructions=None)
      messages_without = svc.get_prompt_messages("hello", [])
      assert messages_with[0].content == messages_without[0].content
  ```

- [ ] **Step 2: Run tests to confirm failure**

  ```bash
  cd backend && poetry run pytest tests/test_llm_instructions.py -v
  ```

- [ ] **Step 3: Update `get_prompt_messages` to accept `extra_instructions`**

  In `backend/dataline/services/llm_flow/graph.py`, change the signature:

  ```python
  def get_prompt_messages(
      self,
      query: str,
      history: Sequence[BaseMessage],
      top_k: int = 10,
      suffix: str = SQL_FUNCTIONS_SUFFIX,
      extra_instructions: str | None = None,
  ):
      prefix = SQL_PREFIX.format(dialect=self.toolkit.dialect, top_k=top_k)
      if extra_instructions:
          prefix = f"{prefix}\n\nAdditional instructions:\n{extra_instructions}"
      # ... rest unchanged
  ```

- [ ] **Step 4: Pass `connection.instructions` when calling `get_prompt_messages`**

  In `backend/dataline/services/llm_flow/graph.py`, inside `query()`, update the call:

  ```python
  "messages": [
      *self.get_prompt_messages(
          query,
          history,
          extra_instructions=getattr(self.connection, "instructions", None),
      ),
  ],
  ```

  This requires storing the connection on `self` in `__init__`:

  ```python
  def __init__(self, connection: ConnectionProtocol) -> None:
      self.connection = connection  # ← add this line
      # ... rest unchanged
  ```

- [ ] **Step 5: Run tests to confirm pass**

  ```bash
  cd backend && poetry run pytest tests/test_llm_instructions.py -v
  ```

- [ ] **Step 6: Run full test suite**

  ```bash
  cd backend && poetry run pytest tests/ -v
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add backend/dataline/services/llm_flow/graph.py \
          backend/tests/test_llm_instructions.py
  git commit -m "feat(llm): inject per-connection instructions into system prompt"
  ```

---

## Chunk 4: Frontend – Admin Surface

### Task 10: Create `/_admin` layout with login guard

**Files:**
- Create: `frontend/src/routes/_admin.tsx`
- Create: `frontend/src/routes/_admin/` (directory)
- Modify: `frontend/src/api.ts` (add login function)

The `/_admin` layout checks for the presence of the admin cookie. If the backend returns 401/403 on a probe request, redirect to `/admin-login`.

- [ ] **Step 1: Add login API call to `frontend/src/api.ts`**

  ```typescript
  export async function adminLogin(username: string, password: string): Promise<void> {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${username}:${password}`),
      },
    });
    if (!response.ok) throw new Error("Invalid credentials");
  }

  export async function adminLogout(): Promise<void> {
    await fetch("/auth/logout", { method: "POST" });
  }

  /** Returns true if the current session has admin credentials. */
  export async function checkAdminAuth(): Promise<boolean> {
    const res = await fetch("/connections");
    return res.ok;
  }
  ```

- [ ] **Step 2: Create an admin login page at `frontend/src/routes/admin-login.tsx`**

  ```typescript
  import { createFileRoute, useNavigate } from "@tanstack/react-router";
  import { useState } from "react";
  import { adminLogin } from "../api";

  export const Route = createFileRoute("/admin-login")({});

  export default function AdminLoginPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      try {
        await adminLogin(username, password);
        navigate({ to: "/_admin/connections" });
      } catch {
        setError("Invalid credentials");
      }
    }

    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-80 p-6 bg-gray-900 rounded-lg">
          <h1 className="text-lg font-semibold">Admin Login</h1>
          <input
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 rounded py-2 text-sm font-medium">
            Login
          </button>
        </form>
      </div>
    );
  }
  ```

- [ ] **Step 3: Create `frontend/src/routes/_admin.tsx`**

  ```typescript
  import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
  import AdminSidebar from "../components/Admin/AdminSidebar";

  export const Route = createFileRoute("/_admin")({
    beforeLoad: async () => {
      const isAdmin = await checkAdminAuth();
      if (!isAdmin) {
        throw redirect({ to: "/admin-login" });
      }
    },
    component: AdminLayout,
  });

  function AdminLayout() {
    return (
      <div className="flex h-screen bg-gray-950 text-gray-100">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    );
  }
  ```

- [ ] **Step 4: Create `frontend/src/components/Admin/AdminSidebar.tsx`**

  This sidebar reuses existing visual style (dark background, same font/spacing as current sidebar):

  ```typescript
  import { Link } from "@tanstack/react-router";

  export default function AdminSidebar() {
    return (
      <nav className="w-60 flex flex-col gap-1 p-4 bg-gray-900 border-r border-gray-800">
        <span className="text-xs font-semibold uppercase text-gray-500 mb-2">Admin</span>
        <Link to="/_admin/connections" className="nav-link">Connections</Link>
        <Link to="/_admin/settings" className="nav-link">Settings</Link>
      </nav>
    );
  }
  ```

  Use whatever `nav-link` class pattern exists in the current sidebar component (`frontend/src/components/` — check the existing sidebar for exact Tailwind classes).

- [ ] **Step 5: Regenerate TanStack Router route tree**

  ```bash
  cd frontend && npm run generate-routes 2>/dev/null || npx tsr generate
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/routes/_admin.tsx \
          frontend/src/components/Admin/ \
          frontend/src/api.ts \
          frontend/src/routeTree.gen.ts
  git commit -m "feat(frontend): add /_admin layout with role guard and sidebar"
  ```

---

### Task 11: Move Connection Management to Admin Routes

**Files:**
- Create: `frontend/src/routes/_admin/connections.tsx` (connection list + create)
- Create: `frontend/src/routes/_admin/connections.$connectionId.tsx` (edit)
- Modify existing: keep `/_app/connection/*` files temporarily (or delete if not needed for backwards compat)

The existing `ConnectionCreator`, `ConnectionEditor`, `ConnectionSelector` components are **reused as-is**. Only the route files change.

- [ ] **Step 1: Create `frontend/src/routes/_admin/connections.tsx`**

  ```typescript
  import { createFileRoute } from "@tanstack/react-router";
  import ConnectionSelector from "../../components/Connection/ConnectionSelector";
  import ConnectionCreator from "../../components/Connection/ConnectionCreator";

  export const Route = createFileRoute("/_admin/connections")({
    component: ConnectionsPage,
  });

  function ConnectionsPage() {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Connections</h1>
        <ConnectionCreator />
        <ConnectionSelector adminMode />
      </div>
    );
  }
  ```

- [ ] **Step 2: Create `frontend/src/routes/_admin/connections.$connectionId.tsx`**

  ```typescript
  import { createFileRoute } from "@tanstack/react-router";
  import ConnectionEditor from "../../components/Connection/ConnectionEditor";

  export const Route = createFileRoute("/_admin/connections/$connectionId")({
    component: ConnectionEditorPage,
  });

  function ConnectionEditorPage() {
    const { connectionId } = Route.useParams();
    return <ConnectionEditor connectionId={connectionId} />;
  }
  ```

- [ ] **Step 3: Regenerate route tree**

  ```bash
  cd frontend && npx tsr generate
  ```

- [ ] **Step 4: Verify admin can navigate to connections page without errors**

  ```bash
  cd frontend && npm run dev
  ```

  Open browser at `http://localhost:5173/_admin/connections` — should render without console errors.

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/src/routes/_admin/
  git commit -m "feat(frontend): add admin connections route reusing existing components"
  ```

---

### Task 12: Admin Settings – Default Connection Picker

**Files:**
- Create: `frontend/src/routes/_admin/settings.tsx`
- Modify: `frontend/src/components/Settings/Settings.tsx` (add default connection section)
- Modify: `frontend/src/api.ts` (add `setDefaultConnection` API call)

- [ ] **Step 1: Add API functions to `frontend/src/api.ts`**

  ```typescript
  export interface ConnectionOut {
    id: string;
    name: string | null;
    database: string;
    dialect: string | null;
    type: string;
    is_sample: boolean;
    instructions: string | null;
  }

  export async function getConnections(): Promise<ConnectionOut[]> {
    const res = await fetch("/connections");
    if (!res.ok) throw new Error("Failed to fetch connections");
    return res.json();
  }

  export async function updateSettings(data: {
    default_connection_id?: string | null;
    name?: string;
  }) {
    const res = await fetch("/settings/info", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update settings");
    return res.json();
  }
  ```

- [ ] **Step 2: Create `DefaultConnectionPicker` component**

  Create `frontend/src/components/Admin/DefaultConnectionPicker.tsx`:

  ```typescript
  import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
  import { getConnections, updateSettings } from "../../api";

  export default function DefaultConnectionPicker() {
    const qc = useQueryClient();
    const { data: connections } = useQuery({
      queryKey: ["connections"],
      queryFn: getConnections,
    });
    const { data: settings } = useQuery({
      queryKey: ["settings"],
      queryFn: () => fetch("/settings/info").then((r) => r.json()),
    });
    const mutation = useMutation({
      mutationFn: (id: string | null) => updateSettings({ default_connection_id: id }),
      onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
    });

    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-300">Default Connection</label>
        <select
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
          value={settings?.default_connection_id ?? ""}
          onChange={(e) => mutation.mutate(e.target.value || null)}
        >
          <option value="">— None —</option>
          {connections?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name ?? c.database}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500">
          Users will automatically chat against this connection.
        </p>
      </div>
    );
  }
  ```

- [ ] **Step 3: Create `frontend/src/routes/_admin/settings.tsx`**

  ```typescript
  import { createFileRoute } from "@tanstack/react-router";
  import Settings from "../../components/Settings/Settings";
  import DefaultConnectionPicker from "../../components/Admin/DefaultConnectionPicker";

  export const Route = createFileRoute("/_admin/settings")({
    component: AdminSettingsPage,
  });

  function AdminSettingsPage() {
    return (
      <div className="p-6 flex flex-col gap-8">
        <h1 className="text-xl font-semibold">Settings</h1>
        <DefaultConnectionPicker />
        <Settings />
      </div>
    );
  }
  ```

- [ ] **Step 4: Regenerate route tree and verify**

  ```bash
  cd frontend && npx tsr generate && npm run dev
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/src/routes/_admin/settings.tsx \
          frontend/src/components/Admin/DefaultConnectionPicker.tsx \
          frontend/src/api.ts
  git commit -m "feat(frontend): admin settings page with default connection picker"
  ```

---

### Task 13: Per-Connection Instructions Editor

**Files:**
- Modify: `frontend/src/components/Connection/ConnectionEditor.tsx`
- Modify: `frontend/src/api.ts` (add `updateConnection` if not already present)

- [ ] **Step 1: Add `updateConnection` API call if not present**

  In `frontend/src/api.ts`:

  ```typescript
  export async function updateConnection(
    id: string,
    data: { name?: string; instructions?: string | null }
  ): Promise<ConnectionOut> {
    const res = await fetch(`/connection/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update connection");
    return res.json();
  }
  ```

- [ ] **Step 2: Read existing `ConnectionEditor.tsx` to understand its form structure**

  Open `frontend/src/components/Connection/ConnectionEditor.tsx` and identify the form fields and submit handler.

- [ ] **Step 3: Add instructions textarea to `ConnectionEditor.tsx`**

  After the existing name/DSN fields in the form, add:

  ```typescript
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-300">
      LLM Instructions
    </label>
    <textarea
      className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm min-h-[100px] resize-y"
      placeholder="Optional: custom instructions for the AI when using this connection (e.g. 'Always respond in French', 'Prefer revenue metrics over counts')"
      value={formState.instructions ?? ""}
      onChange={(e) =>
        setFormState((s) => ({ ...s, instructions: e.target.value || null }))
      }
    />
    <p className="text-xs text-gray-500">
      These instructions are appended to the system prompt for all queries on this connection.
    </p>
  </div>
  ```

  Ensure the `instructions` field is included in the form submit payload.

- [ ] **Step 4: Verify in browser**

  Navigate to `/_admin/connections/<some-id>`. The instructions textarea should appear and be saved on submit.

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/src/components/Connection/ConnectionEditor.tsx frontend/src/api.ts
  git commit -m "feat(frontend): add per-connection instructions field to connection editor"
  ```

---

## Chunk 5: Frontend – User Surface

### Task 14: Create `/_user` layout (chat-only, no login required)

**Files:**
- Create: `frontend/src/routes/_user.tsx`
- Create: `frontend/src/routes/_user/chat.tsx` (conversation list + new chat)
- Create: `frontend/src/routes/_user/chat.$conversationId.tsx` (chat view)
- Create: `frontend/src/components/User/UserSidebar.tsx`

The user surface is **publicly accessible** — no login, no redirect. It shows conversation list and a chat box powered by the admin-configured default connection.

- [ ] **Step 1: Create `frontend/src/routes/_user.tsx`**

  ```typescript
  import { createFileRoute, Outlet } from "@tanstack/react-router";
  import UserSidebar from "../components/User/UserSidebar";

  export const Route = createFileRoute("/_user")({
    // No beforeLoad guard — user surface is public
    component: UserLayout,
  });

  function UserLayout() {
    return (
      <div className="flex h-screen bg-gray-950 text-gray-100">
        <UserSidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    );
  }
  ```

- [ ] **Step 2: Create `frontend/src/components/User/UserSidebar.tsx`**

  ```typescript
  import { Link, useNavigate } from "@tanstack/react-router";
  import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

  interface Conversation {
    id: string;
    name: string;
  }

  export default function UserSidebar() {
    const navigate = useNavigate();
    const qc = useQueryClient();

    const { data: conversations } = useQuery<Conversation[]>({
      queryKey: ["conversations"],
      queryFn: () => fetch("/conversations").then((r) => r.json()),
    });

    const { data: defaultConnection } = useQuery({
      queryKey: ["defaultConnection"],
      queryFn: () => fetch("/settings/default-connection").then((r) => r.json()),
    });

    const createConversation = useMutation({
      mutationFn: async () => {
        if (!defaultConnection?.id) throw new Error("No default connection set");
        const res = await fetch("/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connection_id: defaultConnection.id,
            name: "New Chat",
          }),
        });
        if (!res.ok) throw new Error("Failed to create conversation");
        return res.json();
      },
      onSuccess: (conv) => {
        qc.invalidateQueries({ queryKey: ["conversations"] });
        navigate({ to: "/_user/chat/$conversationId", params: { conversationId: conv.id } });
      },
    });

    return (
      <nav className="w-60 flex flex-col gap-1 p-4 bg-gray-900 border-r border-gray-800">
        <button
          onClick={() => createConversation.mutate()}
          disabled={!defaultConnection?.id}
          className="mb-3 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded text-sm font-medium"
          title={!defaultConnection?.id ? "Admin has not set a default connection" : ""}
        >
          + New Chat
        </button>

        {!defaultConnection?.id && (
          <p className="text-xs text-yellow-500 mb-2">
            No default connection configured. Ask an admin.
          </p>
        )}

        <div className="flex flex-col gap-0.5 overflow-y-auto">
          {conversations?.map((c) => (
            <Link
              key={c.id}
              to="/_user/chat/$conversationId"
              params={{ conversationId: c.id }}
              className="truncate px-2 py-1.5 rounded hover:bg-gray-800 text-sm text-gray-300"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </nav>
    );
  }
  ```

- [ ] **Step 3: Create `frontend/src/routes/_user/chat.$conversationId.tsx`**

  Reuse the existing `Conversation` component:

  ```typescript
  import { createFileRoute } from "@tanstack/react-router";
  import Conversation from "../../components/Conversation/Conversation";

  export const Route = createFileRoute("/_user/chat/$conversationId")({
    component: UserChatPage,
  });

  function UserChatPage() {
    const { conversationId } = Route.useParams();
    return <Conversation conversationId={conversationId} />;
  }
  ```

- [ ] **Step 4: Create `frontend/src/routes/_user/chat.tsx`** (empty state)

  ```typescript
  import { createFileRoute } from "@tanstack/react-router";

  export const Route = createFileRoute("/_user/chat")({
    component: () => (
      <div className="flex items-center justify-center h-full text-gray-500">
        Select a conversation or start a new chat.
      </div>
    ),
  });
  ```

- [ ] **Step 5: Regenerate route tree**

  ```bash
  cd frontend && npx tsr generate
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/routes/_user.tsx \
          frontend/src/routes/_user/ \
          frontend/src/components/User/
  git commit -m "feat(frontend): add /_user layout with chat-only sidebar"
  ```

---

### Task 15: Default Route – Redirect Visitors to `/_user/chat`

**Files:**
- Modify: `frontend/src/routes/index.tsx` (or `__root.tsx`)

The root `/` should send anonymous visitors straight to the user chat surface. The admin login lives at `/admin-login` and is only needed by admins.

- [ ] **Step 1: Update root index route to redirect to `/_user/chat`**

  In `frontend/src/routes/index.tsx`:

  ```typescript
  import { createFileRoute, redirect } from "@tanstack/react-router";

  export const Route = createFileRoute("/")({
    beforeLoad: () => {
      throw redirect({ to: "/_user/chat" });
    },
  });
  ```

  > If `index.tsx` currently renders a landing page or login form, check whether it is used for production vs local. Preserve any existing conditional logic (e.g. `process.env.NODE_ENV`) and add the redirect inside the appropriate branch.

- [ ] **Step 2: Update admin logout to redirect to `/admin-login`**

  Find the admin logout handler and update:

  ```typescript
  await adminLogout();
  navigate({ to: "/admin-login" });
  ```

- [ ] **Step 3: Verify navigation flow**

  1. Visit `/` → redirected to `/_user/chat` (no login)
  2. Visit `/_admin/connections` without admin cookie → redirected to `/admin-login`
  3. Log in at `/admin-login` → lands on `/_admin/connections`
  4. Admin logout → lands on `/admin-login`

- [ ] **Step 4: Commit**

  ```bash
  git add frontend/src/routes/
  git commit -m "feat(frontend): redirect / to user chat, admin login at /admin-login"
  ```

---

### Task 16: Hide Embeddable User Chat URL (iframe-ready)

**Files:**
- Modify: `frontend/src/routes/_user.tsx`

The user surface at `/_user/chat` can be embedded in an iframe. Add a query param `?embed=1` that hides the sidebar for a clean chat-only view.

- [ ] **Step 1: Update `UserLayout` to detect embed mode**

  ```typescript
  import { useSearch } from "@tanstack/react-router";

  function UserLayout() {
    // TanStack Router search params
    const search = useSearch({ strict: false }) as { embed?: string };
    const isEmbed = search.embed === "1";

    return (
      <div className="flex h-screen bg-gray-950 text-gray-100">
        {!isEmbed && <UserSidebar />}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    );
  }
  ```

- [ ] **Step 2: Test embed mode**

  Navigate to `http://localhost:5173/_user/chat?embed=1` — sidebar should be hidden.

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/routes/_user.tsx
  git commit -m "feat(frontend): add ?embed=1 param to hide sidebar for iframe embedding"
  ```

---

## File Change Summary

| File | Action | Purpose |
|------|--------|---------|
| `backend/dataline/auth.py` | Modify | Add `security_optional` and `require_admin` dependency |
| `backend/dataline/app.py` | Modify | Admin routes get `require_admin`; user routes have no dependency |
| `backend/dataline/models/connection/model.py` | Modify | Add `instructions` column |
| `backend/dataline/models/connection/schema.py` | Modify | Expose `instructions` in schemas |
| `backend/dataline/models/user/model.py` | Modify | Add `default_connection_id` FK |
| `backend/dataline/models/user/schema.py` | Modify | Expose `default_connection_id` in schemas |
| `backend/dataline/repositories/user.py` | Modify | Handle `default_connection_id` in update |
| `backend/dataline/api/settings/router.py` | Modify | Add `/settings/default-connection` GET (user-accessible) |
| `backend/dataline/services/llm_flow/graph.py` | Modify | Accept `extra_instructions` in `get_prompt_messages` |
| `backend/alembic/versions/2026_04_18_0001_*.py` | Create | Migration: `connections.instructions` |
| `backend/alembic/versions/2026_04_18_0002_*.py` | Create | Migration: `user.default_connection_id` |
| `frontend/src/api.ts` | Modify | Add `adminLogin`, `adminLogout`, `checkAdminAuth`, `updateConnection`, `updateSettings`, `getConnections` |
| `frontend/src/routes/admin-login.tsx` | Create | Standalone admin login page |
| `frontend/src/routes/_admin.tsx` | Create | Admin layout with `checkAdminAuth` guard, redirects to `/admin-login` |
| `frontend/src/routes/_admin/connections.tsx` | Create | Connections list/create page |
| `frontend/src/routes/_admin/connections.$connectionId.tsx` | Create | Connection editor page |
| `frontend/src/routes/_admin/settings.tsx` | Create | Admin settings + default connection picker |
| `frontend/src/routes/_user.tsx` | Create | User layout — **no auth guard**, publicly accessible |
| `frontend/src/routes/_user/chat.tsx` | Create | Empty state page |
| `frontend/src/routes/_user/chat.$conversationId.tsx` | Create | Chat view reusing Conversation component |
| `frontend/src/components/Admin/AdminSidebar.tsx` | Create | Admin nav sidebar |
| `frontend/src/components/Admin/DefaultConnectionPicker.tsx` | Create | Dropdown to select default connection |
| `frontend/src/components/User/UserSidebar.tsx` | Create | User nav with conversation list + New Chat |
| `frontend/src/components/Connection/ConnectionEditor.tsx` | Modify | Add instructions textarea |

---

## Security Considerations

- **User surface is intentionally public.** Anonymous access to conversations and results is by design. Do not add auth to those routes.
- **Admin surface enforcement is server-side.** `require_admin` on the backend 403s any unauthenticated request to `/connections`, `/settings`, etc. The `checkAdminAuth()` frontend probe is for UX only — not a security boundary.
- **`instructions` content is admin-supplied input** passed into the LLM system prompt. Treated as trusted because only admins can write it (`require_admin` on the update endpoint). Do not expose it to users via any public endpoint.
- **Default connection ID** is public (users need it to create conversations) but read-only. Users cannot change it.

---

## Environment Variables Reference

| Variable | Example | Purpose |
|----------|---------|---------|
| `AUTH_USERNAME` | `admin` | Admin login username (existing) |
| `AUTH_PASSWORD` | `s3cr3t!` | Admin login password (existing) |

No new environment variables are required. If `AUTH_USERNAME`/`AUTH_PASSWORD` are unset, auth is disabled and all routes are open (existing behaviour).

---

## Testing Checklist

Before merging, verify:

- [ ] Anonymous user can visit `/_user/chat` with no login prompt
- [ ] Anonymous user can see conversation list and start a new chat (when default connection is set)
- [ ] Anonymous request to `GET /connections` returns 403
- [ ] Anonymous request to `PATCH /settings/info` returns 403
- [ ] Admin can log in at `/admin-login`, access `/_admin/connections`, change settings, set default connection, edit instructions
- [ ] Admin logout redirects to `/admin-login`
- [ ] Visiting `/_admin/*` without admin cookie redirects to `/admin-login`
- [ ] LLM response reflects custom instructions when `instructions` is set on the connection
- [ ] `?embed=1` on user route hides sidebar
- [ ] All existing backend tests pass: `cd backend && poetry run pytest tests/ -v`
- [ ] Frontend builds without TypeScript errors: `cd frontend && npm run build`
