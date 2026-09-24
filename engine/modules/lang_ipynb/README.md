# lang_ipynb

## How notebooks are read

A `.ipynb` file is JSON. The adapter takes the `source` of every **code** cell (markdown and raw cells are skipped), joins the cells into one Python text, and runs the normal Python extraction on it. The module keeps the language `python`, so imports and calls resolve exactly like in `.py` files — a notebook that does `import app.utils` links to `app/utils.py`.

## Line numbers

Line numbers refer to the concatenated code cells (cell 1's lines first, then cell 2's, …), not to the JSON file. Each cell ends with a line break, so a new cell always starts on a new line.

## Limits

- Cell outputs are ignored.
- IPython magics (`%matplotlib inline`) and shell escapes (`!pip install …`) are replaced by empty lines.
- Code that only works because of earlier notebook state (variables defined in cells that were deleted) is not detected.
