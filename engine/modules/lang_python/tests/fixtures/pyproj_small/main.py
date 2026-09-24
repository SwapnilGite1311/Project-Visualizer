"""Entry point of the sample app."""
import sys

from app.services import UserService


def main():
    service = UserService()
    user = service.get_user(1)
    print(user)
    return 0


if __name__ == "__main__":
    sys.exit(main())
