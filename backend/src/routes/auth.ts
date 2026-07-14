import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_flowchart_maker_token_key_12345';

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  try {
    const existingUser = await db.users.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await db.users.create({
      name,
      email,
      passwordHash
    });

    // Seed default sample flowchart for new user profile
    await db.flowcharts.create({
      userId: newUser.id,
      name: 'Sample Flowchart',
      data: {
        shapes: [
          {
            id: 'seed_shape_1',
            type: 'circle',
            x: 235,
            y: 50,
            width: 90,
            height: 90,
            fill: '#eff6ff',
            stroke: '#3b82f6',
            strokeWidth: 2,
            strokeDash: 'solid',
            text: 'Start',
            fontFamily: 'Inter',
            fontSize: 14,
            fontBold: true,
            fontItalic: false,
            fontUnderline: false,
            textColor: '#1e3a8a',
            textAlign: 'center'
          },
          {
            id: 'seed_shape_2',
            type: 'diamond',
            x: 230,
            y: 200,
            width: 100,
            height: 100,
            fill: '#fef3c7',
            stroke: '#d97706',
            strokeWidth: 2,
            strokeDash: 'solid',
            text: 'Is it working?',
            fontFamily: 'Inter',
            fontSize: 12,
            fontBold: false,
            fontItalic: false,
            fontUnderline: false,
            textColor: '#78350f',
            textAlign: 'center'
          },
          {
            id: 'seed_shape_3',
            type: 'rectangle',
            x: 415,
            y: 215,
            width: 120,
            height: 70,
            fill: '#fef2f2',
            stroke: '#ef4444',
            strokeWidth: 2,
            strokeDash: 'solid',
            text: 'Fix it!',
            fontFamily: 'Inter',
            fontSize: 14,
            fontBold: false,
            fontItalic: false,
            fontUnderline: false,
            textColor: '#7f1d1d',
            textAlign: 'center'
          },
          {
            id: 'seed_shape_4',
            type: 'rounded-rect',
            x: 220,
            y: 380,
            width: 120,
            height: 70,
            fill: '#f0fdf4',
            stroke: '#10b981',
            strokeWidth: 2,
            strokeDash: 'solid',
            text: 'Celebrate!',
            fontFamily: 'Inter',
            fontSize: 14,
            fontBold: true,
            fontItalic: false,
            fontUnderline: false,
            textColor: '#064e3b',
            textAlign: 'center'
          }
        ],
        connections: [
          {
            id: 'seed_conn_1',
            fromId: 'seed_shape_1',
            fromPort: 'bottom',
            toId: 'seed_shape_2',
            toPort: 'top',
            lineStyle: 'straight',
            stroke: '#64748b',
            strokeWidth: 2,
            strokeDash: 'solid',
            arrowHead: 'single'
          },
          {
            id: 'seed_conn_2',
            fromId: 'seed_shape_2',
            fromPort: 'right',
            toId: 'seed_shape_3',
            toPort: 'left',
            lineStyle: 'orthogonal',
            stroke: '#64748b',
            strokeWidth: 2,
            strokeDash: 'solid',
            arrowHead: 'single',
            label: 'No'
          },
          {
            id: 'seed_conn_3',
            fromId: 'seed_shape_2',
            fromPort: 'bottom',
            toId: 'seed_shape_4',
            toPort: 'top',
            lineStyle: 'orthogonal',
            stroke: '#64748b',
            strokeWidth: 2,
            strokeDash: 'solid',
            arrowHead: 'single',
            label: 'Yes'
          },
          {
            id: 'seed_conn_4',
            fromId: 'seed_shape_3',
            fromPort: 'top',
            toId: 'seed_shape_2',
            toPort: 'top',
            lineStyle: 'curved',
            stroke: '#ef4444',
            strokeWidth: 2,
            strokeDash: 'dashed',
            arrowHead: 'single'
          }
        ],
        zoom: 1.1,
        panOffset: { x: 50, y: 30 }
      }
    });

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      }
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    return res.status(500).json({ message: 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const user = await db.users.findByEmail(email);
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login' });
  }
});

export default router;
