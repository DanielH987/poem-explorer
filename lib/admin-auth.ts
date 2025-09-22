export function requireBasicAuth(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(auth.slice(6), "base64").toString();
  const [user, pass] = decoded.split(":");
  return (
    user === process.env.BASIC_AUTH_USER && pass === process.env.BASIC_AUTH_PASS
  );
}
