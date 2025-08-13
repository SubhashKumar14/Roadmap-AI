const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = '7d';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1] || req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// User registration
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().trim().escape()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email, password, name, profileImage } = req.body;

    console.log('Registration request:', { email, name });

    // Check if MongoDB is connected
    if (!req.mongoConnected) {
      console.log('MongoDB not connected, returning mock user data');
      const mockUser = {
        id: 'mock-' + Date.now(),
        email,
        name,
        profileImage,
        stats: {
          streak: 0,
          totalCompleted: 0,
          level: 1,
          experiencePoints: 0,
          weeklyGoal: 10,
          weeklyProgress: 0,
          roadmapsCompleted: 0,
          totalStudyTime: 0,
          globalRanking: 999999,
          attendedContests: 0,
          problemsSolved: {
            easy: 0,
            medium: 0,
            hard: 0,
            total: 0
          }
        },
        preferences: {
          emailNotifications: true,
          weeklyDigest: true,
          achievementAlerts: true,
          theme: 'light'
        }
      };
      const token = jwt.sign({ userId: mockUser.id, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      res.cookie('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });
      return res.json({ success: true, user: mockUser, token });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = new User({
      email,
      password: hashedPassword,
      name,
      profileImage,
      stats: {
        streak: 0,
        totalCompleted: 0,
        level: 1,
        experiencePoints: 0,
        weeklyGoal: 10,
        weeklyProgress: 0,
        roadmapsCompleted: 0,
        totalStudyTime: 0,
        globalRanking: 999999,
        attendedContests: 0,
        problemsSolved: {
          easy: 0,
          medium: 0,
          hard: 0,
          total: 0
        }
      },
      activeLearningDays: [],
      preferences: {
        emailNotifications: true,
        weeklyDigest: true,
        achievementAlerts: true,
        theme: 'light'
      }
    });

    await user.save();
    console.log('New user created:', user._id);

    // Create JWT token
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Set HTTP-only cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
        bio: user.bio,
        location: user.location,
        githubUsername: user.githubUsername,
        twitterUsername: user.twitterUsername,
        learningGoals: user.learningGoals,
        stats: user.stats,
        preferences: user.preferences
      },
      token
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  }
});

// User login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { email, password } = req.body;

    console.log('Login request:', { email });

    // Check if MongoDB is connected
    if (!req.mongoConnected) {
      console.log('MongoDB not connected, returning mock login');
      const mockUser = {
        id: 'mock-' + Date.now(),
        email,
        name: 'Demo User',
        stats: {
          streak: 5,
          totalCompleted: 12,
          level: 2,
          experiencePoints: 350,
          weeklyGoal: 10,
          weeklyProgress: 3,
          roadmapsCompleted: 1,
          totalStudyTime: 240,
          globalRanking: 1250,
          attendedContests: 2,
          problemsSolved: {
            easy: 8,
            medium: 3,
            hard: 1,
            total: 12
          }
        },
        preferences: {
          emailNotifications: true,
          weeklyDigest: true,
          achievementAlerts: true,
          theme: 'light'
        }
      };
      const token = jwt.sign({ userId: mockUser.id, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      res.cookie('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 });
      return res.json({ success: true, user: mockUser, token });
    }

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('User authenticated:', user.email);

    // Create JWT token
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Set HTTP-only cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
        bio: user.bio,
        location: user.location,
        githubUsername: user.githubUsername,
        twitterUsername: user.twitterUsername,
        learningGoals: user.learningGoals,
        stats: user.stats,
        preferences: user.preferences
      },
      token
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ error: 'Failed to login', details: error.message });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    if (!req.mongoConnected) {
      return res.status(401).json({ error: 'Database not available' });
    }

    const user = await User.findById(req.user.userId).select('-password -apiKeys');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
        bio: user.bio,
        location: user.location,
        githubUsername: user.githubUsername,
        twitterUsername: user.twitterUsername,
        learningGoals: user.learningGoals,
        stats: user.stats,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Legacy Clerk sync endpoint (for backward compatibility)
router.post('/sync', async (req, res) => {
  try {
    const { clerkId, email, name, profileImage } = req.body;

    console.log('Legacy Clerk sync request:', { clerkId, email, name });

    if (!clerkId || !email || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    res.json({
      success: true,
      message: 'Please use the new registration/login endpoints',
      redirectTo: '/auth/register'
    });
  } catch (error) {
    console.error('Error in legacy sync:', error);
    res.status(500).json({ error: 'Legacy endpoint, please use /auth/register' });
  }
});

// Get user profile by ID
router.get('/profile/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if requesting own profile or user has permission
    if (req.user.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await User.findById(userId).select('-password -apiKeys');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      profileImage: user.profileImage,
      bio: user.bio,
      location: user.location,
      githubUsername: user.githubUsername,
      twitterUsername: user.twitterUsername,
      learningGoals: user.learningGoals,
      stats: user.stats,
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;
