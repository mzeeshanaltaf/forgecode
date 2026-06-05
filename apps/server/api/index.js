// Vercel serverless entry. Kept as a tiny, committed `.js` file so Vercel always
// detects a function here, and re-exports the Bun-built bundle. The bundle
// (dist/server.mjs) is produced by the build command in vercel.json — it inlines
// the whole TypeScript graph (routes, @forgecode/* workspace packages, the
// generated Prisma client) that Vercel's Node runtime can't execute on its own.
// `pg` and `@prisma/*` stay external inside the bundle and are traced from
// node_modules by Vercel. See README → "Deploying the server (Vercel)".
export { default } from "../dist/server.mjs";
