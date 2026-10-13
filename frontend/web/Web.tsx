export function Web() {
  return (
    <main>
      <h1>KnownGDB</h1>
      <p>
        Development service. Public catalog access and title administration are
        available for validation.
      </p>
      <p>
        <a href="/api/v1/health">API health</a> ·{" "}
        <a href="/api/v1/games">Published titles API</a> ·{" "}
        <a href="/admin/">Administration</a>
      </p>
    </main>
  );
}
