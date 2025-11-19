import type { Request, Response } from 'express';
import { customAlphabet } from 'nanoid';
import db from '../db';
import { isValidCode, isValidUrl } from '../validators';

const nano = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);
const columns = 'code, target, clicks, last_clicked, created_at';

interface LinkRow {
  code: string;
  target: string;
  clicks: number;
  last_clicked: string | null;
  created_at: string;
}

type CreateLinkBody = {
  target?: string;
  code?: string;
};

export async function createLink(req: Request, res: Response): Promise<Response> {
  const { target, code } = (req.body ?? {}) as CreateLinkBody;

  if (!target) return res.status(400).json({ error: 'target is required' });
  if (!isValidUrl(target)) return res.status(400).json({ error: 'invalid target URL' });

  const trimmedCode = code ? code.trim() : '';
  if (trimmedCode) {
    if (!isValidCode(trimmedCode)) {
      return res.status(400).json({ error: 'code must match [A-Za-z0-9]{6,8}' });
    }
    try {
      await db.query(`INSERT INTO links (code, target) VALUES ($1, $2)`, [trimmedCode, target]);
      return res.status(201).json({ code: trimmedCode, target });
    } catch (err) {
      const pgError = err as { code?: string };
      if (pgError.code === '23505') return res.status(409).json({ error: 'code already exists' });
      throw err;
    }
  }

  for (let i = 0; i < 5; i += 1) {
    const generated = nano();
    try {
      await db.query(`INSERT INTO links (code, target) VALUES ($1, $2)`, [generated, target]);
      return res.status(201).json({ code: generated, target });
    } catch (err) {
      const pgError = err as { code?: string };
      if (pgError.code === '23505') continue;
      throw err;
    }
  }

  return res.status(500).json({ error: 'could not generate a unique short code' });
}

export async function listLinks(req: Request, res: Response): Promise<Response> {
  const { q } = req.query;
  const search = typeof q === 'string' ? q : undefined;

  if (search) {
    const like = `%${search}%`;
    const r = await db.query(
      `SELECT ${columns} FROM links WHERE code ILIKE $1 OR target ILIKE $1 ORDER BY created_at DESC`,
      [like]
    );
    return res.json(r.rows);
  }

  const r = await db.query(`SELECT ${columns} FROM links ORDER BY created_at DESC`);
  return res.json(r.rows);
}

export async function getLink(req: Request, res: Response): Promise<Response> {
  const { code } = req.params;
  const r = await db.query(`SELECT ${columns} FROM links WHERE code = $1`, [code]);
  if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
  return res.json(r.rows[0]);
}

export async function deleteLink(req: Request, res: Response): Promise<Response> {
  const { code } = req.params;
  const r = await db.query(`DELETE FROM links WHERE code = $1 RETURNING code`, [code]);
  if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
  return res.status(204).send();
}

export async function redirectHandler(req: Request, res: Response): Promise<void> {
  const { code } = req.params;
  const r = await db.query(
    `UPDATE links SET clicks = clicks + 1, last_clicked = now() WHERE code = $1 RETURNING target`,
    [code]
  );
  if (r.rowCount === 0) {
    res.status(404).send('Not found');
    return;
  }
  res.redirect(302, r.rows[0].target);
}
