"""HTTP routes."""
from app.services import UserService
import app.utils as u


def get_user_route(user_id):
    service = UserService()
    if u.is_valid(user_id):
        return service.get_user(user_id)
    return None
