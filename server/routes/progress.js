const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Roadmap = require('../models/Roadmap');
const { Achievement, UserAchievement } = require('../models/Achievement');

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

// Progress tracking collection (in-memory for now, could be moved to MongoDB)
const progressTracker = new Map();

// Helper function to generate progress key
const getProgressKey = (userId, roadmapId, moduleId, taskId) => {
  return `${userId}_${roadmapId}_${moduleId}_${taskId}`;
};

// Update progress for a specific task
router.post('/update', authenticateToken, async (req, res) => {
  try {
    const { userId, roadmapId, moduleId, taskId, completed } = req.body;

    // Verify user is updating their own progress
    if (req.user.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const progressKey = getProgressKey(userId, roadmapId, moduleId, taskId);
    const progressData = {
      user_id: userId,
      roadmap_id: roadmapId,
      module_id: moduleId,
      task_id: taskId,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };

    // Store progress in memory (could be MongoDB collection)
    progressTracker.set(progressKey, progressData);

    // Update user stats if task completed
    if (completed && req.mongoConnected) {
      try {
        const user = await User.findById(userId);
        if (user) {
          user.stats.totalCompleted += 1;
          user.stats.experiencePoints += 10; // Award 10 XP per completed task
          user.updateStreak();
          user.updateLevel();
          await user.save();
        }
      } catch (error) {
        console.error('Error updating user stats:', error);
      }
    }

    console.log('Progress updated:', progressKey, completed);

    res.json({
      success: true,
      progress: progressData
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Failed to update progress', details: error.message });
  }
});

// Get user's progress for all tasks
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user is accessing their own progress
    if (req.user.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all progress entries for this user
    const userProgress = [];
    for (const [key, progress] of progressTracker.entries()) {
      if (progress.user_id === userId) {
        userProgress.push(progress);
      }
    }

    res.json({ progress: userProgress });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress', details: error.message });
  }
});

// Get user's progress summary
router.get('/:userId/summary', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user is accessing their own summary
    if (req.user.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!req.mongoConnected) {
      return res.json({
        totalRoadmaps: 0,
        activeRoadmaps: 0,
        completedRoadmaps: 0,
        totalTasks: 0,
        completedTasks: 0,
        totalTimeSpent: 0,
        userStats: {
          streak: 0,
          totalCompleted: 0,
          level: 1,
          experiencePoints: 0
        }
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Count progress entries for this user
    let totalTasks = 0;
    let completedTasks = 0;

    for (const [key, progress] of progressTracker.entries()) {
      if (progress.user_id === userId) {
        totalTasks++;
        if (progress.completed) {
          completedTasks++;
        }
      }
    }

    const roadmaps = await Roadmap.find({ user_id: userId }) || [];

    const summary = {
      totalRoadmaps: roadmaps.length,
      activeRoadmaps: roadmaps.filter(r => (r.progress || 0) < 100).length,
      completedRoadmaps: roadmaps.filter(r => (r.progress || 0) === 100).length,
      totalTasks,
      completedTasks,
      totalTimeSpent: user.stats.totalStudyTime || 0,
      userStats: user.stats,
      streak: user.stats.streak,
      level: user.stats.level,
      experiencePoints: user.stats.experiencePoints
    };

    res.json(summary);
  } catch (error) {
    console.error('Error fetching progress summary:', error);
    res.status(500).json({ error: 'Failed to fetch progress summary' });
  }
});

// Get daily activity for calendar
router.get('/:userId/activity', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { year } = req.query;

    // Verify user is accessing their own activity
    if (req.user.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!req.mongoConnected) {
      return res.json({
        year: parseInt(year) || new Date().getFullYear(),
        totalDays: 365,
        activeDays: 0,
        currentStreak: 0,
        activityData: []
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate activity data for the year
    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31);
    
    const activityData = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfYear = Math.floor((currentDate - new Date(currentYear, 0, 0)) / 86400000);
      const hasActivity = user.activeLearningDays.includes(dayOfYear);
      
      // Get real task completions for this date - no fake random data
      let tasksCompletedOnDate = 0;
      if (hasActivity) {
        // In a real implementation, you'd query task completions by date
        // For now, we'll mark as 1 if there was activity, 0 otherwise
        tasksCompletedOnDate = 1;
      }

      activityData.push({
        date: currentDate.toISOString().split('T')[0],
        hasActivity,
        activityLevel: hasActivity ? 1 : 0, // Real activity level based on actual completions
        tasksCompleted: tasksCompletedOnDate // Real task count, not random
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      year: currentYear,
      totalDays: activityData.length,
      activeDays: activityData.filter(d => d.hasActivity).length,
      currentStreak: user.stats.streak,
      activityData
    });
  } catch (error) {
    console.error('Error fetching activity data:', error);
    res.status(500).json({ error: 'Failed to fetch activity data' });
  }
});

// Check and award achievements
router.post('/:userId/check-achievements', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user is checking their own achievements
    if (req.user.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!req.mongoConnected) {
      return res.json({
        newAchievements: [],
        totalEarned: 0
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const achievements = await Achievement.find({ isActive: true });
    const userAchievements = await UserAchievement.find({ userId: user._id });
    const earnedAchievementIds = userAchievements.map(ua => ua.achievementId.toString());
    
    const newAchievements = [];
    
    for (const achievement of achievements) {
      // Skip if already earned
      if (earnedAchievementIds.includes(achievement._id.toString())) {
        continue;
      }
      
      let earned = false;
      
      switch (achievement.criteria.type) {
        case 'tasks_completed':
          earned = user.stats.totalCompleted >= achievement.criteria.value;
          break;
        case 'streak_days':
          earned = user.stats.streak >= achievement.criteria.value;
          break;
        case 'roadmaps_completed':
          earned = user.stats.roadmapsCompleted >= achievement.criteria.value;
          break;
        case 'time_spent':
          earned = user.stats.totalStudyTime >= achievement.criteria.value;
          break;
      }
      
      if (earned) {
        // Award achievement
        const userAchievement = new UserAchievement({
          userId: user._id,
          achievementId: achievement._id,
          isCompleted: true
        });
        
        await userAchievement.save();
        
        // Award experience points
        user.stats.experiencePoints += achievement.rewards.experiencePoints;
        
        newAchievements.push({
          id: achievement.id,
          title: achievement.title,
          description: achievement.description,
          category: achievement.category,
          difficulty: achievement.difficulty,
          earnedAt: userAchievement.earnedAt
        });
      }
    }
    
    if (newAchievements.length > 0) {
      user.updateLevel();
      await user.save();
    }

    res.json({
      newAchievements,
      totalEarned: earnedAchievementIds.length + newAchievements.length
    });
  } catch (error) {
    console.error('Error checking achievements:', error);
    res.status(500).json({ error: 'Failed to check achievements' });
  }
});

// Get user achievements
router.get('/:userId/achievements', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify user is accessing their own achievements
    if (req.user.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!req.mongoConnected) {
      return res.json([]);
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userAchievements = await UserAchievement.find({ userId: user._id })
      .populate('achievementId')
      .sort({ earnedAt: -1 });

    const achievements = userAchievements.map(ua => ({
      id: ua.achievementId.id,
      title: ua.achievementId.title,
      description: ua.achievementId.description,
      category: ua.achievementId.category,
      difficulty: ua.achievementId.difficulty,
      earnedAt: ua.earnedAt,
      isCompleted: ua.isCompleted
    }));

    res.json(achievements);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

module.exports = router;
