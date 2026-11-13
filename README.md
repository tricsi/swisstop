# Swiss Top List

Rank anything with Swiss-system tournament rules. Runs entirely in the browser; progress is saved in `localStorage`.

1. **Items** – add the things to rank.
2. **Compare** – pick the better of two (click, or ← / →; Backspace undoes). Each round pairs items with similar scores that haven't met yet; with an odd count one item gets a bye (+1 point). Play the recommended `ceil(log2 n)` rounds or keep going until every pair has met.
3. **Top list** – ranked by score (1 per win/bye), then Buchholz (sum of opponents' scores), then head-to-head.

## Scripts

```bash
npm run dev      # start dev server
npm test         # run tournament logic tests (Vitest)
npm run build    # type-check and build to dist/
```

Requires Node 18+ (pinned to 22 via Volta).

## Import / export

Below every step, **Export JSON** downloads the items and comparisons (`toplist-YYYY-MM-DD.json`; undo history is not included). **Import JSON** loads such a file — or a plain JSON array of names like `["Pizza", "Sushi"]` — after asking before it replaces existing data. Files are validated; broken or foreign files show an error and change nothing.
