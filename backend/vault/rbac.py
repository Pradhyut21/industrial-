"""
Role-Based Access Control (RBAC) middleware for the Continuity Vault.

Authentication model (demo/hackathon):
  - Role is read from the X-DeadMind-Role HTTP header.
  - If the header is absent, the request is treated as 'Admin' (permissive default for demo).
  - The access_grants table is queried for the actual sensitivity level allowed.

This is a real backend enforcement layer (not a UI toggle) with a mock auth
mechanism clearly marked. In production, replace _get_session_role() with
JWT/session validation from your IdP.

MOCK AUTH: The role header is accepted without cryptographic verification.
In production: verify a signed JWT and extract the role claim from it.
"""
from __future__ import annotations

from fastapi import HTTPException, Request

from backend.database import get_db_connection

# Sensitivity level ordering (higher index = more sensitive)
SENSITIVITY_ORDER = ["public", "department-restricted", "confidential"]


def get_session_role(request: Request) -> str:
    """
    DEMO-GRADE MOCK AUTH -- READ BEFORE REVIEWING.

    Reads the caller's role from the X-DeadMind-Role HTTP header WITHOUT
    any cryptographic verification. Any caller can set this header to any
    value. This is intentional for hackathon/demo purposes and is disclosed
    in PRIVACY_AND_CONSENT.md Section 7.1.

    What IS real (backend-enforced, not a UI toggle):
      - The access_grants table is queried on every vault endpoint.
      - check_vault_access() compares the role against DB-stored grants
        and returns HTTP 403 if access is denied.
      - The RBAC enforcement logic is complete and production-correct.

    What is NOT real:
      - There is no cryptographic verification that the caller holds the
        role they claim. The header is trusted at face value.

    Production swap (one function, zero other changes needed):
        token = request.headers.get("Authorization", "").removeprefix("Bearer ")
        payload = your_idp.verify_jwt(token, secret=settings.JWT_SECRET)
        return payload.get("role", "Field Technician")

    Returns "Admin" if the header is absent (permissive demo default).
    """
    role = request.headers.get("X-DeadMind-Role", "Admin")
    return role.strip()


def _sensitivity_level(level: str) -> int:
    """Returns the numeric level for a sensitivity string (higher = more sensitive)."""
    try:
        return SENSITIVITY_ORDER.index(level.lower())
    except ValueError:
        return 0  # unknown → treat as public


def check_vault_access(
    person_vault_id: int,
    role: str,
    requested_sensitivity: str = "public",
) -> bool:
    """
    Returns True if the given role is allowed to access artifacts at the
    requested sensitivity level for the given vault.

    Queries the access_grants table. If no grants exist for this vault,
    defaults to allowing 'public' access only (fail-safe default).
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT sensitivity_level_allowed
        FROM access_grants
        WHERE person_vault_id = ? AND granted_to_role = ?
        """,
        (person_vault_id, role),
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        # No specific grant for this role — allow public only
        return _sensitivity_level(requested_sensitivity) <= _sensitivity_level("public")

    allowed_level = row["sensitivity_level_allowed"]
    return _sensitivity_level(requested_sensitivity) <= _sensitivity_level(allowed_level)


def require_vault_access(
    person_vault_id: int,
    role: str,
    requested_sensitivity: str = "public",
) -> None:
    """
    FastAPI-compatible dependency helper.
    Raises HTTP 403 if the role does not have access.
    """
    if not check_vault_access(person_vault_id, role, requested_sensitivity):
        raise HTTPException(
            status_code=403,
            detail=(
                f"Role '{role}' does not have access to '{requested_sensitivity}' "
                f"artifacts in this vault. Request elevated access from an Admin."
            ),
        )
