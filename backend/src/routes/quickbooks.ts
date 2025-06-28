import { Router } from 'express';
const router = Router();

router.get('/oauth-callback', (req, res) => {
  const { code, state, realmId, error, error_description } = req.query;
  if (error) {
    console.error('QuickBooks OAuth error:', error, error_description);
    return res.status(400).send(`QuickBooks OAuth error: ${error}: ${error_description}`);
  }
  console.log('QuickBooks OAuth callback:', { code, state, realmId });
  res.send('QuickBooks OAuth successful! You can close this window.');
});

export default router; 