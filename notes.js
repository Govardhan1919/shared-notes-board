import { put, list, del } from "@vercel/blob";

const IDS = ["b1", "b2", "b3", "b4"];
const MAX = 20000;
const pad = (n) => String(n).padStart(15, "0");

async function listAll(prefix) {
  let cursor, blobs = [];
  do {
    const r = await list({ prefix, cursor, limit: 1000 });
    blobs.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return blobs;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      const blobs = await listAll("notes/");
      const latest = {};
      for (const b of blobs) {
        const id = b.pathname.split("/")[1];
        if (IDS.includes(id) && (!latest[id] || b.pathname > latest[id].pathname)) latest[id] = b;
      }
      const out = {};
      await Promise.all(IDS.map(async (id) => {
        if (!latest[id]) return;
        const r = await fetch(latest[id].url);
        if (r.ok) out[id] = await r.json();
      }));
      return res.status(200).json(out);
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const { id, text } = body;
      if (!IDS.includes(id) || typeof text !== "string" || text.length > MAX) {
        return res.status(400).json({ error: "Invalid note" });
      }
      const ts = Date.now();
      await put(`notes/${id}/${pad(ts)}.json`, JSON.stringify({ text, updatedAt: ts }), {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      });
      const old = (await listAll(`notes/${id}/`)).filter((b) => {
        const t = parseInt(b.pathname.split("/")[2], 10);
        return t < ts - 60000;
      });
      if (old.length) await del(old.map((b) => b.url));
      return res.status(200).json({ ok: true, updatedAt: ts });
    }

    if (req.method === "DELETE") {
      const id = req.query && req.query.id;
      if (!IDS.includes(id)) return res.status(400).json({ error: "Invalid note" });
      const all = await listAll(`notes/${id}/`);
      if (all.length) await del(all.map((b) => b.url));
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
}
