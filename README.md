# Potomac — Property Rental Platform

A single-vertical property rental marketplace for short-term stays and long-term leases.

## Tech Stack

- **Framework:** Next.js 13 (App Router, Server Actions, TypeScript)
- **Database:** PostgreSQL 16 + PostGIS via Prisma 5
- **Auth:** NextAuth v4 (credentials + OAuth, JWT sessions)
- **Payments:** Stripe Connect (separate charges and transfers)
- **Media:** Cloudinary (unsigned client upload, signed server delete)
- **Styling:** Tailwind CSS 3, Poppins font
- **Testing:** Vitest (unit/integration), Playwright (E2E)

## Getting Started

1. Clone the repository.
2. Copy `.env.example` to `.env.local` and fill in required values.
3. Install dependencies: `npm install`
4. Set up the database: `npx prisma migrate dev`
5. Run the development server: `npm run dev`

## Project Structure

See `docs/project-status.md` for current implementation progress and `docs/architecture/` for architectural decisions.
