const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Create or update user (called when user signs up/signs in with Clerk)
router.post('/sync', async (req, res) => {
  try {
    const { clerkId, email, name, profileImage } = req.body;

    console.log('Auth sync request:', { clerkId, email, name });

    if (!clerkId || !email || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if MongoDB is connected
    if (!req.mongoConnected) {
      console.log('MongoDB not connected, returning mock user data');
      return res.json({
        success: true,
        user: {
          id: 'mock-' + clerkId,
          clerkId,
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
          }
        }
      });
    }

    let user = await User.findOne({ clerkId });

    if (user) {
      // Update existing user
      console.log('Updating existing user:', user.clerkId);
      user.email = email;
      user.name = name;
      if (profileImage) user.profileImage = profileImage;
      await user.save();
    } else {
      // Create new user
      console.log('Creating new user for clerkId:', clerkId);
      user = new User({
        clerkId,
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
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        clerkId: user.clerkId,
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
        stats: user.stats
      }
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Failed to sync user', details: error.message });
  }
});

// Get user profile
router.get('/profile/:clerkId', async (req, res) => {
  try {
    const { clerkId } = req.params;
    
    const user = await User.findOne({ clerkId }).select('-apiKeys');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;
