import { Router, Request, Response } from 'express';

const router = Router();

router.get('/oauth/start', (req: Request, res: Response) => {
  const { provider } = req.query;
  let authUrl = '';
  let clientId = '';
  const redirectUri = 'http://localhost:3000/oauth/callback'; // Use your frontend URL in dev

  if (provider === 'Samsara') {
    clientId = process.env.SAMSARA_CLIENT_ID || '';
    authUrl = `https://cloud.samsara.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read_eld_data`;
  }
  // Add similar logic for Motive, Geotab, Verizon Connect, etc.

  if (!authUrl) {
    return res.status(400).send('Unknown provider');
  }
  res.redirect(authUrl);
});

export default router; 