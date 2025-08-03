const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Update user profile
router.put('/profile/:clerkId', async (req, res) => {
  try {
    const { clerkId } = req.params;
    const updates = req.body;

    const user = await User.findOne({ clerkId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update allowed fields
    const allowedFields = ['name', 'bio', 'location', 'githubUsername', 'twitterUsername', 'learningGoals', 'preferences'];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        user[field] = updates[field];
      }
    });

    await user.save();

    res.json({ 
      success: true, 
      user: user.toObject()
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update API keys
router.put('/api-keys/:clerkId', async (req, res) => {
  try {
    const { clerkId } = req.params;
    const { provider, apiKey } = req.body;

    if (!provider || !apiKey) {
      return res.status(400).json({ error: 'Provider and API key are required' });
    }

    const validProviders = ['openai', 'gemini', 'perplexity'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const user = await User.findOne({ clerkId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // In production, you should encrypt the API key
    if (!user.apiKeys) {
      user.apiKeys = {};
    }
    user.apiKeys[provider] = apiKey;
    
    await user.save();

    res.json({ 
      success: true, 
      message: `${provider} API key updated successfully` 
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

// Get user stats
router.get('/stats/:clerkId', async (req, res) => {
  try {
    const { clerkId } = req.params;

    console.log('Fetching stats for user:', clerkId);

    const user = await User.findOne({ clerkId });
    if (!user) {
      console.log('User not found for clerkId:', clerkId);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('User stats found:', user.stats);

    res.json({
      stats: user.stats || {
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
      activeLearningDays: user.activeLearningDays || [],
      lastActiveDate: user.lastActiveDate,
      streakStartDate: user.streakStartDate
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
});

// Update user activity (for streak tracking)
router.post('/activity/:clerkId', async (req, res) => {
  try {
    const { clerkId } = req.params;
    const { activityType, value } = req.body;

    const user = await User.findOne({ clerkId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update streak
    user.updateStreak();

    // Update activity-specific stats
    switch (activityType) {
      case 'task_completed':
        user.stats.totalCompleted += 1;
        user.stats.weeklyProgress += 1;
        user.stats.experiencePoints += value || 10;
        break;
      case 'roadmap_completed':
        user.stats.roadmapsCompleted += 1;
        user.stats.experiencePoints += 100;
        break;
      case 'study_time':
        user.stats.totalStudyTime += value || 0;
        break;
    }

    // Check for level up
    const leveledUp = user.updateLevel();
    
    await user.save();

    res.json({ 
      success: true, 
      stats: user.stats,
      leveledUp,
      streak: user.stats.streak
    });
  } catch (error) {
    console.error('Error updating user activity:', error);
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { type = 'xp', limit = 10 } = req.query;
    
    let sortField;
    switch (type) {
      case 'streak':
        sortField = 'stats.streak';
        break;
      case 'completed':
        sortField = 'stats.totalCompleted';
        break;
      case 'level':
        sortField = 'stats.level';
        break;
      default:
        sortField = 'stats.experiencePoints';
    }

    const users = await User.find({})
      .select('name profileImage stats')
      .sort({ [sortField]: -1 })
      .limit(parseInt(limit))
      .exec();

    res.json(users);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
