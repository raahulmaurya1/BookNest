# Standard Library
import uuid
from typing import Optional

# Third-party Libraries
from supabase import create_client, Client

# Local Project Imports
from app.config import SUPABASE_URL, SUPABASE_SECRET_KEY, SUPABASE_BUCKET_NAME

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_SECRET_KEY must be configured.")
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
    return _supabase_client


def upload_pdf(file_bytes: bytes, filename: str, book_id: int, owner_id: int) -> str:
    """
    Uploads a PDF file to Supabase Storage in the private 'booknest-books' bucket.
    Returns the storage object path (e.g. 'owner_1/book_10_abc123.pdf').
    """
    client = get_supabase_client()
    unique_id = str(uuid.uuid4())[:8]
    object_path = f"owner_{owner_id}/book_{book_id}_{unique_id}.pdf"

    res = client.storage.from_(SUPABASE_BUCKET_NAME).upload(
        path=object_path,
        file=file_bytes,
        file_options={"content-type": "application/pdf", "x-upsert": "true"}
    )

    return object_path


def get_signed_pdf_url(pdf_path: str, expires_in: int = 3600) -> Optional[str]:
    """
    Generates a private signed download/view URL for a PDF stored in Supabase Storage.
    The URL expires after 'expires_in' seconds (default: 1 hour).
    """
    if not pdf_path:
        return None
    try:
        client = get_supabase_client()
        res = client.storage.from_(SUPABASE_BUCKET_NAME).create_signed_url(pdf_path, expires_in)
        if isinstance(res, dict) and "signedURL" in res:
            return res["signedURL"]
        elif hasattr(res, "signed_url"):
            return res.signed_url
        elif isinstance(res, dict) and "signedUrl" in res:
            return res["signedUrl"]
        return str(res)
    except Exception as e:
        print(f"Error generating signed URL for {pdf_path}: {e}")
        return None


def delete_pdf(pdf_path: str) -> bool:
    """
    Deletes a PDF object from Supabase Storage.
    """
    if not pdf_path:
        return False
    try:
        client = get_supabase_client()
        client.storage.from_(SUPABASE_BUCKET_NAME).remove([pdf_path])
        return True
    except Exception as e:
        print(f"Error deleting PDF {pdf_path}: {e}")
        return False
