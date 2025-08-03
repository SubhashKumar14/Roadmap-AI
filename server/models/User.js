const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  clerkId: {
    type: String,
    unique: true,
    sparse: true // Allow null values for non-Clerk users
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: function() {
      return !this.clerkId; // Password required only if not using Clerk
    },
    select: false // Don't include password in queries by default
  },
  name: {
    type: String,
    required: true
  },
  profileImage: String,
  bio: String,
  location: String,
  githubUsername: String,
  twitterUsername: String,
  learningGoals: [String],
  
  // API Keys (encrypted)
  apiKeys: {
    openai: String,
    gemini: String,
    perplexity: String
  },
  
  // User Stats
  stats: {
    streak: { type: Number, default: 0 },
    totalCompleted: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    experiencePoints: { type: Number, default: 0 },
    weeklyGoal: { type: Number, default: 10 },
    weeklyProgress: { type: Number, default: 0 },
    roadmapsCompleted: { type: Number, default: 0 },
    totalStudyTime: { type: Number, default: 0 },
    globalRanking: { type: Number, default: 999999 },
    attendedContests: { type: Number, default: 0 },
    problemsSolved: {
      easy: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      hard: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    }
  },
  
  // Activity tracking
  activeLearningDays: [Number], // Array of day numbers with activity
  lastActiveDate: Date,
  streakStartDate: Date,
  
  // Preferences
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    weeklyDigest: { type: Boolean, default: true },
    achievementAlerts: { type: Boolean, default: true },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'light' }
  }
}, {
  timestamps: true
});

// Update streak logic
userSchema.methods.updateStreak = function() {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  if (!this.lastActiveDate) {
    this.stats.streak = 1;
    this.streakStartDate = todayStart;
  } else {
    const lastActiveStart = new Date(
      this.lastActiveDate.getFullYear(),
      this.lastActiveDate.getMonth(),
      this.lastActiveDate.getDate()
    );
    
    const daysDiff = Math.floor((todayStart - lastActiveStart) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      // Consecutive day
      this.stats.streak += 1;
    } else if (daysDiff > 1) {
      // Streak broken
      this.stats.streak = 1;
      this.streakStartDate = todayStart;
    }
    // If daysDiff === 0, same day, no change to streak
  }
  
  this.lastActiveDate = today;
  
  // Add to active learning days
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  if (!this.activeLearningDays.includes(dayOfYear)) {
    this.activeLearningDays.push(dayOfYear);
  }
};

// Calculate level based on experience points
userSchema.methods.updateLevel = function() {
  const newLevel = Math.floor(this.stats.experiencePoints / 300) + 1;
  if (newLevel > this.stats.level) {
    this.stats.level = newLevel;
    return true; // Level up occurred
  }
  return false;
};

module.exports = mongoose.model('User', userSchema);
