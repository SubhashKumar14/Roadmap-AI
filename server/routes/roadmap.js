const express = require('express');
const router = express.Router();
const Roadmap = require('../models/Roadmap');
const User = require('../models/User');

// Get all roadmaps for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const roadmaps = await Roadmap.find({ createdBy: user._id })
      .sort({ createdAt: -1 });
    
    res.json(roadmaps);
  } catch (error) {
    console.error('Error fetching user roadmaps:', error);
    res.status(500).json({ error: 'Failed to fetch roadmaps' });
  }
});

// Get a specific roadmap
router.get('/:roadmapId', async (req, res) => {
  try {
    const { roadmapId } = req.params;
    const roadmap = await Roadmap.findOne({ id: roadmapId })
      .populate('createdBy', 'name email profileImage');
    
    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    // Increment view count
    roadmap.views = (roadmap.views || 0) + 1;
    await roadmap.save();
    
    res.json(roadmap);
  } catch (error) {
    console.error('Error fetching roadmap:', error);
    res.status(500).json({ error: 'Failed to fetch roadmap' });
  }
});

// Update roadmap progress
router.put('/:roadmapId/progress', async (req, res) => {
  try {
    const { roadmapId } = req.params;
    const { moduleId, taskId, completed, timeSpent } = req.body;

    const roadmap = await Roadmap.findOne({ id: roadmapId });
    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    const module = roadmap.modules.find(m => m.id === moduleId);
    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const task = module.tasks.find(t => t.id === taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Update task
    const wasCompleted = task.completed;
    task.completed = completed;
    if (timeSpent) {
      task.timeSpent = (task.timeSpent || 0) + timeSpent;
    }

    if (completed && !wasCompleted) {
      task.completedAt = new Date();
    } else if (!completed && wasCompleted) {
      task.completedAt = null;
    }

    // Check if all tasks in module are completed
    const allTasksCompleted = module.tasks.every(t => t.completed);
    if (allTasksCompleted && !module.completed) {
      module.completed = true;
      module.completedAt = new Date();
    } else if (!allTasksCompleted && module.completed) {
      module.completed = false;
      module.completedAt = null;
    }

    // Update roadmap progress
    roadmap.calculateProgress();
    await roadmap.save();

    // Update user stats for real task completions/un-completions
    const user = await User.findById(roadmap.createdBy);
    if (user) {
      if (completed && !wasCompleted) {
        // Real task completion - increment stats
        user.stats.totalCompleted += 1;
        user.stats.weeklyProgress += 1;

        // Difficulty-based experience points
        const expGain = task.difficulty === 'Hard' ? 30 :
                       task.difficulty === 'Medium' ? 20 : 10;
        user.stats.experiencePoints += expGain;

        // Update problem counts based on difficulty
        const difficulty = task.difficulty?.toLowerCase() || 'easy';
        if (user.stats.problemsSolved[difficulty] !== undefined) {
          user.stats.problemsSolved[difficulty] += 1;
          user.stats.problemsSolved.total += 1;
        }

        user.updateStreak();
        const levelUp = user.updateLevel();
        await user.save();

        console.log('✅ Real task completion recorded:', {
          taskId,
          difficulty: task.difficulty,
          expGain,
          newTotal: user.stats.totalCompleted,
          levelUp
        });

      } else if (!completed && wasCompleted) {
        // Task unchecked - decrement stats
        user.stats.totalCompleted = Math.max(0, user.stats.totalCompleted - 1);
        user.stats.weeklyProgress = Math.max(0, user.stats.weeklyProgress - 1);

        // Remove experience points
        const expLoss = task.difficulty === 'Hard' ? 30 :
                       task.difficulty === 'Medium' ? 20 : 10;
        user.stats.experiencePoints = Math.max(0, user.stats.experiencePoints - expLoss);

        // Update problem counts
        const difficulty = task.difficulty?.toLowerCase() || 'easy';
        if (user.stats.problemsSolved[difficulty] !== undefined) {
          user.stats.problemsSolved[difficulty] = Math.max(0, user.stats.problemsSolved[difficulty] - 1);
          user.stats.problemsSolved.total = Math.max(0, user.stats.problemsSolved.total - 1);
        }

        user.updateLevel();
        await user.save();

        console.log('🔄 Task unchecked - stats decremented:', {
          taskId,
          difficulty: task.difficulty,
          expLoss,
          newTotal: user.stats.totalCompleted
        });
      }
    }

    res.json({ 
      success: true, 
      progress: roadmap.progress,
      moduleCompleted: module.completed
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Fork a roadmap
router.post('/:roadmapId/fork', async (req, res) => {
  try {
    const { roadmapId } = req.params;
    const { userId } = req.body;

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const originalRoadmap = await Roadmap.findOne({ id: roadmapId });
    if (!originalRoadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    // Create a copy of the roadmap
    const forkedRoadmap = new Roadmap({
      id: Math.random().toString(36).substr(2, 9),
      title: `${originalRoadmap.title} (Fork)`,
      description: originalRoadmap.description,
      difficulty: originalRoadmap.difficulty,
      aiProvider: originalRoadmap.aiProvider,
      estimatedDuration: originalRoadmap.estimatedDuration,
      modules: originalRoadmap.modules.map(module => ({
        ...module.toObject(),
        completed: false,
        completedAt: null,
        tasks: module.tasks.map(task => ({
          ...task.toObject(),
          completed: false,
          completedAt: null,
          timeSpent: 0
        }))
      })),
      createdBy: user._id,
      forkedFrom: originalRoadmap._id,
      progress: 0
    });

    await forkedRoadmap.save();

    // Update fork count on original
    originalRoadmap.forks = (originalRoadmap.forks || 0) + 1;
    await originalRoadmap.save();

    res.json(forkedRoadmap);
  } catch (error) {
    console.error('Error forking roadmap:', error);
    res.status(500).json({ error: 'Failed to fork roadmap' });
  }
});

// Get public roadmaps
router.get('/public/browse', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, difficulty } = req.query;
    
    const query = { isPublic: true };
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;

    const roadmaps = await Roadmap.find(query)
      .populate('createdBy', 'name profileImage')
      .sort({ likes: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Roadmap.countDocuments(query);

    res.json({
      roadmaps,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching public roadmaps:', error);
    res.status(500).json({ error: 'Failed to fetch public roadmaps' });
  }
});

// Toggle roadmap visibility
router.put('/:roadmapId/visibility', async (req, res) => {
  try {
    const { roadmapId } = req.params;
    const { isPublic } = req.body;

    const roadmap = await Roadmap.findOne({ id: roadmapId });
    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    roadmap.isPublic = isPublic;
    await roadmap.save();

    res.json({ success: true, isPublic: roadmap.isPublic });
  } catch (error) {
    console.error('Error updating roadmap visibility:', error);
    res.status(500).json({ error: 'Failed to update visibility' });
  }
});

// Like/unlike roadmap
router.post('/:roadmapId/like', async (req, res) => {
  try {
    const { roadmapId } = req.params;
    const { userId, action } = req.body; // action: 'like' or 'unlike'

    const roadmap = await Roadmap.findOne({ id: roadmapId });
    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    if (action === 'like') {
      roadmap.likes = (roadmap.likes || 0) + 1;
    } else if (action === 'unlike' && roadmap.likes > 0) {
      roadmap.likes -= 1;
    }

    await roadmap.save();

    res.json({ success: true, likes: roadmap.likes });
  } catch (error) {
    console.error('Error updating roadmap likes:', error);
    res.status(500).json({ error: 'Failed to update likes' });
  }
});

// Delete roadmap
router.delete('/:roadmapId', async (req, res) => {
  try {
    const { roadmapId } = req.params;
    const { userId } = req.body;

    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const roadmap = await Roadmap.findOne({ id: roadmapId, createdBy: user._id });
    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found or unauthorized' });
    }

    await Roadmap.deleteOne({ _id: roadmap._id });

    res.json({ success: true, message: 'Roadmap deleted successfully' });
  } catch (error) {
    console.error('Error deleting roadmap:', error);
    res.status(500).json({ error: 'Failed to delete roadmap' });
  }
});

module.exports = router;
