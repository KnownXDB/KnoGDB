import { useEffect, useRef, useState } from "react";
import {
  api,
  ApiError,
  errorMessage,
  roleNames,
  type Asset,
  type Game,
  type Role,
} from "./api";

type Classification = "global" | "localized";
interface Queued {
  id: string;
  file: File;
  mime: string;
  role: Role | "";
  kind: Classification;
  tags: string;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
  uploadId?: string;
  stored?: boolean;
}
const references: Partial<Record<Role, readonly [number, number]>> = {
  header: [920, 430],
  capsule: [600, 900],
  hero: [3840, 1240],
  icon: [32, 32],
  client_icon: [256, 256],
};
const tags = (value: string) =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
const icoMime = "image/vnd.microsoft.icon";

function QueueThumbnail({ file, mime }: { file: File; mime: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!["image/png", "image/jpeg", icoMime].includes(mime)) return;
    const value = URL.createObjectURL(new Blob([file], { type: mime }));
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [file, mime]);
  return url ? <img src={url} alt="" /> : null;
}

export function Assets({
  game,
  onUnauthorized,
}: {
  game: Game;
  onUnauthorized: () => void;
}) {
  const [assets, setAssets] = useState<Asset[]>([]),
    [queue, setQueue] = useState<Queued[]>([]),
    [selected, setSelected] = useState<Set<string>>(new Set()),
    [kind, setKind] = useState<Classification>("localized"),
    [languages, setLanguages] = useState("en"),
    [source, setSource] = useState(
      game.localizations.find((value) => value.is_primary)?.source_reference ??
        "",
    ),
    [provenance, setProvenance] = useState("official"),
    [rights, setRights] = useState(""),
    [reason, setReason] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [original, setOriginal] = useState<{ asset: Asset; url: string } | null>(
      null,
    ),
    [previews, setPreviews] = useState<Record<string, string>>({});
  const dialog = useRef<HTMLDialogElement>(null),
    operation = useRef(false);
  function report(error: unknown) {
    if (error instanceof ApiError && [401, 403].includes(error.status))
      onUnauthorized();
    setMessage(errorMessage(error));
  }
  async function load(signal?: AbortSignal) {
    const result = await api<{ data: Asset[] }>(
      `assets?game_id=${game.id}`,
      undefined,
      signal,
    );
    setAssets(result.data);
  }
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch((error) => {
      if (!controller.signal.aborted) report(error);
    });
    return () => {
      controller.abort();
    };
  }, [game.id]);
  useEffect(() => {
    const controller = new AbortController(),
      urls = new Set<string>();
    let next = 0;
    setPreviews({});
    setOriginal(null);
    void Promise.all(
      Array.from({ length: Math.min(3, assets.length) }, async () => {
        while (next < assets.length && !controller.signal.aborted) {
          const asset = assets[next++]!;
          try {
            const grant = await api<{
              preview_url: string;
              preview_grant: string;
            }>(
              "assets/preview",
              { id: asset.id, game_id: game.id },
              controller.signal,
            );
            const response = await fetch(grant.preview_url, {
              headers: { Authorization: `Bearer ${grant.preview_grant}` },
              credentials: "omit",
              referrerPolicy: "no-referrer",
              signal: controller.signal,
            });
            if (!response.ok) throw Error("Preview unavailable");
            const blob = await response.blob();
            if (controller.signal.aborted) return;
            const url = URL.createObjectURL(blob);
            urls.add(url);
            setPreviews((current) => ({ ...current, [asset.id]: url }));
          } catch (error) {
            if (
              !controller.signal.aborted &&
              error instanceof ApiError &&
              [401, 403].includes(error.status)
            )
              onUnauthorized();
          }
        }
      }),
    );
    return () => {
      controller.abort();
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [assets, game.id]);
  useEffect(() => {
    if (original && !dialog.current?.open) dialog.current?.showModal();
    else if (!original) dialog.current?.close();
  }, [original]);
  function patch(id: string, change: Partial<Queued>) {
    setQueue((current) =>
      current.map((item) => (item.id === id ? { ...item, ...change } : item)),
    );
  }
  async function addFiles(files: File[]) {
    if (operation.current) return;
    if (queue.length + files.length > 30) {
      setMessage("Add up to 30 files per queue.");
      return;
    }
    operation.current = true;
    setBusy(true);
    try {
      const additions: Queued[] = [];
      for (const file of files) {
        const mime =
          file.name.toLowerCase().endsWith(".ico") ||
          ["image/x-icon", icoMime].includes(file.type)
            ? icoMime
            : file.type;
        const item: Queued = {
          id: crypto.randomUUID(),
          file,
          mime,
          role: "",
          kind,
          tags: kind === "global" ? "" : languages,
          status: "queued",
        };
        try {
          if (
            !["image/png", "image/jpeg", icoMime].includes(mime) ||
            !file.size ||
            file.size > 16 * 1024 * 1024
          )
            throw Error("Choose PNG, JPEG or ICO up to 16 MiB.");

          if (mime === icoMime) {
            const data = new DataView(await file.arrayBuffer());
            if (
              data.byteLength < 22 ||
              data.getUint16(0, true) !== 0 ||
              data.getUint16(2, true) !== 1
            )
              throw Error("Invalid ICO container.");
            const count = data.getUint16(4, true);
            if (count < 1 || count > 64 || 6 + count * 16 > data.byteLength)
              throw Error("Invalid ICO directory.");
            item.role = "client_icon";
          } else {
            const bitmap = await createImageBitmap(file);
            item.role =
              (Object.keys(references) as Role[]).find(
                (role) =>
                  references[role]?.[0] === bitmap.width &&
                  references[role]?.[1] === bitmap.height,
              ) ?? (file.name.toLowerCase().includes("logo") ? "logo" : "");
            bitmap.close();
          }
        } catch (error) {
          item.status = "error";
          item.error = errorMessage(error);
        }
        additions.push(item);
      }
      setQueue((current) => [...current, ...additions]);
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  async function upload() {
    if (operation.current) return;
    if (!source.trim()) {
      setMessage("Enter the source reference once for this set.");
      return;
    }
    if (!queue.length) {
      setMessage("Add files to the queue first.");
      return;
    }
    operation.current = true;
    setBusy(true);
    setMessage("");
    const uploaded: string[] = [];
    try {
      for (const item of queue) {
        if (item.status === "done") continue;
        try {
          if (!item.role) throw Error("Choose a role for this file.");
          if (item.kind === "localized" && !tags(item.tags).length)
            throw Error("Choose a language or Global.");
          if (item.mime === icoMime && item.role !== "client_icon")
            throw Error("ICO files are supported for Client Icon.");
          patch(item.id, { status: "uploading", error: undefined });
          let id = item.uploadId;
          if (!item.stored) {
            const bytes = await item.file.arrayBuffer(),
              checksum = Array.from(
                new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
                (byte) => byte.toString(16).padStart(2, "0"),
              ).join("");
            const prepared = await api<{
              id: string;
              upload_url: string;
              upload_grant: string;
            }>("assets/prepare", {
              game_id: game.id,
              role: item.role,
              mime_type: item.mime,
              byte_size: item.file.size,
              checksum_sha256: checksum,
              language_kind: item.kind,
              language_tags: item.kind === "global" ? [] : tags(item.tags),
              provenance,
              source_reference: source,
              confidence: 1,
            });
            id = prepared.id;
            patch(item.id, { uploadId: id });
            const response = await fetch(prepared.upload_url, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${prepared.upload_grant}`,
                "Content-Type": item.mime,
              },
              body: bytes,
              credentials: "omit",
              referrerPolicy: "no-referrer",
            });
            if (!response.ok && response.status !== 409)
              throw Error("Upload failed. Retry this file.");
            patch(item.id, { stored: true });
          }
          await api("assets/complete", { id });
          patch(item.id, { status: "done" });
          uploaded.push(id!);
        } catch (error) {
          patch(item.id, { status: "error", error: errorMessage(error) });
          if (error instanceof ApiError && [401, 403].includes(error.status)) {
            onUnauthorized();
            break;
          }
        }
      }
      await load();
      setSelected((current) => new Set([...current, ...uploaded]));
      setMessage(`${uploaded.length} originals uploaded. Review them below.`);
    } catch (error) {
      report(error);
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  async function review(decision: string, publish = false) {
    if (operation.current || !selected.size) return;
    if (publish && !rights.trim()) {
      setMessage(
        "Enter the distribution rights reference once for the selected assets.",
      );
      return;
    }
    operation.current = true;
    setBusy(true);
    try {
      const result = await api<{ ids: string[] }>("assets/review-batch", {
        game_id: game.id,
        ids: [...selected],
        decision,
        publish,
        rights_reference: rights,
        reason,
      });
      await load();
      setSelected(new Set());
      setMessage(
        `${result.ids.length} assets reviewed${publish ? " and published" : ""}.`,
      );
    } catch (error) {
      report(error);
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  return (
    <section>
      <h2>Title assets</h2>
      <p role="status" aria-live="polite">
        {message}
      </p>
      <details open>
        <summary>Add originals</summary>
        <div className="upload-defaults">
          <label>
            Language classification
            <select
              aria-label="Language classification"
              value={kind}
              disabled={busy}
              onChange={(event) => {
                const value = event.target.value as Classification;
                setKind(value);
                if (value === "global") setLanguages("");
              }}
            >
              <option value="localized">Localized</option>
              <option value="global">Global · no language</option>
            </select>
          </label>
          <label>
            Languages
            <input
              value={languages}
              disabled={busy || kind === "global"}
              onChange={(event) => setLanguages(event.target.value)}
              placeholder="en, es-419"
            />
          </label>
          <label>
            Provenance
            <select
              value={provenance}
              disabled={busy}
              onChange={(event) => setProvenance(event.target.value)}
            >
              <option value="official">Official</option>
              <option value="community">Community</option>
            </select>
          </label>
          <label>
            Source reference
            <input
              value={source}
              disabled={busy}
              onChange={(event) => setSource(event.target.value)}
              maxLength={2000}
            />
          </label>
        </div>
        <div
          id="drop-zone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void addFiles([...event.dataTransfer.files]);
          }}
        >
          <label className="file-picker">
            Choose multiple files
            <input
              type="file"
              aria-label="Choose multiple files"
              multiple
              disabled={busy}
              accept="image/png,image/jpeg,image/vnd.microsoft.icon,image/x-icon,.ico"
              onChange={(event) => {
                void addFiles([...(event.target.files ?? [])]);
                event.target.value = "";
              }}
            />
          </label>
          <span className="hint">
            or drop files here · PNG/JPEG · original ICO for Client Icon · 16
            MiB each
          </span>
        </div>
        <p className="hint">
          Dimensions are guidance only. Originals keep their actual size,
          margins and transparency.
        </p>
        <div className="upload-queue">
          {queue.map((item) => (
            <div className="queue-row" key={item.id}>
              <div className="queue-thumbnail">
                <QueueThumbnail file={item.file} mime={item.mime} />
              </div>
              <div>
                <strong>{item.file.name}</strong>
                <p className="hint">{(item.file.size / 1024).toFixed(1)} KiB</p>
              </div>
              <label>
                Role
                <select
                  aria-label={`Role for ${item.file.name}`}
                  value={item.role}
                  disabled={busy || item.stored || item.status === "done"}
                  onChange={(event) =>
                    patch(item.id, { role: event.target.value as Role })
                  }
                >
                  <option value="">Choose role</option>
                  {Object.entries(roleNames).map(([role, name]) => (
                    <option key={role} value={role}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Language
                <select
                  aria-label={`Classification for ${item.file.name}`}
                  value={item.kind}
                  disabled={busy || item.stored || item.status === "done"}
                  onChange={(event) =>
                    patch(item.id, {
                      kind: event.target.value as Classification,
                      ...(event.target.value === "global" ? { tags: "" } : {}),
                    })
                  }
                >
                  <option value="localized">Localized</option>
                  <option value="global">Global</option>
                </select>
                <input
                  aria-label={`Languages for ${item.file.name}`}
                  value={item.tags}
                  disabled={
                    busy ||
                    item.kind === "global" ||
                    item.stored ||
                    item.status === "done"
                  }
                  onChange={(event) =>
                    patch(item.id, { tags: event.target.value })
                  }
                />
              </label>
              <p
                role="status"
                className={item.status === "error" ? "error" : ""}
              >
                {item.error ??
                  {
                    queued: "Ready",
                    uploading: "Uploading…",
                    done: "Uploaded",
                    error: "Failed",
                  }[item.status]}
              </p>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => {
                  setQueue((current) =>
                    current.filter((value) => value.id !== item.id),
                  );
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="toolbar">
          <button disabled={busy} onClick={() => void upload()}>
            Upload queued files
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              setQueue((current) =>
                current.filter((item) => {
                  if (item.status !== "done") return true;
                  return false;
                }),
              )
            }
          >
            Clear completed
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() =>
              setQueue((current) =>
                current.map((item) =>
                  item.stored || item.status === "done"
                    ? item
                    : {
                        ...item,
                        kind,
                        tags: kind === "global" ? "" : languages,
                      },
                ),
              )
            }
          >
            Apply language to queue
          </button>
        </div>
      </details>
      <div className="toolbar">
        <div>
          <h3>Review originals</h3>
          <p>
            {assets.length} originals · {selected.size} selected
          </p>
        </div>
        <div>
          <button
            disabled={busy}
            onClick={() =>
              setSelected(new Set(assets.map((asset) => asset.id)))
            }
          >
            Select all
          </button>
          <button disabled={busy} onClick={() => void load().catch(report)}>
            Refresh
          </button>
        </div>
      </div>
      <div className="asset-grid">
        {!assets.length && (
          <p>No assets yet. Add your first originals above.</p>
        )}
        {assets.map((asset) => (
          <article
            className={`asset-card ${selected.has(asset.id) ? "selected" : ""}`}
            key={asset.id}
          >
            <div className="toolbar">
              <strong>{roleNames[asset.role]}</strong>
              <input
                type="checkbox"
                aria-label={`Select ${roleNames[asset.role]} ${asset.id}`}
                checked={selected.has(asset.id)}
                disabled={busy}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setSelected((current) => {
                    const next = new Set(current);
                    if (checked) next.add(asset.id);
                    else next.delete(asset.id);
                    return next;
                  });
                }}
              />
            </div>
            <button
              className="asset-thumbnail"
              disabled={!previews[asset.id]}
              aria-label={`Preview ${roleNames[asset.role]} ${asset.id}`}
              onClick={() => setOriginal({ asset, url: previews[asset.id]! })}
            >
              {previews[asset.id] ? (
                <img
                  src={previews[asset.id]}
                  alt={`${roleNames[asset.role]} original`}
                />
              ) : (
                <span>Preview loading or unavailable</span>
              )}
            </button>
            <p>
              {asset.language_kind === "global"
                ? "Global"
                : asset.language_tags.join(", ")}{" "}
              · {asset.provenance}
            </p>
            <p className="hint">
              {asset.moderation_status === "in_review"
                ? "Pending review"
                : asset.moderation_status}{" "}
              · {asset.publication_status}
            </p>
            <p className="hint">
              {asset.width} × {asset.height} ·{" "}
              {(asset.byte_size / 1024).toFixed(1)} KiB
            </p>
          </article>
        ))}
      </div>
      <div className="review-bar">
        <div className="toolbar">
          <strong>{selected.size} selected</strong>
          <button disabled={busy} onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
        </div>
        <label>
          Distribution rights reference
          <input
            value={rights}
            onChange={(event) => setRights(event.target.value)}
            disabled={busy}
            maxLength={4000}
            placeholder="Needed only to publish the selected assets"
          />
        </label>
        <details>
          <summary>Add a review note (optional)</summary>
          <textarea
            aria-label="Review reason (optional)"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={busy}
            maxLength={2000}
          />
        </details>
        <div className="review-actions">
          <button
            disabled={busy || !selected.size}
            onClick={() => void review("approved", true)}
          >
            Approve &amp; publish selected
          </button>
          <button
            disabled={busy || !selected.size}
            onClick={() => void review("approved")}
          >
            Approve privately
          </button>
          <button
            disabled={busy || !selected.size}
            onClick={() => void review("rejected")}
          >
            Reject selected
          </button>
          <button
            disabled={busy || !selected.size}
            onClick={() => void review("withdrawn")}
          >
            Withdraw selected
          </button>
        </div>
      </div>
      <dialog ref={dialog} onClose={() => setOriginal(null)}>
        <div className="toolbar">
          <strong>
            {original &&
              `${roleNames[original.asset.role]} · ${original.asset.width} × ${original.asset.height}`}
          </strong>
          <button onClick={() => setOriginal(null)}>Close preview</button>
        </div>
        {original && (
          <img src={original.url} alt="Original asset at full size" />
        )}
      </dialog>
    </section>
  );
}
