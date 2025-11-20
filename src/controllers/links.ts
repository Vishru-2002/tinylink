import { Request, Response } from "express";
import { customAlphabet } from "nanoid";
import db from "../db";
import { isValidCode, isValidUrl } from "../validators";

const nano = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  6
);

// ------------------------------------------------------------
// CREATE LINK
// ------------------------------------------------------------
export async function createLink(req: Request, res: Response) {
  const { target, code } = req.body ?? {};

  if (!target) return res.status(400).json({ error: "target is required" });
  if (!isValidUrl(target)) return res.status(400).json({ error: "invalid target URL" });

  // User provided a custom code
  if (code) {
    if (!isValidCode(code.trim())) {
      return res.status(400).json({ error: "code must match [A-Za-z0-9]{6,8}" });
    }

    try {
      await db.query(
        "INSERT INTO links (code, target) VALUES ($1, $2)",
        [code.trim(), target]
      );
      return res.status(201).json({ code: code.trim(), target });
    } catch (err: any) {
      if (err.code === "23505") {
        return res.status(409).json({ error: "code already exists" });
      }
      throw err;
    }
  }

  // Auto-generate a code
  for (let i = 0; i < 5; i++) {
    const gen = nano();
    try {
      await db.query("INSERT INTO links (code, target) VALUES ($1, $2)", [
        gen,
        target,
      ]);
      return res.status(201).json({ code: gen, target });
    } catch (err: any) {
      if (err.code === "23505") continue; // try again
      throw err;
    }
  }

  return res.status(500).json({ error: "could not generate unique code" });
}

// ------------------------------------------------------------
// LIST LINKS
// ------------------------------------------------------------
export async function listLinks(req: Request, res: Response) {
  const search = typeof req.query.q === "string" ? req.query.q : "";

  if (search) {
    const like = `%${search}%`;

    const result = await db.query(
      `SELECT code, target, clicks, last_clicked, created_at, del_status
       FROM links
       WHERE del_status = false
         AND (code ILIKE $1 OR target ILIKE $1)
       ORDER BY created_at DESC`,
      [like]
    );

    return res.json(result.rows);
  }

  const result = await db.query(
    `SELECT code, target, clicks, last_clicked, created_at, del_status
     FROM links
     WHERE del_status = false
     ORDER BY created_at DESC`
  );

  return res.json(result.rows);
}

// ------------------------------------------------------------
// GET SINGLE LINK (STATS PAGE)
// ------------------------------------------------------------
export async function getLink(req: Request, res: Response) {
  const { code } = req.params;

  const r = await db.query(
    `SELECT code, target, clicks, last_clicked, created_at, del_status
     FROM links
     WHERE code = $1 AND del_status = false`,
    [code]
  );

  if (r.rowCount === 0) {
    return res.status(404).json({ error: "not found" });
  }

  return res.json(r.rows[0]);
}

// ------------------------------------------------------------
// SOFT DELETE LINK
// ------------------------------------------------------------
export async function deleteLink(req: Request, res: Response) {
  const { code } = req.params;

  const r = await db.query(
    `UPDATE links
       SET del_status = true
     WHERE code = $1
       AND del_status = false
     RETURNING code`,
    [code]
  );

  if (r.rowCount === 0) {
    return res.status(404).json({ error: "not found or already deleted" });
  }

  return res.status(204).send();
}

// ------------------------------------------------------------
// REDIRECT HANDLER
// ------------------------------------------------------------
export async function redirectHandler(req: Request, res: Response) {
  const { code } = req.params;

  const r = await db.query(
    `UPDATE links
       SET clicks = clicks + 1,
           last_clicked = now()
     WHERE code = $1
       AND del_status = false
     RETURNING target`,
    [code]
  );

  if (r.rowCount === 0) {
    return res.status(404).send("Not found");
  }

  return res.redirect(302, r.rows[0].target);
}
