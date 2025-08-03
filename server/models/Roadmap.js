const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: Date,
  resources: [String],
  notes: String,
  timeSpent: { type: Number, default: 0 }, // in minutes
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' }
});

const moduleSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  completed: { type: Boolean, default: false },
  completedAt: Date,
  tasks: [taskSchema],
  estimatedTime: Number, // in hours
  prerequisites: [String]
});

const roadmapSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  difficulty: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced'], 
    default: 'intermediate' 
  },
  aiProvider: { 
    type: String, 
    enum: ['openai', 'gemini', 'perplexity'], 
    required: true 
  },
  estimatedDuration: String,
  progress: { type: Number, default: 0 },
  modules: [moduleSchema],
  
  // User who created this roadmap
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Metadata
  category: String,
  tags: [String],
  isPublic: { type: Boolean, default: false },
  isTemplate: { type: Boolean, default: false },
  likes: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  forks: { type: Number, default: 0 },
  
  // Forked from another roadmap
  forkedFrom: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Roadmap' 
  },
  
  // Analytics
  analytics: {
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    totalTimeSpent: { type: Number, default: 0 },
    averageTaskTime: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Calculate progress when tasks are updated
roadmapSchema.methods.calculateProgress = function() {
  let totalTasks = 0;
  let completedTasks = 0;
  let totalTimeSpent = 0;
  
  this.modules.forEach(module => {
    module.tasks.forEach(task => {
      totalTasks++;
      if (task.completed) {
        completedTasks++;
      }
      totalTimeSpent += task.timeSpent || 0;
    });
  });
  
  this.progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  // Update analytics
  this.analytics.totalTasks = totalTasks;
  this.analytics.completedTasks = completedTasks;
  this.analytics.totalTimeSpent = totalTimeSpent;
  this.analytics.averageTaskTime = completedTasks > 0 ? totalTimeSpent / completedTasks : 0;
  this.analytics.completionRate = this.progress;
  
  return this.progress;
};

// Mark a task as completed
roadmapSchema.methods.completeTask = function(moduleId, taskId) {
  const module = this.modules.find(m => m.id === moduleId);
  if (!module) return false;
  
  const task = module.tasks.find(t => t.id === taskId);
  if (!task) return false;
  
  task.completed = true;
  task.completedAt = new Date();
  
  // Check if all tasks in module are completed
  const allTasksCompleted = module.tasks.every(t => t.completed);
  if (allTasksCompleted && !module.completed) {
    module.completed = true;
    module.completedAt = new Date();
  }
  
  this.calculateProgress();
  return true;
};

// Get roadmap statistics
roadmapSchema.methods.getStats = function() {
  const stats = {
    totalModules: this.modules.length,
    completedModules: this.modules.filter(m => m.completed).length,
    totalTasks: 0,
    completedTasks: 0,
    progress: this.progress,
    estimatedTimeRemaining: 0
  };
  
  this.modules.forEach(module => {
    stats.totalTasks += module.tasks.length;
    stats.completedTasks += module.tasks.filter(t => t.completed).length;
    
    if (!module.completed && module.estimatedTime) {
      stats.estimatedTimeRemaining += module.estimatedTime;
    }
  });
  
  return stats;
};

module.exports = mongoose.model('Roadmap', roadmapSchema);
