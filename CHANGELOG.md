# ShelfLife changelog

## v1.0.1 - 2026-11-14

Photo fix: any picture is accepted now, whatever its size or file type.

- Removed the photo type check and the "try a different photo"
  rejections. A picture is never turned away: JPEG, PNG, WebP, HEIC,
  AVIF, TIFF, GIF, BMP, and anything else the picker hands over.
- Big photos are shrunk before storing: long edge and total pixels are
  capped, and the quality steps down until the photo fits.
- A picture the browser cannot decode is still kept with the item
  (original file data), through a second decode attempt first. The item
  can always be created.
- A saved photo that cannot be drawn shows the plain box placeholder,
  never a broken image icon.
- If reading a photo ever fails, the message says the photo is fine and
  to try picking the same one again.
- Privacy line and one-photo picker unchanged.

## v1.0.0 - 2026-11-14

First release. The full ShelfLife flow as a standalone web app:

- First-run setup: one email and password, saved only on the device.
  Sets up all 30 marketplace accounts, with the dealers-only site flagged.
- Add an item in six plain steps: one photo, what it is, condition,
  magazine style staged photo, price, sites.
- One-photo picker only, with the privacy line in the app: ShelfLife only
  sees the photos you pick, never your whole library.
- Condition picker: Like New, Excellent, Good, Fair, For Parts.
- Price guide: built-in offline typical ranges by item type and
  condition, with one-tap links to check live sold prices. Honest
  "No good match found" when there is no guide entry. Never invents prices.
- Magazine style staged photo: six CSS scene templates, composed in the
  app, downloadable as a picture file.
- Site picker pre-ticks the best-fit marketplaces for the item type,
  with a plain-words reason for each pick.
- 30-day listings with a live countdown. Serial numbers (SL-0001, ...)
  saved with the original photo.
- Alerts only for a sale or day 30. Nothing else.
- Day-30 expiry removes the listings and moves the item to the one
  Plato's Closet list, exportable as CSV or copyable as text.
- Sites screen: all 30 marketplaces with what each is good for and its
  account status, plus a per-account check.
- Built-in How to Use index and Settings with storage info and
  erase-everything (confirmed, defaulting to No).
- Fully offline once loaded. No build step, no server, no outside
  requests except links the user taps.
