def add(a, b):
    total = a + b
    return total


def run():
    values = []
    for i in range(3):
        values.append(add(i, 10))
    try:
        int("x")
    except ValueError:
        values.append(-1)
    return values
