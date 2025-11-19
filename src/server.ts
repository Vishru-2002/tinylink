import bodyParser from 'body-parser';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import asyncHandler from './middleware/asyncHandler';
import { createLink, deleteLink, getLink, listLinks, redirectHandler } from './controllers/links';


const app = express();
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, version: '1.0' });
});

app.post('/api/links', asyncHandler(createLink));
app.get('/api/links', asyncHandler(listLinks));
app.get('/api/links/:code', asyncHandler(getLink));
app.delete('/api/links/:code', asyncHandler(deleteLink));

app.get('/code/:code', (_req, res) => {
  res.sendFile(path.resolve(__dirname, '../public/code.html'));
});

app.get('/:code', asyncHandler(redirectHandler));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (!res.headersSent) res.status(500).json({ error: 'internal server error' });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`TinyLink running on port ${port}`));

export default app;
