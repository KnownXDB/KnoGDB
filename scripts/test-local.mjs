import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep, basename } from "node:path";
import pg from "pg";
import sharp from "sharp";
import { startDatabase, localSigning, localOrigin } from "./local-services.mjs";
import { startAssets } from "./local-assets.mjs";
import { serviceHeaders } from "../dist/src/infrastructure/runtime-policy.js";
import { createApplication } from "../dist/src/api/application.js";
import { bucketHash } from "../dist/src/infrastructure/admin-gateway.js";

const instance = randomUUID(),
  email = `e2e-${instance}@example.invalid`,
  password = randomBytes(32).toString("base64url");
const directory = await mkdtemp(join(tmpdir(), "knowngdb-e2e-"));
let database,
  worker,
  client,
  actor,
  game,
  objectKey,
  stage = "startup";
try {
  database = await startDatabase();
  client = new pg.Client({ connectionString: database.databaseUrl });
  await client.connect();
  await client.query("insert into catalog.admin_allowlist(email) values($1)", [
    email,
  ]);
  const headers = {
    ...serviceHeaders(database.serviceKey, "local"),
    "Content-Type": "application/json",
  };
  assert.ok(database.publicKey);
  const anonymousHeaders = {
    apikey: database.publicKey,
    ...(database.publicKey.split(".").length === 3
      ? { Authorization: `Bearer ${database.publicKey}` }
      : {}),
  };
  const directRead = await fetch(
    `${database.projectUrl}/rest/v1/published_games`,
    { headers: anonymousHeaders },
  );
  assert.ok([401, 403].includes(directRead.status));
  assert.equal((await directRead.json()).code, "42501");
  stage = "local Auth account provisioning";
  const userResponse = await fetch(
    `${database.projectUrl}/auth/v1/admin/users`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ email, password, email_confirm: true }),
    },
  );
  assert.equal(userResponse.status, 200);
  actor = (await userResponse.json()).id;
  assert.ok(actor);
  const signing = localSigning();
  worker = await startAssets(signing.publicKey, {
    persist: directory,
    port: 0,
  });
  const fileOrigin = (await worker.ready).origin;
  const application = createApplication(
    {
      ...database,
      fileOrigin,
      signingKey: signing.privateKey,
      adminOrigin: localOrigin,
    },
    "local",
  );
  let cookie = "";
  const request = (path, body, origin = localOrigin) =>
    application(
      new Request(new URL(path, localOrigin), {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Cookie: cookie,
          ...(body === undefined
            ? {}
            : {
                Origin: origin,
                "Content-Type": "application/json",
                "X-KnownGDB-Action": "admin",
              }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      instance,
    );
  const prefix = "/admin/api/v1/admin/";
  stage = "authentication and authorization";
  assert.equal((await request(`${prefix}session`)).status, 401);
  assert.equal(
    (
      await request(
        `${prefix}login`,
        { email, password },
        "https://foreign.example",
      )
    ).status,
    403,
  );
  const login = await request(`${prefix}login`, { email, password });
  assert.equal(login.status, 200);
  const sessionCookie = login.headers.get("set-cookie");
  assert.match(sessionCookie, /Secure; HttpOnly; SameSite=Strict/);
  cookie = sessionCookie.split(";")[0];
  assert.equal((await request(`${prefix}session`)).status, 200);
  stage = "canonical title and publication";
  const save = await request(`${prefix}games`, {
    title: "Local integration title",
    language: "en",
    description: null,
    source_reference: "Local test fixture",
    confidence: 1,
    status: "published",
    is_primary: true,
    approved: true,
  });
  assert.equal(save.status, 200);
  game = (await save.json()).id;
  const catalog = await request("/api/v1/games?limit=100");
  assert.equal(catalog.status, 200);
  assert.ok((await catalog.json()).data.some((value) => value.id === game));
  stage = "original intake and checksum";
  const bytes = await sharp({
      create: { width: 73, height: 41, channels: 3, background: "#438c8e" },
    })
      .png()
      .toBuffer(),
    checksum = createHash("sha256").update(bytes).digest("hex");
  const metadata = {
    game_id: game,
    role: "logo",
    mime_type: "image/png",
    byte_size: bytes.length,
    checksum_sha256: checksum,
    language_kind: "global",
    language_tags: [],
    provenance: "official",
    source_reference: "Local test fixture",
    confidence: 1,
  };
  const prepare = await request(`${prefix}assets/prepare`, metadata);
  assert.equal(prepare.status, 200);
  const upload = await prepare.json();
  const intent = await client.query(
    "select object_key from catalog.asset_uploads where id=$1",
    [upload.id],
  );
  objectKey = intent.rows[0].object_key;
  const uploadHeaders = {
    Authorization: `Bearer ${upload.upload_grant}`,
    Origin: localOrigin,
    "Content-Type": "image/png",
  };
  assert.equal(
    (
      await fetch(upload.upload_url, {
        method: "PUT",
        headers: uploadHeaders,
        body: Buffer.alloc(bytes.length),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await fetch(upload.upload_url, {
        method: "PUT",
        headers: uploadHeaders,
        body: bytes,
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await fetch(upload.upload_url, {
        method: "PUT",
        headers: uploadHeaders,
        body: bytes,
      })
    ).status,
    409,
  );
  const complete = await request(`${prefix}assets/complete`, { id: upload.id });
  assert.equal(complete.status, 200);
  const unpublished = await request(`/api/v1/games/${game}/assets`);
  assert.equal((await unpublished.json()).data.length, 0);
  stage = "moderation, audit and original delivery";
  const decision = {
    game_id: game,
    ids: [upload.id],
    decision: "approved",
    publish: true,
    rights_reference: "",
    reason: "",
  };
  assert.equal(
    (await request(`${prefix}assets/review-batch`, decision)).status,
    400,
  );
  assert.equal(
    (
      await request(`${prefix}assets/review-batch`, {
        ...decision,
        rights_reference: "Local synthetic fixture rights",
      })
    ).status,
    200,
  );
  const published = await request(`/api/v1/games/${game}/assets`),
    listed = (await published.json()).data;
  assert.equal(listed.length, 1);
  assert.equal(listed[0].width, 73);
  const redirect = await request(`/api/v1/assets/${upload.id}/file`);
  assert.equal(redirect.status, 302);
  const downloaded = await fetch(redirect.headers.get("location"));
  assert.equal(downloaded.status, 200);
  assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), bytes);
  const audits = await client.query(
    "select count(*)::int as count from catalog.audit_events where actor_id=$1 and asset_id=$2",
    [actor, upload.id],
  );
  assert.ok(audits.rows[0].count >= 2);
  stage = "persistent storage and revocation";
  await worker.dispose();
  worker = await startAssets(signing.publicKey, {
    persist: directory,
    port: 0,
  });
  const bucket = (await worker.getBindings()).ASSETS;
  const retained = await bucket.get(objectKey);
  assert.ok(retained);
  assert.deepEqual(Buffer.from(await retained.arrayBuffer()), bytes);
  await client.query(
    "update catalog.admin_members set active=false where user_id=$1",
    [actor],
  );
  assert.equal((await request(`${prefix}session`)).status, 403);
  console.log(
    "Local integration passed: real Auth/session/CSRF, migrations, canonical title, private intake, checksum, immutable R2, rights, batch review, audit, original download, persistence and membership revocation.",
  );
} catch {
  console.error(
    `Local integration failed at: ${stage}. Credentials are not logged.`,
  );
  process.exitCode = 1;
} finally {
  if (client) {
    try {
      if (actor) {
        await client.query(
          "delete from catalog.audit_events where actor_id=$1",
          [actor],
        );
        await client.query(
          "delete from catalog.asset_uploads where actor_id=$1",
          [actor],
        );
      }
      if (game) {
        for (const table of ["assets", "game_localizations"])
          await client.query(`delete from catalog.${table} where game_id=$1`, [
            game,
          ]);
        await client.query("delete from catalog.games where id=$1", [game]);
      }
      if (actor) {
        await client.query(
          "delete from catalog.admin_members where user_id=$1",
          [actor],
        );
        await fetch(`${database.projectUrl}/auth/v1/admin/users/${actor}`, {
          method: "DELETE",
          headers: serviceHeaders(database.serviceKey, "local"),
        });
      }
      await client.query("delete from catalog.admin_allowlist where email=$1", [
        email,
      ]);
      await client.query(
        "delete from catalog.login_windows where bucket=any($1)",
        [[bucketHash(`ip:${instance}`), bucketHash(`email:${email}`)]],
      );
    } catch {
      console.error(
        "Local fixture cleanup needs inspection; no hosted data was touched.",
      );
      process.exitCode = 1;
    }
    await client.end();
  }
  if (worker) await worker.dispose();
  if (
    !resolve(directory).startsWith(resolve(tmpdir()) + sep) ||
    !basename(directory).startsWith("knowngdb-e2e-")
  )
    throw Error("Temporary fixture cleanup target refused.");
  await rm(directory, { recursive: true, force: true });
}
