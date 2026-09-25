def add(items, x):
    items.append(x)
    return len(items)


def total(items):
    return sum(items)


def broken():
    return {}["missing"]


def slow():
    import time

    time.sleep(0.3)
    return 1
