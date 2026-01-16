from fastapi import Depends, HTTPException
from app.modules.auth.models import User
from app.modules.auth.deps import get_current_user

class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)):
        if user.role not in self.allowed_roles:
            raise HTTPException(status_code=403, detail="Operation not permitted")
        return user

allow_admin = RoleChecker(["admin"])
allow_operator = RoleChecker(["admin", "operator"])
