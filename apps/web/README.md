This is the **Support Ticket System** frontend (Next.js).

## Getting Started

1. Run the backend first (e.g. `bun run apps/backend/index.ts` from repo root) on port 3000.
2. Set `NEXT_PUBLIC_API_URL=http://localhost:3000` if the API is elsewhere (optional; default is `http://localhost:3000`).
3. Run the dev server:

```bash
bun dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser. The app runs on port 3001 so the backend can use 3000.

## Features

- **New ticket form**: Title (max 200), description, category/priority dropdowns. Description triggers LLM classification (debounced); suggestions pre-fill the dropdowns and can be overridden. Submit POSTs to `/api/tickets/`. Form clears on success and the new ticket appears in the list.
- **Ticket list**: Newest first; filters by category, priority, status; search in title and description. Click a ticket to change its status inline.
- **Stats**: Total tickets, open count, avg per day, priority and category breakdowns. Stats refresh when a new ticket is submitted.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
