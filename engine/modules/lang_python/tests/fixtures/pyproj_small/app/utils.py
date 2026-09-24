"""Helpers."""


def normalize(name):
    return name.strip().lower()


def is_valid(user_id):
    return user_id > 0 and user_id < 1000
