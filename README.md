# ALTA

A demo online shop for showing clients what a modern, well-designed store can look like: an editorial storefront, a real database, role-based back office, per-size inventory, USD/BDT pricing and a hosted-style payment flow. It is built to run on cheap hosting and to work well on phones.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Motion · GSAP · SQLite (better-sqlite3)

## Features

- **Storefront:** pinned campaign sequence, editorial grid with scroll parallax, borderless product tiles, full-screen menu, 2/4 column shop view, product pages with real photography
- **Accounts:** customers register to buy. Passwords are hashed with scrypt, and sign-in is rate limited
- **Database:** accounts, categories, products, per-size stock, orders and payments live in one SQLite file
- **Inventory:** stock is tracked per size and grouped by category. Sold-out sizes are disabled on the product page, and the database refuses to oversell
- **Back office:** owner and staff roles. The owner dashboard (revenue, charts, top products, low stock) is computed in SQL. Orders are paginated, and the inventory editor covers stock, price, category and visibility
- **Currency:** USD and BDT with a header toggle, locked at checkout
- **Payments:** hosted-style checkout with signed webhooks (details below)
- **Stylist:** an offline, rule-based shopping assistant for recommendations, sizing, stock and order tracking
- **Mobile:** designed for phones first (details below)

## Quick start

Requires Node 20.9 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
```

On first start the database is created at `data/alta.db` with the catalogue and, in development, demo accounts and two months of sample orders.

| Role | Email | Password |
|---|---|---|
| Owner | owner@alta.test | owner123 |
| Staff | staff@alta.test | staff123 |
| Customer | customer@alta.test | customer123 |

Payments run against a sandbox gateway, so use a test card such as `4242 4242 4242 4242` with any future expiry and any 3 digit code.

### Trying it on a phone

Put the phone on the same Wi-Fi as the computer and open the **Network** address that `npm run dev` prints, for example `http://192.168.1.20:3000`. The dev server accepts connections from private-network addresses (`192.168.*`, `10.*`, `172.*` and `*.local`) via `allowedDevOrigins` in `next.config.ts`. If you need another address, add it there; without it Next.js refuses the dev connection and the page loads but its buttons do nothing.

## Project structure

```
app/            Pages and API routes (storefront, /admin, /pay, /api/*)
components/     UI components (header, cart, product tiles, admin controls)
lib/db/         SQLite connection, migrations, seed data, first-run setup
lib/catalog.ts  Products, categories and stock queries (cached, stock read live)
lib/store.ts    Users, orders, payments and dashboard analytics
lib/payments/   Sandbox gateway, webhook signing and verification
scripts/        End-to-end test suites and the database backup tool
public/images/  Licensed photography (credits on /credits)
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm test` | 91 end-to-end checks; each suite gets an isolated server and database (run `npm run build` first) |
| `npm run db:backup` | Integrity-checked online backup of the database |

## Database

SQLite is one file with no database server to buy or secure, so the cheapest VPS or container host can run the shop. It is tuned for small servers: WAL mode, an 8 MB page cache, prepared statements, and indexes on every hot query.

Measured with 60,000 orders and 120,000 order lines (a 17 MB file):

| Page | Median response |
|---|---|
| Owner dashboard | ~50 ms |
| Admin orders (any page or filter) | 5 to 10 ms |
| Customer account, shop, product, home | 3 to 9 ms |

A running server uses roughly 140 to 270 MB of memory, so a 512 MB host is enough.

**Limit:** SQLite is a single-server database. It suits one VPS, Docker host, or a platform with a persistent disk. It does not suit serverless hosts such as Vercel, and one shop cannot be spread across several servers. Moving to PostgreSQL means replacing the queries in `lib/db`, `lib/catalog.ts` and `lib/store.ts`; nothing else touches SQL.

## Payments

Checkout hands the customer to a hosted payment page, and only a signed webhook can mark an order paid.

- The server prices the bag and reserves stock in a single transaction. The browser's prices are ignored
- Webhooks use an HMAC-SHA256 signature with a timestamp tolerance, and each event is applied once
- The charged amount and currency must match the stored session
- Unpaid checkouts expire after 15 minutes and release their stock
- Only a card's brand and last four digits are stored
- A production build refuses sandbox payments unless `ALLOW_DEMO_PAYMENTS=1`

The built-in gateway is a sandbox: it accepts only published test cards and moves no money. To take real payments, add one adapter in `lib/payments/` that creates a licensed gateway's hosted session and passes its verified events to `applyEvent()`. The order, stock, expiry and refund logic is reused.

## Mobile

Checked with touch emulation at 320, 360, 390 and 430 px wide, plus tablet and desktop widths, including the full journey from the menu to a paid order.

- The header shows Menu, the wordmark and Bag on phones; account links and the currency toggle live in the menu
- Product photos become a swipeable carousel, so the size picker sits under the first photo
- Form fields are 16 px so iPhones do not zoom on focus, and tap targets are at least 44 px
- Notches and home indicators are respected, and full-height sections use the dynamic viewport
- Admin tables become cards on small screens

Test on real iOS Safari and Android Chrome devices before launch; emulation is close but not identical.

## Deployment

Copy `.env.example` and set at least:

| Variable | Purpose |
|---|---|
| `AUTH_SECRET`, `PAYMENT_WEBHOOK_SECRET` | Required in production. Long random strings |
| `SITE_URL` | Public address, for canonical links and the sitemap |
| `DATABASE_PATH` | SQLite file location. Put it on a persistent disk |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Creates the first owner on a fresh database. Remove the password afterwards |
| `ALLOW_DEMO_PAYMENTS=1` | Public demo only. Leave unset on a real store |

A production database starts with the catalogue and the owner you name. Demo accounts and sample orders load only when `SEED_DEMO_DATA=1`.

```bash
docker build -t alta .
docker run -p 3000:3000 -v alta-data:/data \
  -e AUTH_SECRET=... -e PAYMENT_WEBHOOK_SECRET=... -e SITE_URL=https://your.domain \
  -e ADMIN_EMAIL=you@example.com -e ADMIN_PASSWORD=... alta
```

`GET /api/health` is the liveness probe. Back up with `npm run db:backup` on a schedule and copy the file off the server.

### Free hosting for demos

Most free platforms reset their filesystem, which wipes a SQLite file. That is acceptable for a demo, because the shop reseeds its sample data, but accounts and orders will not persist.

- **Render free web service:** works as a demo. It sleeps after 15 minutes of inactivity (about a minute to wake) and its filesystem resets on every restart. Set `SEED_DEMO_DATA=1` and `ALLOW_DEMO_PAYMENTS=1`
- **A free VM with a persistent disk** (for example Oracle Cloud Always Free) keeps data across restarts, but you manage the server yourself
- **Vercel and Netlify** are not suitable, because serverless instances cannot share a SQLite file

Free-tier terms change often, so check them before relying on one. For a live store, a small VPS is the reliable choice.

## Before taking real payments

- A live gateway adapter and merchant account
- Terms, privacy and returns pages for your jurisdiction, plus tax and shipping rules
- Order emails, password reset and email verification
- Two-factor sign-in for staff and owner accounts
- Error monitoring and an off-server copy of the backups
- Your own product photography

## Photography

All photographs are by independent photographers and used under the [Unsplash License](https://unsplash.com/license). Every photographer is credited on the `/credits` page. Replace them with your own photography for a live brand.

## License

MIT. See [LICENSE](LICENSE).
