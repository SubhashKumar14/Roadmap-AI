const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  icon: String,
  category: { 
    type: String, 
    enum: ['completion', 'streak', 'special', 'milestone', 'time'], 
    required: true 
  },
  difficulty: { 
    type: String, 
    enum: ['bronze', 'silver', 'gold', 'platinum'], 
    default: 'bronze' 
  },
  
  // Criteria for earning this achievement
  criteria: {
    type: { 
      type: String, 
      enum: ['tasks_completed', 'streak_days', 'roadmaps_completed', 'time_spent', 'consecutive_days'], 
      required: true 
    },
    value: { type: Number, required: true },
    timeframe: String // e.g., 'daily', 'weekly', 'monthly', 'all_time'
  },
  
  // Rewards
  rewards: {
    experiencePoints: { type: Number, default: 0 },
    badge: String,
    title: String
  },
  
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, {
  timestamps: true
});

// User Achievement (earned achievements)
const userAchievementSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  achievementId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Achievement', 
    required: true 
  },
  earnedAt: { type: Date, default: Date.now },
  progress: { type: Number, default: 0 }, // For partially completed achievements
  isCompleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Compound index to prevent duplicate user achievements
userAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });

const Achievement = mongoose.model('Achievement', achievementSchema);
const UserAchievement = mongoose.model('UserAchievement', userAchievementSchema);

module.exports = { Achievement, UserAchievement };
