"""Business logic."""
from .models import User
from .utils import normalize, is_valid
from . import utils


class UserService:
    def get_user(self, user_id):
        if not is_valid(user_id):
            raise ValueError("bad id")
        user = User(user_id, normalize("alice"))
        return self.format_user(user)

    def format_user(self, user):
        return utils.normalize(user.display())
