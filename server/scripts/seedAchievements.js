require('dotenv').config();
const mongoose = require('mongoose');
const { Achievement } = require('../models/Achievement');

const achievements = [
  {
    id: 'first-steps',
    title: 'First Steps',
    description: 'Complete your first task',
    icon: 'Star',
    category: 'completion',
    difficulty: 'bronze',
    criteria: {
      type: 'tasks_completed',
      value: 1,
      timeframe: 'all_time'
    },
    rewards: {
      experiencePoints: 50,
      badge: 'first-steps',
      title: 'Beginner'
    },
    order: 1
  },
  {
    id: 'week-warrior',
    title: 'Week Warrior',
    description: 'Maintain a 7-day learning streak',
    icon: 'Flame',
    category: 'streak',
    difficulty: 'silver',
    criteria: {
      type: 'streak_days',
      value: 7,
      timeframe: 'all_time'
    },
    rewards: {
      experiencePoints: 100,
      badge: 'week-warrior',
      title: 'Dedicated Learner'
    },
    order: 2
  },
  {
    id: 'module-master',
    title: 'Module Master',
    description: 'Complete 5 learning modules',
    icon: 'Target',
    category: 'completion',
    difficulty: 'silver',
    criteria: {
      type: 'tasks_completed',
      value: 5,
      timeframe: 'all_time'
    },
    rewards: {
      experiencePoints: 75,
      badge: 'module-master',
      title: 'Module Expert'
    },
    order: 3
  },
  {
    id: 'road-runner',
    title: 'Road Runner',
    description: 'Complete your first roadmap',
    icon: 'Trophy',
    category: 'special',
    difficulty: 'gold',
    criteria: {
      type: 'roadmaps_completed',
      value: 1,
      timeframe: 'all_time'
    },
    rewards: {
      experiencePoints: 200,
      badge: 'road-runner',
      title: 'Roadmap Finisher'
    },
    order: 4
  },
  {
    id: 'marathon-runner',
    title: 'Marathon Runner',
    description: 'Maintain a 30-day learning streak',
    icon: 'Flame',
    category: 'streak',
    difficulty: 'gold',
    criteria: {
      type: 'streak_days',
      value: 30,
      timeframe: 'all_time'
    },
    rewards: {
      experiencePoints: 300,
      badge: 'marathon-runner',
      title: 'Marathon Learner'
    },
    order: 5
  },
  {
    id: 'speedster',
    title: 'Speedster',
    description: 'Complete 25 tasks',
    icon: 'Zap',
    category: 'completion',
    difficulty: 'gold',
    criteria: {
      type: 'tasks_completed',
      value: 25,
      timeframe: 'all_time'
    },
    rewards: {
      experiencePoints: 250,
      badge: 'speedster',
      title: 'Fast Learner'
    },
    order: 6
  },
  {
    id: 'century-club',
    title: 'Century Club',
    description: 'Complete 100 tasks',
    icon: 'Star',
    category: 'milestone',
    difficulty: 'platinum',
    criteria: {
      type: 'tasks_completed',
      value: 100,
      timeframe: 'all_time'
    },
    rewards: {
      experiencePoints: 500,
      badge: 'century-club',
      title: 'Centurion'
    },
    order: 7
  },
  {
    id: 'time-master',
    title: 'Time Master',
    description: 'Study for 100 hours total',
    icon: 'Clock',
    category: 'time',
    difficulty: 'platinum',
    criteria: {
      type: 'time_spent',
      value: 6000, // 100 hours in minutes
      timeframe: 'all_time'
    },
    rewards: {
      experiencePoints: 400,
      badge: 'time-master',
      title: 'Time Scholar'
    },
    order: 8
  }
];

async function seedAchievements() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing achievements
    await Achievement.deleteMany({});
    console.log('Cleared existing achievements');

    // Insert new achievements
    await Achievement.insertMany(achievements);
    console.log(`Seeded ${achievements.length} achievements`);

    console.log('Achievement seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding achievements:', error);
    process.exit(1);
  }
}

seedAchievements();
