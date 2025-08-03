const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

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

// Update user profile
router.put('/profile/:userId', authenticateToken, [
  body('name').optional().trim().escape(),
  body('bio').optional().trim(),
  body('location').optional().trim(),
  body('githubUsername').optional().trim(),
  body('twitterUsername').optional().trim(),
  body('learningGoals').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { userId } = req.params;
    
    // Check if updating own profile
    if (req.user.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!req.mongoConnected) {
      console.log('MongoDB not connected, returning mock profile update');
      return res.json({
        success: true,
        user: { id: userId, ...req.body }
      });
    }

    const updates = {};
    const allowedFields = ['name', 'bio', 'location', 'githubUsername', 'twitterUsername', 'learningGoals', 'profileImage'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password -apiKeys');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('Profile updated for user:', user.email);

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
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
});

// Update user preferences
router.put('/preferences/:userId', authenticateToken, [
  body('emailNotifications').optional().isBoolean(),
  body('weeklyDigest').optional().isBoolean(),
  body('achievementAlerts').optional().isBoolean(),
  body('theme').optional().isIn(['light', 'dark', 'system'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { userId } = req.params;
    
    if (req.user.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!req.mongoConnected) {
      console.log('MongoDB not connected, returning mock preferences update');
      return res.json({
        success: true,
        preferences: req.body
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update preferences
    Object.keys(req.body).forEach(key => {
      if (user.preferences[key] !== undefined) {
        user.preferences[key] = req.body[key];
      }
    });

    await user.save();

    res.json({
      success: true,
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences', details: error.message });
  }
});

// Update user stats
router.put('/stats/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!req.mongoConnected) {
      console.log('MongoDB not connected, returning mock stats update');
      return res.json({
        success: true,
        stats: req.body
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update stats
    Object.keys(req.body).forEach(key => {
      if (user.stats[key] !== undefined) {
        user.stats[key] = req.body[key];
      }
    });

    // Update streak if needed
    user.updateStreak();
    
    // Check for level up
    const leveledUp = user.updateLevel();
    
    await user.save();

    res.json({
      success: true,
      stats: user.stats,
      leveledUp
    });
  } catch (error) {
    console.error('Error updating stats:', error);
    res.status(500).json({ error: 'Failed to update stats', details: error.message });
  }
});

// Get user stats
router.get('/stats/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (req.user.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!req.mongoConnected) {
      console.log('MongoDB not connected, returning mock stats');
      return res.json({
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
        }
      });
    }

    const user = await User.findById(userId).select('stats');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ stats: user.stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
});

// Get user leaderboard ranking
router.get('/leaderboard', async (req, res) => {
  try {
    if (!req.mongoConnected) {
      return res.json({
        leaderboard: [
          { name: 'Demo User 1', experiencePoints: 1500, level: 5 },
          { name: 'Demo User 2', experiencePoints: 1200, level: 4 },
          { name: 'Demo User 3', experiencePoints: 1000, level: 3 }
        ]
      });
    }

    const topUsers = await User.find({})
      .select('name profileImage stats.experiencePoints stats.level')
      .sort({ 'stats.experiencePoints': -1 })
      .limit(10);

    const leaderboard = topUsers.map((user, index) => ({
      rank: index + 1,
      name: user.name,
      profileImage: user.profileImage,
      experiencePoints: user.stats.experiencePoints,
      level: user.stats.level
    }));

    res.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
