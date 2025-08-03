const OpenAI = require('openai');
const axios = require('axios');
const youtubeService = require('./youtubeService');
const qdrantService = require('./qdrantService');

class AIRouter {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.topicClassifier = {
      // Technical/Programming topics → OpenAI
      openai: [
        'programming', 'coding', 'software', 'development', 'algorithm', 'data structure',
        'web development', 'frontend', 'backend', 'fullstack', 'javascript', 'python',
        'java', 'react', 'node', 'express', 'database', 'sql', 'mongodb', 'api',
        'framework', 'library', 'git', 'devops', 'cloud', 'aws', 'docker', 'kubernetes',
        'machine learning', 'ai', 'deep learning', 'neural network', 'tensorflow',
        'computer science', 'dsa', 'leetcode', 'system design', 'architecture'
      ],
      
      // Creative/Design topics → Gemini
      gemini: [
        'design', 'creative', 'art', 'drawing', 'painting', 'music', 'writing',
        'content creation', 'video editing', 'photography', 'graphic design',
        'ui design', 'ux design', 'animation', 'storytelling', 'marketing',
        'branding', 'social media', 'cooking', 'recipe', 'lifestyle', 'fitness',
        'health', 'wellness', 'meditation', 'yoga', 'travel', 'language learning'
      ],
      
