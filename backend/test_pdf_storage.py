import requests
import random

BASE_URL = "http://127.0.0.1:8000"

def test_pdf_upload_and_download():
    print("==================================================")
    print("     VERIFYING PDF STORAGE INTEGRATION & RBAC     ")
    print("==================================================")

    # 1. Register Owner & Collaborator & Unauthorized User
    rand = random.randint(10000, 99999)
    email_owner = f"pdf_owner_{rand}@test.com"
    email_collab = f"pdf_collab_{rand}@test.com"
    email_unauth = f"pdf_unauth_{rand}@test.com"
    password = "SecurePassword123"

    requests.post(f"{BASE_URL}/auth/register", json={"name": "Owner", "email": email_owner, "password": password})
    token_owner = requests.post(f"{BASE_URL}/auth/login", json={"email": email_owner, "password": password}).json()["access_token"]
    headers_owner = {"Authorization": f"Bearer {token_owner}"}

    requests.post(f"{BASE_URL}/auth/register", json={"name": "Collab", "email": email_collab, "password": password})
    r_collab_login = requests.post(f"{BASE_URL}/auth/login", json={"email": email_collab, "password": password})
    token_collab = r_collab_login.json()["access_token"]
    headers_collab = {"Authorization": f"Bearer {token_collab}"}

    requests.post(f"{BASE_URL}/auth/register", json={"name": "Unauth", "email": email_unauth, "password": password})
    token_unauth = requests.post(f"{BASE_URL}/auth/login", json={"email": email_unauth, "password": password}).json()["access_token"]
    headers_unauth = {"Authorization": f"Bearer {token_unauth}"}

    # 2. Create Book
    r_book = requests.post(f"{BASE_URL}/books/", headers=headers_owner, json={
        "title": "PDF Test Book", "author": "Tester", "status": "Reading", "total_pages": 100
    })
    book_id = r_book.json()["id"]

    # 3. Test Non-PDF rejection (txt file)
    txt_file = {"file": ("notes.txt", b"plain text content", "text/plain")}
    r_bad = requests.post(f"{BASE_URL}/books/{book_id}/pdf", headers=headers_owner, files=txt_file)
    assert r_bad.status_code == 400, f"Non-PDF should be rejected with 400: {r_bad.text}"
    print("[PASS] Non-PDF upload correctly rejected with 400 Bad Request")

    # 4. Upload valid PDF file
    pdf_content = b"%PDF-1.4 PDF Storage verification testing content"
    pdf_file = {"file": ("sample.pdf", pdf_content, "application/pdf")}
    r_up = requests.post(f"{BASE_URL}/books/{book_id}/pdf", headers=headers_owner, files=pdf_file)
    assert r_up.status_code == 200, f"PDF upload failed: {r_up.text}"
    pdf_path = r_up.json().get("pdf_path")
    pdf_url = r_up.json().get("pdf_url")
    print(f"[PASS] PDF Upload works. Storage path: {pdf_path}")

    # 5. Owner can get PDF URL
    r_owner_pdf = requests.get(f"{BASE_URL}/books/{book_id}/pdf", headers=headers_owner)
    assert r_owner_pdf.status_code == 200
    print("[PASS] Owner can retrieve signed PDF URL")

    # 6. Unauthorized user CANNOT get PDF URL
    r_unauth_pdf = requests.get(f"{BASE_URL}/books/{book_id}/pdf", headers=headers_unauth)
    assert r_unauth_pdf.status_code == 404, f"Unauthorized user should receive 404: {r_unauth_pdf.text}"
    print("[PASS] Unauthorized user correctly blocked (404 Not Found)")

    # 7. Authorized Shared-Shelf user CAN get PDF URL
    # Create shelf & add book & add member
    r_sh = requests.post(f"{BASE_URL}/shelves/", headers=headers_owner, json={"name": "Shared PDF Shelf"})
    shelf_id = r_sh.json()["id"]
    requests.post(f"{BASE_URL}/shelves/{shelf_id}/books/{book_id}", headers=headers_owner)
    
    # Get collab user id
    from jose import jwt
    collab_id = int(jwt.get_unverified_claims(token_collab)["sub"])
    requests.post(f"{BASE_URL}/shelves/{shelf_id}/members/", headers=headers_owner, json={"user_id": collab_id, "role": "Viewer"})

    r_collab_pdf = requests.get(f"{BASE_URL}/books/{book_id}/pdf", headers=headers_collab)
    assert r_collab_pdf.status_code == 200, f"Authorized shelf member failed to get PDF URL: {r_collab_pdf.text}"
    print("[PASS] Authorized shared-shelf member can retrieve signed PDF URL")

    # 8. Private bucket check: Verify direct unauthenticated access without token fails
    raw_path_url = pdf_url.split("?")[0] # Strip signed query token
    r_raw = requests.get(raw_path_url)
    assert r_raw.status_code != 200, "Unauthenticated raw URL request should be denied (Bucket is Private)"
    print("[PASS] Private bucket remains strictly private (unauthenticated raw URL access denied)")

    print("\n==================================================")
    print(" ALL 7 VERIFICATION POINTS PASSED SUCCESSFULLY!    ")
    print("==================================================")

if __name__ == "__main__":
    test_pdf_upload_and_download()
