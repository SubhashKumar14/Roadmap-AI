const express = require('express');
const router = express.Router();
const aiRouter = require('../services/aiRouter');
const User = require('../models/User');
const Roadmap = require('../models/Roadmap');

// Generate roadmap
router.post('/generate-roadmap', async (req, res) => {
  try {
    const { topic, userId } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    // Get user's API keys if user is provided
    let userApiKeys = {};
    if (userId) {
      const user = await User.findOne({ clerkId: userId });
      if (user && user.apiKeys) {
        userApiKeys = user.apiKeys;
      }
    }

    // Generate roadmap using AI router
    const roadmap = await aiRouter.generateRoadmap(topic, userApiKeys);
    
    // Save to database if user is authenticated
    if (userId) {
      const user = await User.findOne({ clerkId: userId });
      if (user) {
        try {
          const newRoadmap = new Roadmap({
            ...roadmap,
            createdBy: user._id
          });
          await newRoadmap.save();
          console.log('✅ Roadmap saved to MongoDB:', newRoadmap._id);

          // Update user stats for real roadmap creation
          user.stats.experiencePoints += 50; // Bonus for creating roadmap
          user.stats.roadmapsCompleted = (user.stats.roadmapsCompleted || 0) + 1;
          const levelUp = user.updateLevel();
          await user.save();

          if (levelUp) {
            console.log('🎉 User leveled up to level:', user.stats.level);
          }

          roadmap._id = newRoadmap._id;
          console.log('💾 User stats updated for roadmap creation');
        } catch (dbError) {
          console.error('❌ Error saving roadmap to MongoDB:', dbError);
          // Continue without database save - roadmap still generated
        }
      } else {
        console.warn('⚠️ User not found for roadmap save:', userId);
      }
    } else {
      console.log('ℹ️ Anonymous roadmap generation - not saving to database');
    }

    res.json(roadmap);
  } catch (error) {
    console.error('Error generating roadmap:', error);
    res.status(500).json({ 
      error: 'Failed to generate roadmap',
      message: error.message 
    });
  }
});

// Chat with AI
router.post('/chat', async (req, res) => {
  try {
    const { message, context, userId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get user's API keys if user is provided
    let userApiKeys = {};
    if (userId) {
      const user = await User.findOne({ clerkId: userId });
      if (user && user.apiKeys) {
        userApiKeys = user.apiKeys;
      }
    }

    const response = await aiRouter.generateChatResponse(message, context || '', userApiKeys);
    
    res.json(response);
  } catch (error) {
    console.error('Error in AI chat:', error);
    res.status(500).json({ 
      error: 'Failed to get AI response',
      message: error.message 
    });
  }
});

// Get AI provider for topic
router.post('/classify-topic', async (req, res) => {
  try {
    const { topic } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const provider = aiRouter.classifyTopic(topic);
    
    res.json({ 
      topic,
      recommendedProvider: provider,
      explanation: `Based on the topic "${topic}", we recommend using ${provider.toUpperCase()} for the best results.`
    });
  } catch (error) {
    console.error('Error classifying topic:', error);
    res.status(500).json({ 
      error: 'Failed to classify topic',
      message: error.message 
    });
  }
});

// Suggest roadmap improvements
router.post('/improve-roadmap', async (req, res) => {
  try {
    const { roadmapId, userId, feedback } = req.body;
    
    if (!roadmapId) {
      return res.status(400).json({ error: 'Roadmap ID is required' });
    }

    const roadmap = await Roadmap.findOne({ id: roadmapId });
    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    // Get user's API keys
    let userApiKeys = {};
    if (userId) {
      const user = await User.findOne({ clerkId: userId });
      if (user && user.apiKeys) {
        userApiKeys = user.apiKeys;
      }
    }

    const improvementPrompt = `
    Analyze this learning roadmap and suggest improvements:
    
    Title: ${roadmap.title}
    Description: ${roadmap.description}
    Current Modules: ${roadmap.modules.length}
    
    User Feedback: ${feedback || 'No specific feedback provided'}
    
    Please provide specific suggestions for:
    1. Missing topics or skills
    2. Better resource recommendations
    3. Improved learning sequence
    4. Additional practical projects
    `;

    const response = await aiRouter.generateChatResponse(
      improvementPrompt, 
      'roadmap improvement', 
      userApiKeys
    );
    
    res.json({
      roadmapId,
      suggestions: response.response,
      provider: response.provider
    });
  } catch (error) {
    console.error('Error improving roadmap:', error);
    res.status(500).json({ 
      error: 'Failed to generate improvements',
      message: error.message 
    });
  }
});

module.exports = router;