      // Current/Research-based topics → Perplexity
      perplexity: [
        'news', 'current events', 'trends', 'market analysis', 'stock market',
        'cryptocurrency', 'blockchain', 'finance', 'economics', 'research',
        'academic', 'scientific', 'medical', 'healthcare', 'technology trends',
        'startup', 'business', 'entrepreneurship', 'industry analysis',
        'seo', 'digital marketing', 'analytics', 'growth hacking'
      ]
    };
  }

  classifyTopic(topic) {
    const topicLower = topic.toLowerCase();
    
    // Check for OpenAI keywords
    for (const keyword of this.topicClassifier.openai) {
      if (topicLower.includes(keyword)) {
        return 'openai';
      }
    }
    
    // Check for Gemini keywords
    for (const keyword of this.topicClassifier.gemini) {
      if (topicLower.includes(keyword)) {
        return 'gemini';
      }
    }
    
    // Check for Perplexity keywords
    for (const keyword of this.topicClassifier.perplexity) {
      if (topicLower.includes(keyword)) {
        return 'perplexity';
      }
    }
    
    // Default to OpenAI for unclassified topics
    return 'openai';
  }

  async generateRoadmap(topic, userApiKeys = {}) {
    const provider = this.classifyTopic(topic);
    console.log(`Routing topic "${topic}" to ${provider}`);
    
    try {
      switch (provider) {
        case 'openai':
          return await this.generateWithOpenAI(topic, userApiKeys.openai);
        case 'gemini':
          return await this.generateWithGemini(topic, userApiKeys.gemini);
        case 'perplexity':
          return await this.generateWithPerplexity(topic, userApiKeys.perplexity);
        default:
          return await this.generateWithOpenAI(topic, userApiKeys.openai);
      }
    } catch (error) {
      console.error(`Error with ${provider}:`, error.message);
      
      // Fallback logic
      if (provider !== 'openai') {
        console.log('Falling back to OpenAI...');
        try {
          return await this.generateWithOpenAI(topic, userApiKeys.openai);
        } catch (fallbackError) {
          console.error('Fallback to OpenAI failed:', fallbackError.message);
          throw new Error('All AI providers failed to generate roadmap');
        }
      } else {
        throw error;
      }
    }
  }

  async generateWithOpenAI(topic, userApiKey) {
    const apiKey = userApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({ apiKey });

    // Enhanced prompt for TUF Striver's A2Z DSA sheet format
    const prompt = `Create a comprehensive learning roadmap for: "${topic}" in TUF Striver's A2Z DSA sheet format.

Please structure your response as a JSON object with this exact format:
{
  "title": "Brief title for the roadmap",
  "description": "2-3 sentence description",
  "difficulty": "beginner|intermediate|advanced",
  "estimatedDuration": "X-Y weeks/months",
  "aiProvider": "openai",
  "category": "Category (DSA/Development/Design/etc)",
  "modules": [
    {
      "id": "1",
      "title": "Module title",
      "description": "Module description",
      "completed": false,
      "difficulty": "Easy|Medium|Hard",
      "estimatedTime": "X hours",
      "tasks": [
        {
          "id": "1-1",
          "title": "Task title",
          "completed": false,
          "difficulty": "Easy|Medium|Hard",
          "type": "Theory|Practice|Project",
          "estimatedTime": "X minutes",
          "description": "Detailed task description",
          "learningObjectives": ["Objective 1", "Objective 2"],
          "prerequisites": ["Prerequisite 1"],
          "resources": {
            "articles": ["Article title"],
            "documentation": ["Doc link"],
            "practice": ["Platform/Problem name"],
            "youtubeSearch": "search query for YouTube videos"
          }
        }
      ]
    }
  ]
}

Guidelines:
- For DSA topics: Include algorithm complexity, implementation patterns, common interview questions
- For Development: Include practical projects, frameworks, best practices
- For each task, provide specific YouTube search queries that will help find relevant educational videos
- Structure like Striver's A2Z DSA sheet with clear progression from Easy to Hard
- Include estimated time for each task and module
- Make it comprehensive with 6-10 modules and 4-8 tasks per module
- Focus on practical learning with hands-on exercises`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 3000
    });

    const content = completion.choices[0].message.content;

    try {
      let roadmap = JSON.parse(content);
      roadmap.id = this.generateId();
      roadmap.createdAt = new Date().toISOString();
      roadmap.progress = 0;

      // Enhance roadmap with YouTube videos
      roadmap = await this.enhanceWithYouTubeVideos(roadmap);

      // Store embedding in Qdrant for future similarity search
      try {
        const embedding = await this.generateEmbedding(roadmap.title + ' ' + roadmap.description);
        await qdrantService.addRoadmapEmbedding(
          roadmap.id,
          roadmap.title,
          roadmap.description,
          embedding
        );
        console.log('✅ OpenAI roadmap embedding saved to Qdrant');
      } catch (embeddingError) {
        console.warn('⚠️ Could not save OpenAI roadmap embedding to Qdrant:', embeddingError.message);
      }

      return roadmap;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid response format from OpenAI');
    }
  }

  async generateWithGemini(topic, userApiKey) {
    const apiKey = userApiKey || process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `Create a comprehensive learning roadmap for: "${topic}" with creative and practical approaches.

Please structure your response as a JSON object with this exact format:
{
  "title": "Brief title for the roadmap",
  "description": "2-3 sentence description",
  "difficulty": "beginner|intermediate|advanced",
  "estimatedDuration": "X-Y weeks/months",
  "aiProvider": "gemini",
  "category": "Category (Creative/Design/Development/etc)",
  "modules": [
    {
      "id": "1",
      "title": "Module title",
      "description": "Module description",
      "completed": false,
      "difficulty": "Easy|Medium|Hard",
      "estimatedTime": "X hours",
      "tasks": [
        {
          "id": "1-1",
          "title": "Task title",
          "completed": false,
          "difficulty": "Easy|Medium|Hard",
          "type": "Theory|Practice|Project|Creative",
          "estimatedTime": "X minutes",
          "description": "Detailed task description",
          "learningObjectives": ["Objective 1", "Objective 2"],
          "prerequisites": ["Prerequisite 1"],
          "resources": {
            "articles": ["Article title"],
            "tools": ["Tool name"],
            "practice": ["Exercise name"],
            "youtubeSearch": "search query for YouTube videos"
          }
        }
      ]
    }
  ]
}

Focus on creative and practical learning approaches with hands-on projects. Include 6-8 modules and 4-6 tasks per module.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        contents: [{
          parts: [{ text: prompt }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    const content = response.data.candidates[0].content.parts[0].text;

    try {
      let roadmap = JSON.parse(content);
      roadmap.id = this.generateId();
      roadmap.createdAt = new Date().toISOString();
      roadmap.progress = 0;

      // Enhance roadmap with YouTube videos
      roadmap = await this.enhanceWithYouTubeVideos(roadmap);

      // Store embedding in Qdrant for future similarity search
      try {
        const embedding = await this.generateEmbedding(roadmap.title + ' ' + roadmap.description);
        await qdrantService.addRoadmapEmbedding(
          roadmap.id,
          roadmap.title,
          roadmap.description,
          embedding
        );
        console.log('✅ Gemini roadmap embedding saved to Qdrant');
      } catch (embeddingError) {
        console.warn('⚠️ Could not save Gemini roadmap embedding to Qdrant:', embeddingError.message);
      }

      return roadmap;
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', content);
      throw new Error('Invalid response format from Gemini');
    }
  }

  async generateWithPerplexity(topic, userApiKey) {
    const apiKey = userApiKey || process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new Error('Perplexity API key not configured');
    }

    const prompt = `Create a comprehensive learning roadmap for: "${topic}" with the most current and up-to-date resources.

Please structure your response as a JSON object with this exact format:
{
  "title": "Brief title for the roadmap",
  "description": "2-3 sentence description",
  "difficulty": "beginner|intermediate|advanced",
  "estimatedDuration": "X-Y weeks/months",
  "aiProvider": "perplexity",
  "category": "Category",
  "modules": [
    {
      "id": "1",
      "title": "Module title",
      "description": "Module description",
      "completed": false,
      "difficulty": "Easy|Medium|Hard",
      "estimatedTime": "X hours",
      "tasks": [
        {
          "id": "1-1",
          "title": "Task title",
          "completed": false,
          "difficulty": "Easy|Medium|Hard",
          "type": "Theory|Practice|Research|Current",
          "estimatedTime": "X minutes",
          "description": "Detailed task description",
          "learningObjectives": ["Objective 1", "Objective 2"],
          "prerequisites": ["Prerequisite 1"],
          "resources": {
            "articles": ["Latest article title"],
            "trends": ["Current trend"],
            "research": ["Research paper/link"],
            "youtubeSearch": "search query for YouTube videos"
          }
        }
      ]
    }
  ]
}

Focus on current trends, latest tools, and up-to-date industry practices. Include 6-8 modules and 4-6 tasks per module.`;

    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;

    try {
      let roadmap = JSON.parse(content);
      roadmap.id = this.generateId();
      roadmap.createdAt = new Date().toISOString();
      roadmap.progress = 0;

      // Enhance roadmap with YouTube videos
      roadmap = await this.enhanceWithYouTubeVideos(roadmap);

      // Store embedding in Qdrant for future similarity search
      try {
        const embedding = await this.generateEmbedding(roadmap.title + ' ' + roadmap.description);
        await qdrantService.addRoadmapEmbedding(
          roadmap.id,
          roadmap.title,
          roadmap.description,
          embedding
        );
        console.log('✅ Perplexity roadmap embedding saved to Qdrant');
      } catch (embeddingError) {
        console.warn('⚠️ Could not save Perplexity roadmap embedding to Qdrant:', embeddingError.message);
      }

      return roadmap;
    } catch (parseError) {
      console.error('Failed to parse Perplexity response:', content);
      throw new Error('Invalid response format from Perplexity');
    }
  }

  async generateChatResponse(message, context, userApiKeys = {}) {
    const provider = this.classifyTopic(message);
    
    try {
      switch (provider) {
        case 'openai':
          return await this.chatWithOpenAI(message, context, userApiKeys.openai);
        case 'gemini':
          return await this.chatWithGemini(message, context, userApiKeys.gemini);
        case 'perplexity':
          return await this.chatWithPerplexity(message, context, userApiKeys.perplexity);
        default:
          return await this.chatWithOpenAI(message, context, userApiKeys.openai);
      }
    } catch (error) {
      console.error(`Error with ${provider}:`, error.message);
      throw error;
    }
  }

  async chatWithOpenAI(message, context, userApiKey) {
    const apiKey = userApiKey || process.env.OPENAI_API_KEY;
    const openai = new OpenAI({ apiKey });
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a helpful learning assistant. Provide clear, educational responses." },
        { role: "user", content: `Context: ${context}\n\nQuestion: ${message}` }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    return {
      response: completion.choices[0].message.content,
      provider: 'openai'
    };
  }

  async chatWithGemini(message, context, userApiKey) {
    const apiKey = userApiKey || process.env.GOOGLE_GEMINI_API_KEY;
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        contents: [{
          parts: [{ text: `Context: ${context}\n\nQuestion: ${message}` }]
        }]
      }
    );

    return {
      response: response.data.candidates[0].content.parts[0].text,
      provider: 'gemini'
    };
  }

  async chatWithPerplexity(message, context, userApiKey) {
    const apiKey = userApiKey || process.env.PERPLEXITY_API_KEY;
    
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          { role: 'system', content: 'You are a helpful learning assistant. Provide clear, educational responses with current information.' },
          { role: 'user', content: `Context: ${context}\n\nQuestion: ${message}` }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      response: response.data.choices[0].message.content,
      provider: 'perplexity'
    };
  }

  async enhanceWithYouTubeVideos(roadmap) {
    console.log('Enhancing roadmap with YouTube videos...');

    try {
      // Enhance each module's tasks with YouTube videos
      for (const module of roadmap.modules) {
        for (const task of module.tasks) {
          if (task.resources && task.resources.youtubeSearch) {
            console.log(`Searching YouTube for: ${task.resources.youtubeSearch}`);

            // Get YouTube videos for this task
            const videos = await youtubeService.getEducationalVideos(task.resources.youtubeSearch);

            if (videos.length > 0) {
              task.resources.videos = videos.map(video => ({
                title: video.title,
                url: video.url,
                thumbnail: video.thumbnail,
                channel: video.channelTitle,
                duration: 'Medium' // YouTube API doesn't provide duration in search
              }));

              // Remove the search query as it's no longer needed
              delete task.resources.youtubeSearch;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error enhancing with YouTube videos:', error);
      // Continue without YouTube enhancement if it fails
    }

    return roadmap;
  }

  async generateEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Return a default zero vector if embedding fails
      return Array(1536).fill(0);
    }
  }

  async findSimilarRoadmaps(topic) {
    try {
      const embedding = await this.generateEmbedding(topic);
      const similarRoadmaps = await qdrantService.searchSimilarRoadmaps(embedding, 3);
      return similarRoadmaps;
    } catch (error) {
      console.error('Error finding similar roadmaps:', error);
      return [];
    }
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
}

module.exports = new AIRouter();
