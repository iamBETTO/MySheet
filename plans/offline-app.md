# Plan: Offline App (`ms-v2-25`, decision ms-d63)

The owner, 10 Nov 2026: bring the Offline App into v0.3, before the test round, so testers open a plain link without a
Claude account. Google Drive backup was considered and dropped ("way too early"). Approved in chat.

## Shape
- The same build serves both places. Inside Claude it keeps using the artifact's private store (synced between
  devices). Anywhere else (its own website) it saves on the device, in the browser's IndexedDB, through the same
  `Store` interface: `src/storage/deviceStore.ts`, chosen in `connect()` when there is no Claude runtime. No change to
  the saved data's shape (rule 17): the same documents under the same names.
- The browser is asked to keep MySheet's data (`navigator.storage.persist()`), so it isn't cleared to free space.
- Backups on the website: "Download a backup" saves a normal file; restore works as today. A reminder on Home when the
  last backup from this device is more than 30 days old (or never, once there is data), with one button.
- Offline and installable: a web manifest, an icon, and a small service worker (`public/sw.js`) that keeps the last
  copy of the page for use without internet. Registered only on the website, never inside Claude.
- Hosting (changed 24 Nov 2026, the owner's choice): MySheet's own repository becomes public, and the built site
  (`dist/`, without the Claude page) goes to its `gh-pages` branch for GitHub Pages. Every personal detail was
  removed first and the history restarted clean (see DEVLOG).
- Your own data moves once by hand: Download a backup in the Claude version, Restore it on the website.

## Steps
- [x] 1. Device store with unit tests (same behaviour as the memory store); `connect()` picks it outside Claude;
       persistence request. Screen test: data saved on the website survives a reload.
- [x] 2. Downloads outside Claude (a normal file); the backup reminder on Home; checks.
- [x] 3. Manifest, icon, service worker, registration outside Claude; screen test: the page opens offline after
       one visit.
- [x] 4. Make the repository public, turn on GitHub Pages from `gh-pages`; push the site. Live 24 Nov 2026.
       Still to do: the owner checks it on a phone (add to home screen).
- [ ] 5. Full suite, compare, publish the Claude page too; roadmap; DEVLOG.
