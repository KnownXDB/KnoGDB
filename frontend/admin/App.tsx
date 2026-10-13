import { useEffect, useState, type FormEvent } from "react";
import {
  api,
  ApiError,
  errorMessage,
  type Game,
  type Localization,
} from "./api";
import { Assets } from "./Assets";

export function App() {
  const [authenticated, setAuthenticated] = useState(false),
    [games, setGames] = useState<Game[]>([]),
    [gameId, setGameId] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function load(signal?: AbortSignal) {
    const result = await api<{ data: Game[] }>("games", undefined, signal);
    setGames(result.data);
    setGameId((current) =>
      result.data.some((game) => game.id === current)
        ? current
        : (result.data[0]?.id ?? ""),
    );
  }
  useEffect(() => {
    const controller = new AbortController();
    void api("session", undefined, controller.signal)
      .then(() => load(controller.signal))
      .then(() => setAuthenticated(true))
      .catch((error) => {
        if (
          !controller.signal.aborted &&
          !(error instanceof ApiError && error.status === 401)
        )
          setMessage(errorMessage(error));
      });
    return () => controller.abort();
  }, []);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      values = new FormData(form);
    setBusy(true);
    setMessage("");
    try {
      await api("login", {
        email: values.get("email"),
        password: values.get("password"),
      });
      await load();
      setAuthenticated(true);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      (form.elements.namedItem("password") as HTMLInputElement).value = "";
      setBusy(false);
    }
  }
  const selected = games.find((game) => game.id === gameId);
  return (
    <main>
      {import.meta.env.DEV && (
        <p className="local-banner">
          LOCAL WORKSPACE · Temporary data · No connection to hosted services
        </p>
      )}
      <header>
        <p className="eyebrow">KNOWNGDB · DEVELOPMENT</p>
        <h1>Catalog administration</h1>
        <p>Manage titles, localized information and original assets.</p>
      </header>
      <p role="status" aria-live="polite">
        {message}
      </p>
      {!authenticated ? (
        <section>
          <h2>Administrator sign in</h2>
          <form onSubmit={login}>
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={1024}
              />
            </label>
            <button disabled={busy}>Sign in</button>
          </form>
        </section>
      ) : (
        <>
          <section>
            <div className="toolbar">
              <h2>Titles</h2>
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api("logout", {});
                    setAuthenticated(false);
                    setGames([]);
                  } catch (error) {
                    setMessage(errorMessage(error));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Sign out
              </button>
            </div>
            <div className="toolbar">
              <label>
                Title
                <select
                  aria-label="Asset title"
                  value={gameId}
                  onChange={(event) => setGameId(event.target.value)}
                >
                  <option value="">New title</option>
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.localizations.find((value) => value.is_primary)
                        ?.title ?? game.id}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={() => setGameId("")}>New title</button>
            </div>
            <details open={!selected}>
              <summary>Manage title information</summary>
              <TitleEditor
                key={gameId}
                game={selected}
                onSave={async (input) => {
                  const saved = await api<{ id: string }>("games", input);
                  await load();
                  setGameId(saved.id);
                  setMessage("Title saved.");
                }}
                onUnauthorized={() => setAuthenticated(false)}
              />
            </details>
          </section>
          {selected && (
            <Assets
              key={selected.id}
              game={selected}
              onUnauthorized={() => setAuthenticated(false)}
            />
          )}
        </>
      )}
      <footer>
        <a href="/">KnownGDB</a> · Development preview
      </footer>
    </main>
  );
}

function TitleEditor({
  game,
  onSave,
  onUnauthorized,
}: {
  game: Game | undefined;
  onSave: (input: unknown) => Promise<void>;
  onUnauthorized: () => void;
}) {
  const primary =
    game?.localizations.find((value) => value.is_primary) ??
    game?.localizations[0];
  const [localization, setLocalization] = useState<Localization>(
      primary ?? {
        language: "en",
        title: "",
        description: "",
        source_reference: "",
        confidence: 1,
        is_primary: true,
      },
    ),
    [status, setStatus] = useState(game?.status ?? "draft"),
    [approved, setApproved] = useState(
      primary?.moderation_status === "approved",
    ),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  function change<K extends keyof Localization>(
    key: K,
    value: Localization[K],
  ) {
    setLocalization((current) => ({ ...current, [key]: value }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await onSave({
        ...localization,
        id: game?.id,
        expected_updated_at: game?.updated_at,
        status,
        approved,
      });
      setMessage("Title saved.");
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status))
        onUnauthorized();
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <h3>{game ? "Edit title" : "New title"}</h3>
      {game && <p className="hint">Title ID: {game.id}</p>}
      {game && (
        <label>
          Existing translation
          <select
            value={localization.language}
            onChange={(event) => {
              const value = game.localizations.find(
                (item) => item.language === event.target.value,
              );
              if (value) {
                setLocalization(value);
                setApproved(value.moderation_status === "approved");
              }
            }}
          >
            {game.localizations.map((value) => (
              <option key={value.language}>{value.language}</option>
            ))}
            {!game.localizations.some(
              (value) => value.language === localization.language,
            ) && <option>{localization.language}</option>}
          </select>
        </label>
      )}
      <label>
        Language
        <input
          value={localization.language}
          onChange={(event) => change("language", event.target.value)}
          required
          maxLength={35}
        />
      </label>
      <label>
        Localized title
        <input
          value={localization.title}
          onChange={(event) => change("title", event.target.value)}
          required
          maxLength={300}
        />
      </label>
      <label>
        Description
        <textarea
          value={localization.description ?? ""}
          onChange={(event) => change("description", event.target.value)}
          rows={5}
          maxLength={20000}
        />
      </label>
      <label>
        Source reference
        <input
          value={localization.source_reference}
          onChange={(event) => change("source_reference", event.target.value)}
          required
          maxLength={2000}
        />
      </label>
      <label>
        Confidence (0–1)
        <input
          type="number"
          min={0}
          max={1}
          step={0.001}
          value={localization.confidence}
          onChange={(event) => change("confidence", Number(event.target.value))}
          required
        />
      </label>
      <label>
        Publication status
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={localization.is_primary}
          onChange={(event) => change("is_primary", event.target.checked)}
        />
        Primary language for this title
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={approved}
          onChange={(event) => setApproved(event.target.checked)}
        />
        I reviewed this translation and its source
      </label>
      <button disabled={busy}>Save title</button>
      <p role="status">{message}</p>
    </form>
  );
}
