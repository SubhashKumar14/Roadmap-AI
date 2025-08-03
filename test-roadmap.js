// Simple test to verify roadmap generation is working
const axios = require('axios');

// Test direct AI API call (like the cloud environment does)
async function testRoadmapGeneration() {
  console.log('🧪 Testing roadmap generation...');
  
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
  
  const prompt = `Create a comprehensive learning roadmap for: "JavaScript Basics" in TUF Striver's A2Z DSA sheet format.

Please structure your response as a JSON object with this exact format:
{
  "title": "JavaScript Basics Learning Path",
  "description": "Complete guide to learning JavaScript fundamentals",
  "difficulty": "beginner",
  "estimatedDuration": "4-6 weeks",
  "aiProvider": "openai",
  "category": "Development",
  "modules": [
    {
      "id": "1",
      "title": "JavaScript Fundamentals",
      "description": "Learn the basics of JavaScript",
      "completed": false,
      "difficulty": "Easy",
      "estimatedTime": "8 hours",
      "tasks": [
        {
          "id": "1-1",
          "title": "Variables and Data Types",
          "completed": false,
          "difficulty": "Easy",
          "type": "Theory",
          "estimatedTime": "30 minutes",
          "description": "Learn about JavaScript variables and data types",
          "learningObjectives": ["Understand var, let, const", "Know primitive data types"],
          "prerequisites": ["Basic programming knowledge"],
          "resources": {
            "articles": ["MDN Variables Guide"],
            "documentation": ["JavaScript.info variables"],
            "practice": ["CodePen exercises"],
            "youtubeSearch": "JavaScript variables and data types tutorial"
          }
        }
      ]
    }
  ]
}`;

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const content = response.data.choices[0].message.content;
    console.log('✅ OpenAI Response received');
    
    try {
      const roadmap = JSON.parse(content);
      console.log('✅ Valid JSON roadmap generated');
      console.log('📋 Roadmap Title:', roadmap.title);
      console.log('📚 Modules Count:', roadmap.modules?.length || 0);
      console.log('🎯 AI Provider:', roadmap.aiProvider);
      
      if (roadmap.modules && roadmap.modules.length > 0) {
        console.log('📝 Sample Task:', roadmap.modules[0].tasks[0].title);
        console.log('🔍 Sample YouTube Search:', roadmap.modules[0].tasks[0].resources?.youtubeSearch);
      }
      
      return true;
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError.message);
      console.log('🔍 Raw content:', content.substring(0, 200) + '...');
      return false;
    }
    
  } catch (error) {
    console.error('❌ API Error:', error.response?.status, error.message);
    return false;
  }
}

// Run the test
testRoadmapGeneration().then(success => {
  if (success) {
    console.log('🎉 Roadmap generation test passed!');
  } else {
    console.log('💥 Roadmap generation test failed!');
  }
  process.exit(success ? 0 : 1);
});
