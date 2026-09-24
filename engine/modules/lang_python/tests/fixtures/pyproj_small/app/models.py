"""Data models."""


class Base:
    def save(self):
        return True


class User(Base):
    def __init__(self, user_id, name):
        self.user_id = user_id
        self.name = name

    def display(self):
        if self.name:
            return self.name.title()
        return "unknown"
