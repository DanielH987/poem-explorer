// Run with: npm run seed (see package.json scripts below)
import 'dotenv/config';

const fetchFn: typeof fetch = (global as any).fetch;

async function main() {
  const base = "http://localhost:3000";
  const slug = "rain-song";
  const title = "Rain Song";
  const html =
    `<p>She sang in the rain.</p><p>The clouds were gentle, the night was kind.</p>`;
  const auth = Buffer.from(
    `${process.env.BASIC_AUTH_USER}:${process.env.BASIC_AUTH_PASS}`,
  ).toString("base64");

  const res = await fetchFn(`${base}/api/admin/import`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({ slug, title, html }),
  }).catch(() => null);

  console.log("Seed import status:", res?.status);
}

main().then(() => process.exit(0));
