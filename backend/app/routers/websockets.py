# Third-party Libraries
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from jose import JWTError
from sqlalchemy.orm import Session

# Local Project Imports
from app.auth.jwt import decode_access_token
from app.dependencies import get_db
from app.models.user import User
from app.services.websocket_service import manager


router = APIRouter(tags=["WebSockets"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    WebSocket connection endpoint.
    Clients connect with: ws://localhost:8000/ws?token=<jwt_token>
    """
    # Authenticate via token query param
    try:
        payload = decode_access_token(token)
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        await websocket.close(code=1008)  # 1008 = Policy Violation
        return

    # Register the connection
    await manager.connect(websocket, user_id)

    try:
        # Keep the connection alive by listening for any incoming messages
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
