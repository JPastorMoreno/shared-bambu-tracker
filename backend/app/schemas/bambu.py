from datetime import datetime

from pydantic import BaseModel


class BambuLoginStart(BaseModel):
    email: str
    password: str
    region: str


class BambuLoginStartResult(BaseModel):
    login_session_id: str
    requires_code: bool


class BambuLoginVerify(BaseModel):
    login_session_id: str
    code: str


class BambuLoginVerifyResult(BaseModel):
    connected: bool = True


class BambuStatus(BaseModel):
    connected: bool
    email: str | None
    last_synced_at: datetime | None


class BambuSyncResult(BaseModel):
    created: int
