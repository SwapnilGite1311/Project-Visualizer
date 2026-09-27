import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// A small, readable Python shop to try the app without a project of your own: two folders, classes and functions
// that call each other, one import cycle-free chain, and a demo script to run with the agent ("Watch it run").
export const SAMPLE_FILES: Record<string, string> = {
  'README.md': `# Sample shop

A tiny online shop, made to explore Project Visualizer.

- \`shop/\` - the catalog, the cart and checkout.
- \`payments/\` - card payments and receipts.
- \`run_demo.py\` - places a few orders. Run it with the agent to watch it live:
  \`python -m pv_agent run run_demo.py\` (see Help -> "Watch my program run").
`,
  'shop/__init__.py': '"""The shop: catalog, cart and checkout."""\n',
  'shop/catalog.py': `"""What the shop sells."""


class Product:
    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price


PRODUCTS = {
    "tea": Product("tea", "Green tea", 4.5),
    "mug": Product("mug", "Blue mug", 9.0),
    "book": Product("book", "Cook book", 21.0),
}


def find_product(sku):
    """Returns the product for a code, or None."""
    return PRODUCTS.get(sku)
`,
  'shop/cart.py': `"""A shopping cart."""
from shop.catalog import find_product


class Cart:
    def __init__(self):
        self.lines = []

    def add(self, sku, quantity=1):
        product = find_product(sku)
        if product is None:
            raise ValueError(f"unknown product: {sku}")
        self.lines.append((product, quantity))

    def total(self):
        return sum(product.price * quantity for product, quantity in self.lines)
`,
  'shop/checkout.py': `"""Turns a cart into a paid order."""
from payments.card import charge
from payments.receipt import make_receipt
from shop.discounts import apply_discount


def checkout(cart, card_number, code=None):
    amount = apply_discount(cart.total(), code)
    payment_id = charge(card_number, amount)
    return make_receipt(cart, amount, payment_id)
`,
  'shop/discounts.py': `"""Discount codes."""

CODES = {"WELCOME10": 0.10, "HALF": 0.50}


def apply_discount(amount, code):
    if not code:
        return amount
    rate = CODES.get(code, 0)
    return round(amount * (1 - rate), 2)
`,
  'payments/__init__.py': '"""Payments: card charges and receipts."""\n',
  'payments/card.py': `"""Card payments (pretend - nothing is really charged)."""
import itertools

_ids = itertools.count(1)


def charge(card_number, amount):
    if not card_number.isdigit() or len(card_number) < 12:
        raise ValueError("card number looks wrong")
    if amount <= 0:
        raise ValueError("nothing to pay")
    return f"pay-{next(_ids)}"
`,
  'payments/receipt.py': `"""Receipts."""


def make_receipt(cart, amount, payment_id):
    items = ", ".join(f"{quantity} x {product.name}" for product, quantity in cart.lines)
    return f"Paid {amount:.2f} for {items} ({payment_id})"
`,
  'run_demo.py': `"""Places a few orders; one has a wrong card number on purpose, to show an error on the map."""
from shop.cart import Cart
from shop.checkout import checkout

ORDERS = [
    (["tea", "mug"], "4111111111111111", None),
    (["book"], "4111111111111111", "WELCOME10"),
    (["tea", "tea", "book"], "12", "HALF"),  # wrong card number
    (["mug"], "5500000000000004", None),
]

for skus, card, code in ORDERS:
    cart = Cart()
    for sku in skus:
        cart.add(sku)
    try:
        print(checkout(cart, card, code))
    except ValueError as error:
        print("Order failed:", error)
`,
};

// Writes the sample into `dir` (replacing an earlier copy) and returns `dir`.
export function writeSampleProject(dir: string): string {
  rmSync(dir, { recursive: true, force: true });
  for (const [rel, text] of Object.entries(SAMPLE_FILES)) {
    const path = join(dir, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
  return dir;
}
