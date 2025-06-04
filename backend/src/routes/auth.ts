// @ts-ignore
import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { auth } from '../middleware/auth';

const router = Router();

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

export default router;