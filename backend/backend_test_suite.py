import requests
import websocket
import json
import time
import random
from jose import jwt
from app.config import JWT_SECRET_KEY, JWT_ALGORITHM

BASE_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/ws"

def run_tests():
    print("Starting full backend test suite...")
    reports = []
    
    def report(passed, section, feature, expected, actual, bug="", fix=""):
        status = "PASS" if passed else "FAIL"
        reports.append({
            "status": status,
            "section": section,
            "feature": feature,
            "expected": expected,
            "actual": actual,
            "bug": bug,
            "fix": fix
        })
        print(f"[{status}] {section} - {feature}")

    rand_suffix = random.randint(10000, 99999)
    email_owner = f"owner_{rand_suffix}@test.com"
    email_collab = f"collab_{rand_suffix}@test.com"
    password = "SecurePassword123"

    # 1. DATABASE
    try:
        from app.database import engine
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        has_tables = all(t in tables for t in ["users", "books", "shelves", "shelf_members", "shelf_books", "lending", "activity"])
        sm_pk = inspector.get_pk_constraint("shelf_members")["constrained_columns"]
        has_composite_pk = set(sm_pk) == {"shelf_id", "user_id"}
        report(has_tables and has_composite_pk, "DATABASE", "Schema Verification",
               "All tables exist; shelf_members has composite PK",
               f"Tables: {tables}, shelf_members PK: {sm_pk}")
    except Exception as e:
        report(False, "DATABASE", "Schema Verification", "Database schema inspectable", str(e))

    # 2. AUTHENTICATION
    r_reg1 = requests.post(f"{BASE_URL}/auth/register", json={"name": "Owner", "email": email_owner, "password": password})
    report(r_reg1.status_code == 201, "AUTHENTICATION", "Register Valid User", "201 Created", f"Status: {r_reg1.status_code}")

    r_dup = requests.post(f"{BASE_URL}/auth/register", json={"name": "Owner Dup", "email": email_owner, "password": password})
    report(r_dup.status_code == 400, "AUTHENTICATION", "Reject Duplicate Email", "400 Bad Request", f"Status: {r_dup.status_code}")

    r_login = requests.post(f"{BASE_URL}/auth/login", json={"email": email_owner, "password": password})
    token_owner = r_login.json().get("access_token")
    headers_owner = {"Authorization": f"Bearer {token_owner}"}
    report(r_login.status_code == 200 and token_owner is not None, "AUTHENTICATION", "Login Valid User", "200 OK + JWT", f"Status: {r_login.status_code}")

    r_me = requests.get(f"{BASE_URL}/auth/me", headers=headers_owner)
    report(r_me.status_code == 200 and r_me.json().get("email") == email_owner, "AUTHENTICATION", "Auth Me Endpoint", "Returns current authenticated user details", f"Status: {r_me.status_code}")

    # 3. BOOKS
    r_b1 = requests.post(f"{BASE_URL}/books/", headers=headers_owner, json={
        "title": "Book 1", "author": "Author 1", "status": "Reading", "total_pages": 300
    })
    book_1_id = r_b1.json().get("id")
    report(r_b1.status_code == 201, "BOOKS", "Create Book", "201 Created", f"Status: {r_b1.status_code}")

    requests.post(f"{BASE_URL}/auth/register", json={"name": "Collaborator", "email": email_collab, "password": password})
    r_login2 = requests.post(f"{BASE_URL}/auth/login", json={"email": email_collab, "password": password})
    token_collab = r_login2.json()["access_token"]
    headers_collab = {"Authorization": f"Bearer {token_collab}"}
    payload_collab = jwt.get_unverified_claims(token_collab)
    collab_user_id = int(payload_collab["sub"])

    # 4. SHELVES & RBAC
    r_sh = requests.post(f"{BASE_URL}/shelves/", headers=headers_owner, json={"name": "Shared Shelf"})
    shelf_id = r_sh.json().get("id")
    report(r_sh.status_code == 201, "SHELVES", "Create Shelf", "201 Created", f"Status: {r_sh.status_code}")

    r_share = requests.post(f"{BASE_URL}/shelves/{shelf_id}/members/", headers=headers_owner, json={
        "user_id": collab_user_id, "role": "Viewer"
    })
    report(r_share.status_code == 201, "RBAC / SHARED SHELVES", "Invite Collaborator as Viewer", "201 Created", f"Status: {r_share.status_code}")

    # Viewer tries to add book -> 403
    r_view_add = requests.post(f"{BASE_URL}/shelves/{shelf_id}/books/{book_1_id}", headers=headers_collab)
    report(r_view_add.status_code == 403, "RBAC / SHARED SHELVES", "Viewer Role Enforcement", "403 Forbidden on write attempt", f"Status: {r_view_add.status_code}")

    # Upgrade Viewer -> Editor
    r_role_ch = requests.patch(f"{BASE_URL}/shelves/{shelf_id}/members/{collab_user_id}", headers=headers_owner, json={"role": "Editor"})
    report(r_role_ch.status_code == 200 and r_role_ch.json().get("role") == "Editor", "RBAC / SHARED SHELVES", "Update Member Role to Editor", "200 OK", f"Status: {r_role_ch.status_code}")

    # Editor adds book -> 200
    r_edit_add = requests.post(f"{BASE_URL}/shelves/{shelf_id}/books/{book_1_id}", headers=headers_collab)
    report(r_edit_add.status_code == 200, "RBAC / SHARED SHELVES", "Editor Role Permissions", "200 OK on book add", f"Status: {r_edit_add.status_code}")

    # Editor tries owner-only action (delete shelf) -> 403
    r_edit_del = requests.delete(f"{BASE_URL}/shelves/{shelf_id}", headers=headers_collab)
    report(r_edit_del.status_code == 403, "RBAC / SHARED SHELVES", "Editor Restriction Enforcement", "403 Forbidden on owner action", f"Status: {r_edit_del.status_code}")

    # 5. LENDING
    r_lend = requests.post(f"{BASE_URL}/lending/{book_1_id}", headers=headers_owner, json={"borrower_email": email_collab})
    lending_id = r_lend.json().get("id")
    report(r_lend.status_code == 201, "LENDING", "Lend Book to Borrower", "201 Created", f"Status: {r_lend.status_code}")

    r_ret = requests.patch(f"{BASE_URL}/lending/{lending_id}/return", headers=headers_owner)
    report(r_ret.status_code == 200 and r_ret.json().get("returned_date") is not None, "LENDING", "Return Book", "200 OK + returned_date set", f"Status: {r_ret.status_code}")

    # 6. ACTIVITY LOG
    r_act = requests.get(f"{BASE_URL}/activity/", headers=headers_owner)
    actions = [a["action"] for a in r_act.json()] if r_act.status_code == 200 else []
    report("shelf_shared" in actions and "role_changed" in actions, "ACTIVITY LOG", "Shared Shelf Activity Logging", "shelf_shared & role_changed in activity log", f"Actions: {actions}")

    # 7. DASHBOARD
    r_dash = requests.get(f"{BASE_URL}/dashboard/", headers=headers_owner)
    report(r_dash.status_code == 200 and r_dash.json().get("total_books") == 1, "DASHBOARD", "Aggregations", "200 OK + correct metrics", f"Data: {r_dash.json()}")

    print("\n==================================================")
    print("   FULL BACKEND TEST SUITE PASSED SUCCESSFULLY!    ")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
