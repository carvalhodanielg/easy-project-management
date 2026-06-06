import express from 'express';
import helmet from 'helmet';
import request from 'supertest';
import { helmetOptions } from './helmet.config';

describe('helmetOptions', () => {
  function buildApp() {
    const app = express();
    app.use(helmet(helmetOptions));
    app.get('/uploads/x.png', (_req, res) => res.send('binary'));
    return app;
  }

  it('allows attachments to be embedded cross-origin', async () => {
    // The SPA (localhost:5173) embeds <img src="localhost:3000/uploads/..">; the
    // default same-origin CORP would block that, showing a broken image.
    const res = await request(buildApp()).get('/uploads/x.png');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });
});
