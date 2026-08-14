# Standard Library
import asyncio
import json
from typing import Dict, List

# Third-party Libraries
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # Maps user_id to a list of active WebSocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # Main event loop, captured on the first WebSocket connection.
        # Required for run_coroutine_threadsafe() calls from sync threadpool workers
        # (asyncio.get_event_loop() is unreliable in worker threads on Python 3.10+).
        self._loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, websocket: WebSocket, user_id: int):
        if self._loop is None:
            self._loop = asyncio.get_running_loop()
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            try:
                self.active_connections[user_id].remove(websocket)
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            except ValueError:
                pass

    async def notify_user(self, user_id: int, message: dict):
        """Send a JSON message to all connected devices for a specific user."""
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    # Ignore disconnected clients
                    pass

    def notify_user_sync(self, user_id: int, message: dict):
        """
        Thread-safe wrapper for notify_user().
        Called from synchronous service functions running in FastAPI's threadpool,
        where asyncio.create_task() fails because no event loop is running in that thread.
        Schedules the coroutine on the main event loop using run_coroutine_threadsafe().
        Uses self._loop captured at WebSocket connect time (reliable on Python 3.10+).
        """
        try:
            if self._loop is not None and self._loop.is_running():
                asyncio.run_coroutine_threadsafe(self.notify_user(user_id, message), self._loop)
        except Exception:
            pass  # No event loop available — skip notification silently

# A single global instance to be imported across the app
manager = ConnectionManager()

