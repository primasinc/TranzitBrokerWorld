// @ts-ignore
import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { auth } from '../middleware/auth';
import { db } from '../index';
import { v4 as uuidv4 } from 'uuid';
import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

// Register route
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  ],
  async (req: Request, res: Response) => {
    try {
      const { email, username, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Create new user
      const user = new User({ email, username, password });
      await user.save();

      // Return user object and message (no JWT)
      res.status(201).json({
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          createdAt: user.createdAt,
        },
        message: 'User registered successfully'
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Login route
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').exists().withMessage('Password is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check password
      if (user.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Return user object and message (no JWT)
      res.json({
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          createdAt: user.createdAt,
        },
        message: 'Login successful'
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Helper to send invite email
async function sendInviteEmail(to: string, link: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'You are invited to join as a driver',
    html: `<p>You have been invited to join. Click <a href="${link}">here</a> to register.</p>`
  });
}

// Invite driver endpoint
router.post('/invite-driver', async (req, res) => {
  try {
    const { name, phone, email, companyName, companyRep, inviterId } = req.body;
    if (!name || !phone || !email || !companyName || !companyRep || !inviterId) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    const token = uuidv4();
    await db.collection('invites').doc(token).set({
      name, phone, email, companyName, companyRep, inviterId,
      createdAt: new Date(),
      used: false
    });
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?invite=${token}`;
    // Send invite email
    await sendInviteEmail(email, inviteLink);
    res.json({ success: true, inviteLink });
  } catch (err) {
    console.error('Error creating invite:', err);
    res.status(500).json({ error: 'Failed to create invite.' });
  }
});

// Fetch invite data endpoint
router.get('/invite/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const doc = await db.collection('invites').doc(token).get();
    if (!doc.exists || doc.data()?.used) {
      return res.status(404).json({ error: 'Invalid or expired invite.' });
    }
    res.json(doc.data());
  } catch (err) {
    console.error('Error fetching invite:', err);
    res.status(500).json({ error: 'Failed to fetch invite.' });
  }
});

// Mark invite as used endpoint
router.patch('/invite/:token/use', async (req, res) => {
  try {
    const { token } = req.params;
    const docRef = db.collection('invites').doc(token);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Invite not found.' });
    }
    await docRef.update({ used: true, usedAt: new Date() });
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking invite as used:', err);
    res.status(500).json({ error: 'Failed to mark invite as used.' });
  }
});

// 2FA: Send code endpoint
router.post('/send-2fa-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // Store in Firestore with 5-min TTL
    const expiresAt = Date.now() + 5 * 60 * 1000;
    await db.collection('twofa').doc(email).set({ code, expiresAt });
    // Send code via email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Your Tranzit.io 2FA Code',
      html: `<p>Your verification code is: <b>${code}</b><br>This code will expire in 5 minutes.</p>`
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Error sending 2FA code:', err);
    res.status(500).json({ error: 'Failed to send 2FA code.' });
  }
});

// 2FA: Verify code endpoint
router.post('/verify-2fa-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code required' });
    const doc = await db.collection('twofa').doc(email).get();
    if (!doc.exists) return res.status(400).json({ error: 'No code found. Please request a new code.' });
    const data = doc.data();
    if (!data) {
      return res.status(400).json({ error: 'No code found. Please request a new code.' });
    }
    if (data.expiresAt < Date.now()) {
      await db.collection('twofa').doc(email).delete();
      return res.status(400).json({ error: 'Code expired. Please request a new code.' });
    }
    if (data.code !== code) return res.status(400).json({ error: 'Invalid code.' });
    // Success: delete code
    await db.collection('twofa').doc(email).delete();
    res.json({ success: true });
  } catch (err) {
    console.error('Error verifying 2FA code:', err);
    res.status(500).json({ error: 'Failed to verify 2FA code.' });
  }
});

// QuickBooks OAuth callback route
router.get('/quickbooks/oauth-callback', async (req, res) => {
  const { code, state, realmId, error, error_description } = req.query;
  if (error) {
    console.error('QuickBooks OAuth error:', error, error_description);
    return res.status(400).send(`QuickBooks OAuth error: ${error}: ${error_description}`);
  }
  console.log('QuickBooks OAuth callback:', { code, state, realmId });
  // In production, exchange code for access token here
  res.send('QuickBooks OAuth successful! You can close this window.');
});

export default router;