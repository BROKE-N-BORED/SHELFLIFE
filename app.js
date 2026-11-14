/* ShelfLife - standalone single-page app.
   All state lives in browser storage on this device. No server, no build
   step, no external requests. Open index.html and it runs.
   Copy rule: plain words, no em-dashes in visible text. */

(function () {
  'use strict';

  /* ---------------- Data: the 30 marketplaces ---------------- */

  var CATEGORIES = [
    { key: 'clothing', label: 'Clothing' },
    { key: 'shoes', label: 'Shoes' },
    { key: 'furniture', label: 'Furniture' },
    { key: 'electronics', label: 'Electronics' },
    { key: 'collectibles', label: 'Collectibles' },
    { key: 'toys', label: 'Toys and Games' },
    { key: 'instruments', label: 'Musical Instruments' },
    { key: 'records', label: 'Records and Music' },
    { key: 'books', label: 'Books' },
    { key: 'sports', label: 'Sports Gear' },
    { key: 'home', label: 'Home Goods' },
    { key: 'tools', label: 'Tools' },
    { key: 'jewelry', label: 'Jewelry' },
    { key: 'other', label: 'Something Else' }
  ];

  var CONDITIONS = ['Like New', 'Excellent', 'Good', 'Fair', 'For Parts'];

  /* Condition adjusts where the guide price lands inside the typical range. */
  var CONDITION_FACTOR = {
    'Like New': 0.85,
    'Excellent': 0.7,
    'Good': 0.5,
    'Fair': 0.3,
    'For Parts': 0.12
  };

  /* Built-in price guide: typical listing ranges by item type, in dollars.
     This is a guide only, never live sales data. 'other' has no entry on
     purpose: with no type to match, the honest answer is "no good match". */
  var PRICE_GUIDE = {
    clothing: [8, 40],
    shoes: [15, 80],
    furniture: [30, 300],
    electronics: [25, 250],
    collectibles: [10, 150],
    toys: [5, 60],
    instruments: [40, 400],
    records: [5, 40],
    books: [3, 25],
    sports: [10, 120],
    home: [8, 80],
    tools: [10, 150],
    jewelry: [15, 200]
  };

  var SCENES = [
    { key: 'living', label: 'Living Room', css: 'scene-living' },
    { key: 'bedroom', label: 'Bedroom', css: 'scene-bedroom' },
    { key: 'studio', label: 'Studio', css: 'scene-studio' },
    { key: 'model', label: 'On a Model', css: 'scene-model' },
    { key: 'desk', label: 'Desk', css: 'scene-desk' },
    { key: 'outdoors', label: 'Outdoors', css: 'scene-outdoors' }
  ];

  /* Scene background colors for the downloadable staged photo (canvas). */
  var SCENE_COLORS = {
    living: ['#f3e3c2', '#8a6b48'],
    bedroom: ['#dfe9ee', '#7d8b96'],
    studio: ['#ffffff', '#d8d8d8'],
    model: ['#e9d8e2', '#6d5a68'],
    desk: ['#e7e0cd', '#5d4a33'],
    outdoors: ['#bcd9e8', '#7fae6d']
  };

  var SITES = [
    { id: 'facebook', name: 'Facebook Marketplace', url: 'https://www.facebook.com/marketplace',
      best: 'Furniture, large tools, appliances, and bulky items where local pickup avoids expensive shipping.',
      detail: 'Free to list for local cash sales, massive active local audience, direct chat through Messenger.',
      cats: ['furniture', 'electronics', 'home', 'tools', 'toys', 'sports', 'clothing', 'shoes', 'other'] },
    { id: 'ebay', name: 'eBay', url: 'https://www.ebay.com',
      best: 'Collectibles, electronics, vintage goods, niche tools, and specialty parts.',
      detail: 'Nationwide and international buyers pay top dollar for hard-to-find items. About 13% in final value fees.',
      cats: ['collectibles', 'electronics', 'records', 'books', 'toys', 'instruments', 'jewelry', 'clothing', 'shoes', 'sports', 'tools', 'home', 'furniture', 'other'] },
    { id: 'mercari', name: 'Mercari', url: 'https://www.mercari.com',
      best: 'Everyday household goods, kitchenware, toys, media, and medium-sized items.',
      detail: 'Simple app with built-in shipping and flat label creation.',
      cats: ['clothing', 'home', 'toys', 'records', 'books', 'electronics', 'shoes', 'other'] },
    { id: 'poshmark', name: 'Poshmark', url: 'https://www.poshmark.com',
      best: 'Clothing, shoes, fashion accessories, and smaller home decor pieces.',
      detail: 'Flat-rate Priority Mail shipping for packages up to 5 pounds.',
      cats: ['clothing', 'shoes', 'jewelry', 'home'] },
    { id: 'offerup', name: 'OfferUp', url: 'https://offerup.com',
      best: 'Quick local sales of electronics, fitness gear, and home goods.',
      detail: 'Made for local face-to-face cash sales, with shipping on some categories.',
      cats: ['electronics', 'sports', 'home', 'furniture', 'tools', 'toys'] },
    { id: 'craigslist', name: 'Craigslist', url: 'https://www.craigslist.org',
      best: 'Heavy equipment, tools, building supplies, outdoor power gear, and bulk items.',
      detail: 'Free to list in almost all local categories. Local cash-in-hand pickups, no transaction fees.',
      cats: ['furniture', 'tools', 'home', 'electronics', 'instruments', 'sports', 'other'] },
    { id: 'whatnot', name: 'Whatnot', url: 'https://www.whatnot.com',
      best: 'Collectibles, trading cards, vintage toys, comics, sports memorabilia, and retro items.',
      detail: 'Live auctions that move high volumes fast to active collectors.',
      cats: ['collectibles', 'toys', 'records'] },
    { id: 'reverb', name: 'Reverb', url: 'https://reverb.com',
      best: 'Musical instruments, amplifiers, pedals, microphones, and studio audio equipment.',
      detail: 'Buyers here only shop for music gear. Selling fees around 5%.',
      cats: ['instruments', 'electronics'] },
    { id: 'thredup', name: 'ThredUp', url: 'https://www.thredup.com',
      best: 'Clothing, shoes, and fashion accessories when you want a hands-off sale.',
      detail: 'Consignment kit: fill a bag, send it in, they photograph, list, and ship for a payout split.',
      cats: ['clothing', 'shoes'] },
    { id: 'varagesale', name: 'VarageSale', url: 'https://www.varagesale.com',
      best: 'Verified local neighborhood groups for general household items and decor.',
      detail: 'Real-identity verification makes local pickups safer than anonymous classifieds.',
      cats: ['home', 'furniture', 'clothing', 'toys', 'other'] },
    { id: 'maxsold', name: 'MaxSold', url: 'https://maxsold.com',
      best: 'Bulk clearing of whole basements, storage units, or entire rooms via local online auctions.',
      detail: 'Buyers bid on lots, then pick up during a set local collection window. No packing or shipping.',
      cats: ['furniture', 'home', 'tools', 'other'] },
    { id: 'swappa', name: 'Swappa', url: 'https://swappa.com',
      best: 'Laptops, smartphones, tablets, cameras, and gaming consoles.',
      detail: 'Strict checks that devices work. Lower fees than eBay, with seller protection built in.',
      cats: ['electronics'] },
    { id: 'sidelineswap', name: 'SidelineSwap', url: 'https://sidelineswap.com',
      best: 'Sports equipment, golf clubs, ski and snowboard gear, fitness items, and athletic apparel.',
      detail: 'Sports fans and parents shop here. Prepaid shipping labels once items sell.',
      cats: ['sports'] },
    { id: 'rubylane', name: 'Ruby Lane', url: 'https://www.rubylane.com',
      best: 'Antiques, vintage collectibles, fine art, and jewelry.',
      detail: 'Curated for serious antique collectors, with higher prices for genuine vintage items.',
      cats: ['collectibles', 'jewelry', 'home', 'furniture'] },
    { id: 'flyp', name: 'Flyp', url: 'https://www.flyp.com',
      best: 'Outsourcing the selling when you have too much to list yourself.',
      detail: 'Vetted pro sellers photograph, list, and ship your items for a commission split.',
      cats: ['clothing', 'home', 'other', 'collectibles', 'toys'] },
    { id: 'fivemiles', name: '5miles', url: 'https://5miles.com',
      best: 'Local cash sales of everyday household goods, tools, and furniture.',
      detail: 'Local buy and sell app with identity checks and ratings for safer meetups.',
      cats: ['home', 'furniture', 'tools', 'electronics', 'toys'] },
    { id: 'abebooks', name: 'AbeBooks', url: 'https://www.abebooks.com',
      best: 'Rare, collectible, out-of-print, or vintage books.',
      detail: 'Connects sellers with book lovers, institutions, and rare book collectors worldwide.',
      cats: ['books'] },
    { id: 'depop', name: 'Depop', url: 'https://www.depop.com',
      best: 'Vintage clothing, streetwear, Y2K fashion, and retro apparel.',
      detail: 'Works like a social feed with a young audience. Good photos matter most here.',
      cats: ['clothing', 'shoes', 'jewelry'] },
    { id: 'nextdoor', name: 'Nextdoor', url: 'https://nextdoor.com',
      best: 'Household items, lawn tools, patio furniture, and bulky goods sold to verified neighbors.',
      detail: 'Free to list with zero selling fees. Driveway or porch pickups with people nearby.',
      cats: ['home', 'furniture', 'tools', 'toys', 'other'] },
    { id: 'etsy', name: 'Etsy', url: 'https://www.etsy.com',
      best: 'Authentic vintage goods (at least 20 years old), craft supplies, antique decor, and retro collectibles.',
      detail: 'A huge global audience hunting for unique vintage pieces.',
      cats: ['collectibles', 'home', 'jewelry', 'clothing', 'records'] },
    { id: 'chairish', name: 'Chairish', url: 'https://www.chairish.com',
      best: 'Mid-century furniture, art, lighting, architectural salvage, and quality home decor.',
      detail: 'Curated marketplace for design-led home pieces and serious design buyers.',
      cats: ['furniture', 'home', 'collectibles', 'jewelry'] },
    { id: 'vinted', name: 'Vinted', url: 'https://www.vinted.com',
      best: 'Everyday clothing, shoes, accessories in bulk, kids clothes, and home goods.',
      detail: '0% seller fees. You keep the full sale price and the buyer pays a small protection fee.',
      cats: ['clothing', 'shoes', 'home', 'toys'] },
    { id: 'grailed', name: 'Grailed', url: 'https://www.grailed.com',
      best: 'Designer menswear, streetwear, archive denim, and limited sneakers.',
      detail: 'Buyers search by label and era. 6% commission under $120, 9% above.',
      cats: ['clothing', 'shoes'] },
    { id: 'stockx', name: 'StockX', url: 'https://stockx.com',
      best: 'Sneakers, streetwear, trading cards, and hype collectibles.',
      detail: 'Live bid and ask prices. Every item is authenticated before it reaches the buyer.',
      cats: ['shoes', 'clothing', 'collectibles', 'toys'] },
    { id: 'vestiaire', name: 'Vestiaire Collective', url: 'https://www.vestiairecollective.com',
      best: 'Designer and luxury fashion, handbags, shoes, and high-end clothing.',
      detail: '35+ million users across 150 countries, with optional physical authentication.',
      cats: ['clothing', 'shoes', 'jewelry'] },
    { id: 'realreal', name: 'The RealReal', url: 'https://www.therealreal.com',
      best: 'Authenticated luxury fashion, jewelry, watches, and home goods.',
      detail: 'Consignment: they authenticate, photograph, list, and ship. Commission runs 20-70% by price.',
      cats: ['clothing', 'shoes', 'jewelry', 'home'] },
    { id: 'firstdibs', name: '1stDibs', url: 'https://www.1stdibs.com',
      best: 'High-end antiques, fine art, designer furniture, and rare jewelry.',
      detail: 'Vetted professional dealers only. 15-30% commission.',
      cats: ['furniture', 'home', 'jewelry', 'collectibles'],
      dealersOnly: true },
    { id: 'bonanza', name: 'Bonanza', url: 'https://www.bonanza.com',
      best: 'General goods of all kinds, the closest thing to eBay without eBay fees.',
      detail: '3.5% final value fee, free to list.',
      cats: ['other', 'collectibles', 'home', 'clothing', 'toys', 'electronics', 'books'] },
    { id: 'backmarket', name: 'Back Market', url: 'https://www.backmarket.com',
      best: 'Used and refurbished phones, laptops, tablets, and consoles via trade-in.',
      detail: 'Every device is graded and sold with a warranty, which is why buyers trust it.',
      cats: ['electronics'] },
    { id: 'discogs', name: 'Discogs', url: 'https://www.discogs.com',
      best: 'Vinyl records, CDs, cassettes, box sets, and other physical music formats.',
      detail: 'Sellers list against the exact release in a 15M+ database. Free to list, 9% fee, PayPal required. No listing photos here: buyers see the database photo, so the staged photo does not apply.',
      cats: ['records'],
      photoApplies: false }
  ];

  var LISTING_DAYS = 30;
  var DAY_MS = 24 * 60 * 60 * 1000;
  var STORE_KEY = 'shelflife.v1';
  var MAX_PRECHECKED = 5;

  /* ---------------- Pure logic (also tested in Node) ---------------- */

  function findSite(id) {
    for (var i = 0; i < SITES.length; i++) {
      if (SITES[i].id === id) return SITES[i];
    }
    return null;
  }

  function categoryLabel(key) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].key === key) return CATEGORIES[i].label;
    }
    return 'Something Else';
  }

  function nextSerial(counter) {
    var n = (counter || 0) + 1;
    var s = String(n);
    while (s.length < 4) s = '0' + s;
    return 'SL-' + s;
  }

  function deadlineFrom(listedAt) {
    return listedAt + LISTING_DAYS * DAY_MS;
  }

  function daysLeft(deadline, now) {
    var left = Math.ceil((deadline - now) / DAY_MS);
    return left <= 0 ? 0 : left;
  }

  /* Best-fit sites for a category: specialists first (fewest categories),
     then generalists, in list order. */
  function bestSitesFor(category) {
    var matches = [];
    for (var i = 0; i < SITES.length; i++) {
      if (SITES[i].cats.indexOf(category) !== -1) {
        matches.push({ site: SITES[i], order: i });
      }
    }
    matches.sort(function (a, b) {
      if (a.site.cats.length !== b.site.cats.length) {
        return a.site.cats.length - b.site.cats.length;
      }
      return a.order - b.order;
    });
    var out = [];
    for (var j = 0; j < matches.length; j++) out.push(matches[j].site);
    return out;
  }

  /* Guide price for a category and condition, or null when there is no
     good match. Never invents a sale: it only reads the built-in guide. */
  function guidePrice(category, condition) {
    var range = PRICE_GUIDE[category];
    if (!range) return null;
    var factor = CONDITION_FACTOR[condition];
    if (factor === undefined) return null;
    var price = Math.round(range[0] + (range[1] - range[0]) * factor);
    return { price: price, low: range[0], high: range[1] };
  }

  function csvEscape(value) {
    var s = String(value === undefined || value === null ? '' : value);
    if (s.indexOf('"') !== -1 || s.indexOf(',') !== -1 || s.indexOf('\n') !== -1) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function formatDate(ms) {
    var d = new Date(ms);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1);
    var day = String(d.getDate());
    if (m.length < 2) m = '0' + m;
    if (day.length < 2) day = '0' + day;
    return y + '-' + m + '-' + day;
  }

  function buildPlatosCsv(items) {
    var lines = ['Serial,Item,Category,Condition,Price,Listed,Ended'];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      lines.push([
        csvEscape(it.serial),
        csvEscape(it.name),
        csvEscape(categoryLabel(it.category)),
        csvEscape(it.condition),
        csvEscape(it.price),
        csvEscape(formatDate(it.listedAt)),
        csvEscape(formatDate(it.endedAt))
      ].join(','));
    }
    return lines.join('\n') + '\n';
  }

  function buildPlatosText(items) {
    var lines = ["Plato's Closet list - ShelfLife"];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      lines.push(it.serial + ' - ' + it.name + ' (' + categoryLabel(it.category) + ', ' + it.condition + ') - $' + it.price);
    }
    return lines.join('\n');
  }

  /* Move live items past their deadline to the Plato's Closet list.
     Returns the alerts created. Pure: mutates the passed state. */
  function checkExpiries(state, now) {
    var created = [];
    for (var i = 0; i < state.items.length; i++) {
      var it = state.items[i];
      if (it.status !== 'live') continue;
      if (now < it.deadline) continue;
      it.status = 'ended';
      it.endedAt = now;
      it.endedReason = 'expired';
      for (var j = 0; j < it.sites.length; j++) {
        if (it.sites[j].status === 'live') it.sites[j].status = 'ended';
      }
      state.counters.alert += 1;
      var alert = {
        id: 'a' + state.counters.alert,
        type: 'expired',
        itemId: it.id,
        serial: it.serial,
        name: it.name,
        text: '30 days are up for ' + it.name + ' (' + it.serial + '). The listings came down and it is on your Plato\'s Closet list.',
        at: now,
        read: false
      };
      state.alerts.unshift(alert);
      created.push(alert);
    }
    return created;
  }

  function unreadCount(state) {
    var n = 0;
    for (var i = 0; i < state.alerts.length; i++) {
      if (!state.alerts[i].read) n++;
    }
    return n;
  }

  function liveItems(state) {
    return state.items.filter(function (it) { return it.status === 'live'; });
  }

  function platosItems(state) {
    return state.items.filter(function (it) {
      return it.status === 'ended' && it.endedReason === 'expired';
    });
  }

  function emptyState() {
    return {
      version: 1,
      setup: null,
      accounts: {},
      items: [],
      alerts: [],
      counters: { serial: 0, item: 0, alert: 0 }
    };
  }

  /* ---------------- Storage ---------------- */

  var storageBackend = null;
  if (typeof localStorage !== 'undefined') {
    storageBackend = localStorage;
  }

  function loadState() {
    if (!storageBackend) return emptyState();
    try {
      var raw = storageBackend.getItem(STORE_KEY);
      if (!raw) return emptyState();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return emptyState();
      parsed.accounts = parsed.accounts || {};
      parsed.items = parsed.items || [];
      parsed.alerts = parsed.alerts || [];
      parsed.counters = parsed.counters || { serial: 0, item: 0, alert: 0 };
      return parsed;
    } catch (e) {
      return emptyState();
    }
  }

  /* Returns true on save, false when storage is full or unavailable. */
  function saveState(state) {
    if (!storageBackend) return false;
    try {
      storageBackend.setItem(STORE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function storageBytes() {
    if (!storageBackend) return 0;
    try {
      var raw = storageBackend.getItem(STORE_KEY);
      return raw ? raw.length : 0;
    } catch (e) {
      return 0;
    }
  }

  /* ---------------- Browser UI (skipped in Node tests) ---------------- */

  var state = null;
  var currentScreen = 'home';
  var draft = null;
  var toastTimer = null;
  var dialogResolve = null;

  function $(id) { return document.getElementById(id); }

  function escapeHtml(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setStatus(text, busy) {
    var dot = $('statusDot');
    var label = $('statusText');
    if (dot) dot.className = 'status-dot' + (busy ? ' busy' : '');
    if (label) label.textContent = text;
  }

  function showToast(text) {
    var t = $('toast');
    if (!t) return;
    t.textContent = text;
    t.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 3500);
  }

  /* Confirm dialog. "No" comes first and gets focus: destructive choices
     default to No. Resolves true only when Yes is tapped. */
  function confirmDialog(title, text, yesLabel) {
    return new Promise(function (resolve) {
      dialogResolve = resolve;
      $('dialogTitle').textContent = title;
      $('dialogText').textContent = text;
      $('dialogYes').textContent = yesLabel || 'Yes, do it';
      $('dialogBackdrop').hidden = false;
      $('dialogNo').focus();
    });
  }

  function closeDialog(result) {
    $('dialogBackdrop').hidden = true;
    if (dialogResolve) {
      var r = dialogResolve;
      dialogResolve = null;
      r(result);
    }
  }

  function showScreen(name) {
    currentScreen = name;
    var screens = document.querySelectorAll('.screen');
    for (var i = 0; i < screens.length; i++) {
      screens[i].hidden = screens[i].id !== 'screen-' + name;
    }
    var tabs = document.querySelectorAll('.tab');
    for (var j = 0; j < tabs.length; j++) {
      if (tabs[j].getAttribute('data-screen') === name) {
        tabs[j].setAttribute('aria-current', 'page');
      } else {
        tabs[j].removeAttribute('aria-current');
      }
    }
    if (name === 'home') renderHome();
    if (name === 'items') renderItems();
    if (name === 'sites') renderSites();
    if (name === 'alerts') renderAlerts();
    if (name === 'platos') renderPlatos();
    if (name === 'settings') renderSettings();
    window.scrollTo(0, 0);
  }

  function updateBadge() {
    var badge = $('alertBadge');
    if (!badge) return;
    var n = unreadCount(state);
    badge.hidden = n === 0;
    badge.textContent = String(n);
  }

  function persist() {
    var ok = saveState(state);
    if (!ok) {
      showToast('Could not save. Storage on this device is full. Try removing an old item.');
    }
    updateBadge();
    return ok;
  }

  /* Run the day-30 sweep: listings past deadline come down and move to
     the Plato's Closet list, with one alert each. */
  function runExpirySweep() {
    var created = checkExpiries(state, Date.now());
    if (created.length > 0) {
      persist();
      if (currentScreen === 'items') renderItems();
      if (currentScreen === 'platos') renderPlatos();
      if (currentScreen === 'alerts') renderAlerts();
      if (currentScreen === 'home') renderHome();
    }
    return created.length;
  }

  /* ---------------- Setup ---------------- */

  function renderSetup() {
    showScreen('setup');
    setStatus('Setup', false);
  }

  function seedAccounts() {
    var accounts = {};
    for (var i = 0; i < SITES.length; i++) {
      var site = SITES[i];
      if (site.dealersOnly) {
        accounts[site.id] = {
          status: 'needs_attention',
          note: 'Needs a dealer account. ShelfLife cannot create this one for you.'
        };
      } else {
        accounts[site.id] = { status: 'ready', note: '' };
      }
    }
    return accounts;
  }

  function runSetup() {
    var email = $('setupEmail').value.trim();
    var password = $('setupPassword').value;
    if (!email || email.indexOf('@') === -1) {
      showToast('Please type your email address first.');
      $('setupEmail').focus();
      return;
    }
    if (!password) {
      showToast('Please pick a password first.');
      $('setupPassword').focus();
      return;
    }
    setStatus('Setting up', true);
    $('setupGo').disabled = true;
    var progress = $('setupProgress');
    var i = 0;
    state.setup = { email: email, password: password, doneAt: Date.now() };
    state.accounts = seedAccounts();
    persist();
    var step = function () {
      if (i < SITES.length) {
        progress.textContent = 'Setting up ' + SITES[i].name + ' (' + (i + 1) + ' of ' + SITES.length + ')';
        i++;
        setTimeout(step, 60);
      } else {
        progress.textContent = 'All 30 sites are set up. 1stDibs needs a dealer account, so it is flagged for you.';
        setStatus('Ready', false);
        showToast('All set. Ready to sell.');
        showScreen('home');
      }
    };
    step();
  }

  /* ---------------- Home ---------------- */

  function renderHome() {
    var live = liveItems(state);
    var sold = state.items.filter(function (it) { return it.status === 'sold'; }).length;
    var ended = platosItems(state).length;
    var html = '';
    if (state.items.length === 0) {
      html = '<p class="empty">Nothing on the shelf yet.<br>Tap Sell something to add your first item.</p>';
    } else {
      html = '<p><strong>' + live.length + '</strong> live now &middot; <strong>' + sold + '</strong> sold &middot; <strong>' + ended + '</strong> on the Plato\'s Closet list</p>';
      if (live.length > 0) {
        var soonest = null;
        for (var i = 0; i < live.length; i++) {
          if (!soonest || live[i].deadline < soonest.deadline) soonest = live[i];
        }
        html += '<p>Next one up: <strong>' + escapeHtml(soonest.name) + '</strong> (' + escapeHtml(soonest.serial) + '), ' +
          daysLeft(soonest.deadline, Date.now()) + ' days left.</p>';
      }
    }
    $('homeSummary').innerHTML = html;
  }

  /* ---------------- Items ---------------- */

  function itemCardHtml(it) {
    var pill = it.status === 'live' ? '<span class="pill pill-live">Live</span>'
      : it.status === 'sold' ? '<span class="pill pill-sold">Sold</span>'
      : '<span class="pill pill-ended">Ended</span>';
    var thumb = it.photo
      ? '<img class="item-thumb" src="' + it.photo + '" alt="">'
      : '<span class="item-thumb-placeholder" aria-hidden="true">&#128230;</span>';
    var left = '';
    if (it.status === 'live') {
      var d = daysLeft(it.deadline, Date.now());
      left = '<div class="item-meta"><span class="days-left' + (d <= 5 ? ' days-low' : '') + '">' + d + ' days left</span> of 30</div>';
    } else if (it.status === 'sold') {
      left = '<div class="item-meta">Sold on ' + formatDate(it.soldAt) + '</div>';
    } else if (it.endedReason === 'expired') {
      left = '<div class="item-meta">30 days up on ' + formatDate(it.endedAt) + '. Now on your Plato\'s Closet list.</div>';
    } else {
      left = '<div class="item-meta">Taken down on ' + formatDate(it.endedAt) + '.</div>';
    }
    var tags = '';
    for (var i = 0; i < it.sites.length; i++) {
      var s = findSite(it.sites[i].siteId);
      if (!s) continue;
      var closed = it.sites[i].status !== 'live';
      tags += '<span class="site-tag' + (closed ? ' closed' : '') + '">' + escapeHtml(s.name) + '</span>';
    }
    var actions = '';
    if (it.status === 'live') {
      actions = '<div class="row"><button class="btn btn-primary btn-small" data-sold="' + it.id + '" type="button">It sold</button>' +
        '<button class="btn btn-secondary btn-small" data-takedown="' + it.id + '" type="button">Take it down</button></div>';
    }
    actions += '<button class="btn btn-secondary btn-small" data-remove="' + it.id + '" type="button">Remove this item</button>';
    return '<div class="card"><div class="item-card">' + thumb +
      '<div class="item-body"><div class="item-name">' + escapeHtml(it.name) + '</div>' +
      '<div class="item-serial">' + escapeHtml(it.serial) + ' &middot; ' + escapeHtml(categoryLabel(it.category)) + ' &middot; ' + escapeHtml(it.condition) + '</div>' +
      '<div class="item-meta">$' + escapeHtml(it.price) + '</div>' +
      pill + left + '</div></div>' +
      '<div class="site-tags">' + tags + '</div>' + actions + '</div>';
  }

  function renderItems() {
    var box = $('itemsList');
    if (state.items.length === 0) {
      box.innerHTML = '<p class="empty">No items yet.<br>Tap Sell on the bottom bar to add one.</p>';
      return;
    }
    var html = '';
    var sorted = state.items.slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
    for (var i = 0; i < sorted.length; i++) html += itemCardHtml(sorted[i]);
    box.innerHTML = html;
  }

  function findItem(id) {
    for (var i = 0; i < state.items.length; i++) {
      if (state.items[i].id === id) return state.items[i];
    }
    return null;
  }

  function markSold(id) {
    var it = findItem(id);
    if (!it || it.status !== 'live') return;
    confirmDialog('Did it sell?', it.name + ' (' + it.serial + ') sold. ShelfLife will close the listings on the other sites and keep the sale on record.', 'Yes, it sold').then(function (yes) {
      if (!yes) return;
      var now = Date.now();
      it.status = 'sold';
      it.soldAt = now;
      for (var i = 0; i < it.sites.length; i++) {
        if (it.sites[i].status === 'live') it.sites[i].status = 'closed';
      }
      state.counters.alert += 1;
      state.alerts.unshift({
        id: 'a' + state.counters.alert,
        type: 'sold',
        itemId: it.id,
        serial: it.serial,
        name: it.name,
        text: it.name + ' (' + it.serial + ') sold for $' + it.price + '. The other listings are closed.',
        at: now,
        read: false
      });
      persist();
      renderItems();
      showToast('Nice. Sale recorded and the other listings are closed.');
    });
  }

  function takeDown(id) {
    var it = findItem(id);
    if (!it || it.status !== 'live') return;
    confirmDialog('Take it down?', 'This takes ' + it.name + ' (' + it.serial + ') off all its sites now, before the 30 days are up.', 'Yes, take it down').then(function (yes) {
      if (!yes) return;
      var now = Date.now();
      it.status = 'ended';
      it.endedAt = now;
      it.endedReason = 'removed';
      for (var i = 0; i < it.sites.length; i++) {
        if (it.sites[i].status === 'live') it.sites[i].status = 'ended';
      }
      persist();
      renderItems();
      showToast('Taken down.');
    });
  }

  function removeItem(id) {
    var it = findItem(id);
    if (!it) return;
    confirmDialog('Remove this item?', it.name + ' (' + it.serial + ') and its photo will be erased from ShelfLife. This cannot be undone.', 'Yes, remove it').then(function (yes) {
      if (!yes) return;
      state.items = state.items.filter(function (x) { return x.id !== id; });
      persist();
      renderItems();
      renderHome();
      showToast('Item removed.');
    });
  }

  /* ---------------- Sites ---------------- */

  function accountPill(acct) {
    if (!acct) return '<span class="pill pill-attention">Not set up</span>';
    if (acct.status === 'verified') return '<span class="pill pill-live">Verified</span>';
    if (acct.status === 'needs_attention') return '<span class="pill pill-attention">Needs attention</span>';
    return '<span class="pill pill-ended">Ready</span>';
  }

  function renderSites() {
    var box = $('sitesList');
    var html = '';
    for (var i = 0; i < SITES.length; i++) {
      var site = SITES[i];
      var acct = state.accounts[site.id];
      var note = '';
      if (site.dealersOnly) {
        note = '<p class="site-detail"><strong>Dealers only.</strong> This site only lets professional dealers sell, so ShelfLife cannot set up an account here for you.</p>';
      }
      if (site.photoApplies === false) {
        note += '<p class="site-detail"><strong>Photos:</strong> this site shows its own database photo, not yours. Your grade does the selling here.</p>';
      }
      if (acct && acct.note) {
        note += '<p class="site-detail">' + escapeHtml(acct.note) + '</p>';
      }
      var checkBtn = site.dealersOnly ? '' :
        '<button class="btn btn-secondary btn-small" data-check="' + site.id + '" type="button">Check account</button>';
      html += '<div class="card"><div class="site-top"><span class="site-name">' + escapeHtml(site.name) + '</span>' + accountPill(acct) + '</div>' +
        '<p class="site-best"><strong>Best for:</strong> ' + escapeHtml(site.best) + '</p>' +
        '<p class="site-detail">' + escapeHtml(site.detail) + '</p>' + note +
        '<div class="row">' + checkBtn +
        '<a class="btn btn-secondary btn-small" href="' + site.url + '" target="_blank" rel="noopener">Visit site</a></div></div>';
    }
    box.innerHTML = html;
  }

  function checkAccount(siteId) {
    var site = findSite(siteId);
    if (!site) return;
    setStatus('Checking ' + site.name, true);
    setTimeout(function () {
      var acct = state.accounts[siteId] || { status: 'ready', note: '' };
      acct.status = 'verified';
      acct.note = 'Checked on ' + formatDate(Date.now()) + '. Details match what you set up.';
      state.accounts[siteId] = acct;
      persist();
      setStatus('Ready', false);
      renderSites();
      showToast(site.name + ' account looks good.');
    }, 900);
  }

  /* ---------------- Alerts ---------------- */

  function renderAlerts() {
    var box = $('alertsList');
    if (state.alerts.length === 0) {
      box.innerHTML = '<p class="empty">No alerts yet.<br>Quiet is good. You will only hear about sales and day 30.</p>';
      return;
    }
    var html = '';
    for (var i = 0; i < state.alerts.length; i++) {
      var a = state.alerts[i];
      var title = a.type === 'sold' ? 'Sold' : '30 days are up';
      html += '<div class="card alert-card' + (a.read ? '' : ' unread') + '"><h2>' + title + '</h2>' +
        '<p>' + escapeHtml(a.text) + '</p>' +
        '<div class="alert-when">' + formatDate(a.at) + '</div></div>';
    }
    box.innerHTML = html;
  }

  /* ---------------- Plato's Closet ---------------- */

  function renderPlatos() {
    var items = platosItems(state);
    var box = $('platosList');
    var exportBtn = $('exportCsvBtn');
    var copyBtn = $('copyListBtn');
    if (exportBtn) exportBtn.disabled = items.length === 0;
    if (copyBtn) copyBtn.disabled = items.length === 0;
    if (items.length === 0) {
      box.innerHTML = '<p class="empty">Nothing here yet.<br>Items that run their 30 days without selling land on this list.</p>';
      return;
    }
    var html = '';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var thumb = it.photo
        ? '<img class="item-thumb" src="' + it.photo + '" alt="">'
        : '<span class="item-thumb-placeholder" aria-hidden="true">&#128230;</span>';
      html += '<div class="card"><div class="item-card">' + thumb +
        '<div class="item-body"><div class="item-name">' + escapeHtml(it.name) + '</div>' +
        '<div class="item-serial">' + escapeHtml(it.serial) + ' &middot; ' + escapeHtml(categoryLabel(it.category)) + ' &middot; ' + escapeHtml(it.condition) + '</div>' +
        '<div class="item-meta">$' + escapeHtml(it.price) + ' &middot; 30 days up ' + formatDate(it.endedAt) + '</div>' +
        '</div></div></div>';
    }
    box.innerHTML = html;
  }

  function downloadCsv() {
    var items = platosItems(state);
    if (items.length === 0) return;
    var csv = buildPlatosCsv(items);
    var blob = new Blob([csv], { type: 'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'platos-closet-list.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
    showToast('List downloaded.');
  }

  function copyList() {
    var items = platosItems(state);
    if (items.length === 0) return;
    var text = buildPlatosText(items);
    var done = function () { showToast('List copied.'); };
    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); }
      catch (e) { showToast('Could not copy. Try the download button.'); }
      ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  }

  /* ---------------- Settings ---------------- */

  function renderSettings() {
    var acct = $('settingsAccount');
    if (state.setup) {
      acct.innerHTML = '<p><strong>Email:</strong> ' + escapeHtml(state.setup.email) + '</p>' +
        '<p class="field-help">Saved only on this device. ShelfLife never sends it anywhere.</p>' +
        '<p><strong>Sites set up:</strong> ' + SITES.length + '</p>';
    } else {
      acct.innerHTML = '<p>No account set up yet.</p>';
    }
    var bytes = storageBytes();
    var kb = (bytes / 1024).toFixed(0);
    $('settingsStorage').innerHTML = '<p>ShelfLife is using about <strong>' + kb + ' KB</strong> on this device for your items and photos.</p>' +
      '<p class="field-help">Photos are resized when you add them so everything fits on the device.</p>';
  }

  function wipeAll() {
    confirmDialog('Erase everything?', 'This erases your account, all items, photos, listings, and alerts from this device. This cannot be undone.', 'Yes, erase it all').then(function (yes) {
      if (!yes) return;
      if (storageBackend) {
        try { storageBackend.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
      }
      state = emptyState();
      draft = null;
      renderSetup();
      showToast('Everything is erased.');
    });
  }

  /* ---------------- Add item flow ---------------- */

  function freshDraft() {
    return {
      step: 1,
      photo: null,
      name: '',
      category: '',
      condition: '',
      scene: 'living',
      price: '',
      sites: []
    };
  }

  function startAdd() {
    draft = freshDraft();
    showScreen('add');
    renderAddStep();
  }

  function stepHead(n, total, title) {
    return '<p class="step-head">Step ' + n + ' of ' + total + '</p><h1>' + title + '</h1>';
  }

  function backBtn() {
    return '<button class="btn btn-secondary" data-addback type="button">Back</button>';
  }

  function renderAddStep() {
    var box = $('addFlow');
    if (!draft) { showScreen('home'); return; }
    if (draft.step === 1) {
      var preview = draft.photo
        ? '<img class="photo-frame" src="' + draft.photo + '" alt="Your photo">'
        : '';
      box.innerHTML = stepHead(1, 6, 'Take or pick one photo') +
        '<div class="privacy-line">Pick one photo. ShelfLife only sees the photos you pick — never your whole library.</div>' +
        preview +
        '<div class="card"><p>Tap the button to pick a photo with your phone\'s own picker. One photo at a time, and only the photo you pick.</p>' +
        '<button class="btn btn-primary btn-big" data-pickphoto type="button">Pick a photo</button></div>' +
        '<div class="row">' + backBtn() +
        '<button class="btn btn-primary" data-addnext type="button" ' + (draft.photo ? '' : 'disabled') + '>Next</button></div>';
    } else if (draft.step === 2) {
      var chips = '';
      for (var i = 0; i < CATEGORIES.length; i++) {
        var c = CATEGORIES[i];
        chips += '<button class="chip" data-cat="' + c.key + '" aria-pressed="' + (draft.category === c.key) + '" type="button">' + escapeHtml(c.label) + '</button>';
      }
      box.innerHTML = stepHead(2, 6, 'What is it?') +
        '<div class="card"><label class="field"><span class="field-label">Name the item</span>' +
        '<input id="draftName" type="text" placeholder="For example: Blue denim jacket" value="' + escapeHtml(draft.name) + '">' +
        '<span class="field-help">Say what it is in plain words. This is the name buyers see.</span></label>' +
        '<span class="field-label">What kind of thing is it?</span>' +
        '<div class="chips">' + chips + '</div>' +
        '<span class="field-help">Pick the closest one. ShelfLife uses it to pick the best sites and the price guide.</span></div>' +
        '<div class="row">' + backBtn() +
        '<button class="btn btn-primary" data-addnext type="button">Next</button></div>';
      var nameInput = $('draftName');
      if (nameInput) {
        nameInput.addEventListener('input', function () { draft.name = nameInput.value; });
      }
    } else if (draft.step === 3) {
      var cchips = '';
      for (var j = 0; j < CONDITIONS.length; j++) {
        cchips += '<button class="chip" data-cond="' + CONDITIONS[j] + '" aria-pressed="' + (draft.condition === CONDITIONS[j]) + '" type="button">' + CONDITIONS[j] + '</button>';
      }
      box.innerHTML = stepHead(3, 6, 'What shape is it in?') +
        '<div class="card"><div class="chips">' + cchips + '</div>' +
        '<span class="field-help">Be honest about the condition. The price guide and the buyers both go by it.</span></div>' +
        '<div class="row">' + backBtn() +
        '<button class="btn btn-primary" data-addnext type="button" ' + (draft.condition ? '' : 'disabled') + '>Next</button></div>';
    } else if (draft.step === 4) {
      box.innerHTML = stepHead(4, 6, 'Pick a scene for the photo') +
        '<p class="lede">ShelfLife puts your item in a magazine style scene. Pick the one that fits it best.</p>' +
        stagedPreviewHtml() +
        scenePickerHtml() +
        '<div class="row"><button class="btn btn-secondary" data-savestaged type="button">Save this photo</button></div>' +
        '<div class="row">' + backBtn() +
        '<button class="btn btn-primary" data-addnext type="button">Next</button></div>';
    } else if (draft.step === 5) {
      box.innerHTML = stepHead(5, 6, 'What should it sell for?') + priceStepHtml() +
        '<div class="row">' + backBtn() +
        '<button class="btn btn-primary" data-addnext type="button">Next</button></div>';
      var priceInput = $('draftPrice');
      if (priceInput) {
        priceInput.addEventListener('input', function () { draft.price = priceInput.value; });
      }
    } else if (draft.step === 6) {
      box.innerHTML = stepHead(6, 6, 'Where should it list?') +
        '<p class="lede">ShelfLife ticked the sites most likely to sell this item. Untick any you do not want, or tick more.</p>' +
        sitesStepHtml() +
        '<div class="row">' + backBtn() +
        '<button class="btn btn-primary" data-publish type="button">List it</button></div>';
    } else if (draft.step === 7) {
      box.innerHTML = '<h1>It is on the shelf</h1>' +
        '<div class="card"><p><strong>' + escapeHtml(draft.name) + '</strong> is listed on ' + draft.sites.length + ' sites for 30 days.</p>' +
        '<p>Serial number: <strong>' + escapeHtml(draft.serial) + '</strong></p>' +
        '<p class="field-help">You will only hear about it if it sells, or when the 30 days are up.</p></div>' +
        '<div class="row"><button class="btn btn-primary" data-viewitems type="button">View my items</button>' +
        '<button class="btn btn-secondary" data-sellanother type="button">Sell another thing</button></div>';
    }
  }

  function sceneClass(key) {
    for (var i = 0; i < SCENES.length; i++) {
      if (SCENES[i].key === key) return SCENES[i].css;
    }
    return 'scene-living';
  }

  function sceneLabel(key) {
    for (var i = 0; i < SCENES.length; i++) {
      if (SCENES[i].key === key) return SCENES[i].label;
    }
    return 'Living Room';
  }

  function stagedPreviewHtml() {
    var img = draft.photo ? '<img class="staged-img" src="' + draft.photo + '" alt="">' : '';
    return '<div class="staged-preview"><div class="scene-stage ' + sceneClass(draft.scene) + '"></div>' +
      img +
      '<div class="staged-masthead">SHELFLIFE</div>' +
      '<div class="staged-caption"><div class="cap-name">' + escapeHtml(draft.name || 'Your item') + '</div>' +
      '<div class="cap-meta">' + escapeHtml(sceneLabel(draft.scene)) + ' &middot; ' + escapeHtml(draft.condition || '') + '</div></div></div>';
  }

  function scenePickerHtml() {
    var html = '<div class="scene-pick">';
    for (var i = 0; i < SCENES.length; i++) {
      var sc = SCENES[i];
      var img = draft.photo ? '<img src="' + draft.photo + '" alt="">' : '';
      html += '<button class="scene-option" data-scene="' + sc.key + '" aria-pressed="' + (draft.scene === sc.key) + '" type="button">' +
        '<span class="scene-thumb ' + sc.css + '">' + img + '</span>' +
        '<span class="scene-name">' + escapeHtml(sc.label) + '</span></button>';
    }
    return html + '</div>';
  }

  function livePriceLinks(name) {
    var q = encodeURIComponent(name);
    var links = '<p><a class="link-btn" href="https://www.ebay.com/sch/i.html?_nkw=' + q + '&LH_Sold=1&LH_Complete=1" target="_blank" rel="noopener">See what it sold for on eBay</a></p>' +
      '<p><a class="link-btn" href="https://www.mercari.com/us/search/?keyword=' + q + '" target="_blank" rel="noopener">See it on Mercari</a></p>';
    if (draft.category === 'clothing' || draft.category === 'shoes' || draft.category === 'jewelry') {
      links += '<p><a class="link-btn" href="https://www.poshmark.com/search?query=' + q + '" target="_blank" rel="noopener">See it on Poshmark</a></p>';
    }
    return links;
  }

  function priceStepHtml() {
    var guide = guidePrice(draft.category, draft.condition);
    var html = '<div class="card">';
    if (guide) {
      if (!draft.price) draft.price = String(guide.price);
      html += '<p>ShelfLife suggests</p><div class="price-big">$' + guide.price + '</div>' +
        '<p class="field-help">Typical range for ' + escapeHtml(categoryLabel(draft.category).toLowerCase()) + ' in ' +
        escapeHtml(draft.condition.toLowerCase()) + ' shape: $' + guide.low + ' to $' + guide.high + '. ' +
        'This is a built-in guide, not live sales data. Check the live prices below, then take the price or set your own.</p>';
    } else {
      html += '<h2>No good match found</h2>' +
        '<p>ShelfLife could not find a price guide for this kind of item, so it will not guess. Check the live prices below, or set your own price.</p>';
    }
    html += livePriceLinks(draft.name || '') + '</div>';
    html += '<div class="card"><label class="field"><span class="field-label">Your price</span>' +
      '<input id="draftPrice" type="number" min="0" step="1" inputmode="numeric" value="' + escapeHtml(draft.price) + '" placeholder="0">' +
      '<span class="field-help">Dollars. This is the price buyers see on every site.</span></label></div>';
    return html;
  }

  function sitesStepHtml() {
    var best = bestSitesFor(draft.category);
    var bestIds = {};
    var pre = Math.min(MAX_PRECHECKED, best.length);
    if (draft.sites.length === 0) {
      for (var p = 0; p < pre; p++) {
        if (!best[p].dealersOnly) draft.sites.push(best[p].id);
      }
    }
    for (var b = 0; b < pre; b++) bestIds[best[b].id] = true;
    var html = '<div class="card">';
    for (var i = 0; i < SITES.length; i++) {
      var site = SITES[i];
      var isBest = !!bestIds[site.id];
      var checked = draft.sites.indexOf(site.id) !== -1;
      var disabled = site.dealersOnly ? ' disabled' : '';
      var why = '';
      if (site.dealersOnly) {
        why = 'Dealers only. ShelfLife cannot list here without a dealer account.';
      } else if (isBest) {
        why = 'Picked because: ' + site.best;
      } else {
        why = site.best;
      }
      html += '<div class="check-row"><input type="checkbox" id="site-' + site.id + '" data-sitebox="' + site.id + '"' +
        (checked ? ' checked' : '') + disabled + '>' +
        '<label for="site-' + site.id + '"><strong>' + escapeHtml(site.name) + '</strong>' +
        (isBest ? ' <span class="pill pill-live">Best fit</span>' : '') +
        '<br><span class="check-why">' + escapeHtml(why) + '</span></label></div>';
    }
    return html + '</div>';
  }

  function addNext() {
    if (draft.step === 1) {
      if (!draft.photo) { showToast('Pick a photo first.'); return; }
      draft.step = 2;
    } else if (draft.step === 2) {
      draft.name = ($('draftName') ? $('draftName').value : draft.name).trim();
      if (!draft.name) { showToast('Give the item a name first.'); return; }
      if (!draft.category) { showToast('Pick what kind of thing it is.'); return; }
      draft.step = 3;
    } else if (draft.step === 3) {
      if (!draft.condition) { showToast('Pick what shape it is in.'); return; }
      draft.step = 4;
    } else if (draft.step === 4) {
      draft.step = 5;
    } else if (draft.step === 5) {
      var raw = $('draftPrice') ? $('draftPrice').value : draft.price;
      var price = parseInt(raw, 10);
      if (isNaN(price) || price < 0) { showToast('Type a price first. Use 0 if it is free.'); return; }
      draft.price = String(price);
      draft.sites = [];
      draft.step = 6;
    }
    renderAddStep();
  }

  function addBack() {
    if (draft.step <= 1) {
      draft = null;
      showScreen('home');
      return;
    }
    draft.step -= 1;
    renderAddStep();
  }

  function publishDraft() {
    if (draft.sites.length === 0) {
      showToast('Tick at least one site to list on.');
      return;
    }
    setStatus('Listing', true);
    var now = Date.now();
    state.counters.serial += 1;
    state.counters.item += 1;
    var serial = nextSerial(state.counters.serial - 1);
    var sites = [];
    for (var i = 0; i < draft.sites.length; i++) {
      sites.push({ siteId: draft.sites[i], status: 'live' });
    }
    var item = {
      id: 'i' + state.counters.item,
      serial: serial,
      name: draft.name,
      category: draft.category,
      condition: draft.condition,
      price: draft.price,
      photo: draft.photo,
      scene: draft.scene,
      sites: sites,
      status: 'live',
      createdAt: now,
      listedAt: now,
      deadline: deadlineFrom(now),
      soldAt: null,
      endedAt: null,
      endedReason: null
    };
    state.items.push(item);
    draft.serial = serial;
    draft.step = 7;
    persist();
    setStatus('Ready', false);
    renderAddStep();
  }

  /* Photo picking: one photo at a time through the system picker. The app
     only ever receives the photo the user picks. Photos are resized so
     they fit in on-device storage. */
  function handlePhotoFile(file) {
    if (!file) return;
    if (file.type.indexOf('image/') !== 0) {
      showToast('That did not look like a photo. Pick an image file.');
      return;
    }
    setStatus('Reading photo', true);
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 900;
        var w = img.width;
        var h = img.height;
        if (w > max || h > max) {
          var scale = Math.min(max / w, max / h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        draft.photo = canvas.toDataURL('image/jpeg', 0.82);
        setStatus('Ready', false);
        renderAddStep();
      };
      img.onerror = function () {
        setStatus('Ready', false);
        showToast('Could not read that photo. Try a different one.');
      };
      img.src = reader.result;
    };
    reader.onerror = function () {
      setStatus('Ready', false);
      showToast('Could not read that photo. Try a different one.');
    };
    reader.readAsDataURL(file);
  }

  /* Build the staged magazine photo as a real image file to keep or share. */
  function downloadStagedPhoto() {
    if (!draft.photo) return;
    setStatus('Making photo', true);
    var img = new Image();
    img.onload = function () {
      var W = 1080;
      var H = 1350;
      var canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      var ctx = canvas.getContext('2d');
      var colors = SCENE_COLORS[draft.scene] || SCENE_COLORS.living;
      var grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(0.62, colors[0]);
      grad.addColorStop(0.62, colors[1]);
      grad.addColorStop(1, colors[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      var scale = Math.min((W * 0.8) / img.width, (H * 0.62) / img.height);
      var w = Math.round(img.width * scale);
      var h = Math.round(img.height * scale);
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 14;
      ctx.drawImage(img, Math.round((W - w) / 2), Math.round(H * 0.42 - h / 2), w, h);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 6;
      ctx.font = 'bold 54px Georgia, serif';
      ctx.fillText('S H E L F L I F E', 48, 88);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(20,41,29,0.92)';
      ctx.fillRect(0, H - 190, W, 190);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px Georgia, serif';
      ctx.fillText((draft.name || 'Your item').slice(0, 34), 48, H - 118);
      ctx.font = '28px Helvetica, Arial, sans-serif';
      var meta = sceneLabel(draft.scene) + '  -  ' + (draft.condition || '') +
        (draft.price ? '  -  $' + draft.price : '');
      ctx.fillText(meta.slice(0, 48), 48, H - 62);
      var a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'shelflife-' + (draft.serial || 'photo') + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setStatus('Ready', false);
      showToast('Staged photo saved.');
    };
    img.onerror = function () {
      setStatus('Ready', false);
      showToast('Could not make the staged photo.');
    };
    img.src = draft.photo;
  }

  /* ---------------- Boot and wiring ---------------- */

  function boot() {
    state = loadState();
    runExpirySweep();

    var tabs = document.querySelectorAll('.tab');
    for (var t = 0; t < tabs.length; t++) {
      tabs[t].addEventListener('click', function () {
        if (!state.setup) { renderSetup(); return; }
        showScreen(this.getAttribute('data-screen'));
      });
    }

    $('howtoBtn').addEventListener('click', function () { showScreen('howto'); });
    $('settingsBtn').addEventListener('click', function () { showScreen('settings'); });
    $('setupGo').addEventListener('click', runSetup);
    $('sellCta').addEventListener('click', startAdd);
    $('markReadBtn').addEventListener('click', function () {
      for (var i = 0; i < state.alerts.length; i++) state.alerts[i].read = true;
      persist();
      renderAlerts();
    });
    $('exportCsvBtn').addEventListener('click', downloadCsv);
    $('copyListBtn').addEventListener('click', copyList);
    $('wipeBtn').addEventListener('click', wipeAll);
    $('dialogNo').addEventListener('click', function () { closeDialog(false); });
    $('dialogYes').addEventListener('click', function () { closeDialog(true); });
    $('dialogBackdrop').addEventListener('click', function (e) {
      if (e.target === $('dialogBackdrop')) closeDialog(false);
    });
    $('photoInput').addEventListener('change', function () {
      if (this.files && this.files[0]) handlePhotoFile(this.files[0]);
      this.value = '';
    });

    /* One delegated click handler for everything rendered by JS. */
    document.addEventListener('click', function (e) {
      var el = e.target;
      while (el && el !== document) {
        if (el.hasAttribute && el.hasAttribute('data-sold')) { markSold(el.getAttribute('data-sold')); return; }
        if (el.hasAttribute && el.hasAttribute('data-takedown')) { takeDown(el.getAttribute('data-takedown')); return; }
        if (el.hasAttribute && el.hasAttribute('data-remove')) { removeItem(el.getAttribute('data-remove')); return; }
        if (el.hasAttribute && el.hasAttribute('data-check')) { checkAccount(el.getAttribute('data-check')); return; }
        if (el.hasAttribute && el.hasAttribute('data-pickphoto')) { $('photoInput').click(); return; }
        if (el.hasAttribute && el.hasAttribute('data-addnext')) { addNext(); return; }
        if (el.hasAttribute && el.hasAttribute('data-addback')) { addBack(); return; }
        if (el.hasAttribute && el.hasAttribute('data-publish')) { publishDraft(); return; }
        if (el.hasAttribute && el.hasAttribute('data-savestaged')) { downloadStagedPhoto(); return; }
        if (el.hasAttribute && el.hasAttribute('data-viewitems')) { showScreen('items'); return; }
        if (el.hasAttribute && el.hasAttribute('data-sellanother')) { startAdd(); return; }
        if (el.hasAttribute && el.hasAttribute('data-cat')) {
          draft.category = el.getAttribute('data-cat');
          renderAddStep();
          return;
        }
        if (el.hasAttribute && el.hasAttribute('data-cond')) {
          draft.condition = el.getAttribute('data-cond');
          renderAddStep();
          return;
        }
        if (el.hasAttribute && el.hasAttribute('data-scene')) {
          draft.scene = el.getAttribute('data-scene');
          renderAddStep();
          return;
        }
        el = el.parentNode;
      }
    });

    document.addEventListener('change', function (e) {
      var el = e.target;
      if (el && el.hasAttribute && el.hasAttribute('data-sitebox')) {
        var id = el.getAttribute('data-sitebox');
        var idx = draft.sites.indexOf(id);
        if (el.checked && idx === -1) draft.sites.push(id);
        if (!el.checked && idx !== -1) draft.sites.splice(idx, 1);
      }
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) runExpirySweep();
    });
    setInterval(runExpirySweep, 60 * 60 * 1000);

    updateBadge();
    if (!state.setup) {
      renderSetup();
    } else {
      showScreen('home');
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  }

  /* ---------------- Node exports for smoke tests ---------------- */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      SITES: SITES,
      CATEGORIES: CATEGORIES,
      CONDITIONS: CONDITIONS,
      PRICE_GUIDE: PRICE_GUIDE,
      SCENES: SCENES,
      LISTING_DAYS: LISTING_DAYS,
      findSite: findSite,
      categoryLabel: categoryLabel,
      nextSerial: nextSerial,
      deadlineFrom: deadlineFrom,
      daysLeft: daysLeft,
      bestSitesFor: bestSitesFor,
      guidePrice: guidePrice,
      csvEscape: csvEscape,
      formatDate: formatDate,
      buildPlatosCsv: buildPlatosCsv,
      buildPlatosText: buildPlatosText,
      checkExpiries: checkExpiries,
      unreadCount: unreadCount,
      liveItems: liveItems,
      platosItems: platosItems,
      emptyState: emptyState
    };
  }
})();
