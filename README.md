# ShelfLife

One photo. ShelfLife creates the listings for your item on the sites
most likely to sell it, runs them for 30 days, and only tells you about
it if it sells or the 30 days are up. Anything unsold lands on one
exportable list of items to take to Plato's Closet.

This is the standalone copy of ShelfLife. It runs entirely in the browser:
no server, no build step, no account with anyone, and nothing to install.

## Run it

- On the web: open the site once GitHub Pages is switched on for this repo
  (repo Settings, Pages, deploy from the main branch).
- On your computer: download the repo and double-click `index.html`.
  It also works from any static file host.

Everything you add (your account, items, photos, listings, alerts) is saved
in your browser on that device only. Nothing leaves the device.

## How it works

1. First run asks for one email and password. ShelfLife uses them to keep
   all 30 marketplace accounts organized. They are saved only on the device.
2. Tap Sell something and pick one photo. ShelfLife only sees the photos
   you pick, one at a time, through your device's own photo picker. It
   never sees your whole photo library. Any photo works, whatever its
   size or file type: big photos are shrunk to fit on the device, and
   a photo the browser cannot open is still kept with the item.
3. Say what the item is, pick what kind of thing it is, and what shape
   it is in (Like New down to For Parts).
4. Pick a magazine style scene. ShelfLife composes your photo into it,
   and you can save that staged photo as a picture file.
5. The price guide suggests a price for the item type and condition, and
   gives one-tap links to check what the same item really sold for.
   Take the price or set your own.
6. ShelfLife ticks the sites most likely to sell the item. Untick any
   you do not want. Tap Create the listings. The listings go in line
   to be created, and the item gets a serial number
   (SL-0001, SL-0002, ...) saved with the original photo.
7. The 30 days start when the first listing goes live, not before.
   You hear nothing unless the item sells. On day 30 the listings
   come down and the item moves to the Plato's Closet list, which
   you can download as a CSV file or copy.

## Honest limits

- The price guide is built in and offline. It shows a typical range for
  the item type and condition. It is not live sales data, and ShelfLife
  never makes up a sale price. When there is no good match it says so.
  Use the Check live prices links to see real sold prices.
- ShelfLife creates your listings. This copy prepares the complete
  listing for each site, puts it in line for creation, and tracks its
  true state: in line, being created, live, needs a check, or could
  not be created. Creation runs through the live ShelfLife system.
- A listing only counts as live when ShelfLife has its real address
  on that site. The 30 days start when the first listing goes live,
  not before. Listings saved by older versions without that proof
  go back in line to be created.
- Photos are resized when you add them so everything fits in browser
  storage on the device. A photo the browser cannot open (some HEIC,
  AVIF, or TIFF files) is still kept with the item instead of refused.
- One marketplace on the list only takes professional dealers. It is
  flagged in the app and cannot be listed on without a dealer account.
- One marketplace for physical music shows its own database photo instead
  of yours. That is flagged in the app too.

## Files

- `index.html` - the app shell and screens.
- `styles.css` - the look: warm shelf and magazine identity.
- `app.js` - all the logic: setup, items, listings, alerts, the
  Plato's Closet list, the price guide, and the staged photo maker.
- `CHANGELOG.md` - what changed in each version.

## Privacy

- Email and password: saved only on this device, never sent anywhere.
- Photos: only the ones you pick, one at a time. No library access.
- No tracking, no analytics, no outside requests. The app works offline
  once loaded, except for the links that open marketplace sites.

## No secrets in code

Sensitive information is never in code. There are no keys, tokens, or
passwords in this repo. Local config files are covered by `.gitignore`.
