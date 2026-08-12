from pydantic import BaseModel


class SetAdminRequest(BaseModel):
    is_admin: bool
