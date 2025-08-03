const axios = require('axios');

class YouTubeService {
  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY;
    this.baseUrl = 'https://www.googleapis.com/youtube/v3';
  }

  async searchVideos(query, maxResults = 5) {
    if (!this.apiKey) {
      console.error('YouTube API key not configured');
      return [];
    }

    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults,
          key: this.apiKey,
          order: 'relevance',
          videoDuration: 'medium', // 4-20 minutes
          videoDefinition: 'high',
          safeSearch: 'strict'
        }
      });

      return response.data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`
      }));
    } catch (error) {
      console.error('Error fetching YouTube videos:', error.message);
      return [];
    }
  }

  async getChannelVideos(channelId, maxResults = 10) {
    if (!this.apiKey) {
      return [];
    }

    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          part: 'snippet',
          channelId,
          type: 'video',
          maxResults,
          key: this.apiKey,
          order: 'relevance'
        }
      });

      return response.data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`
      }));
    } catch (error) {
      console.error('Error fetching channel videos:', error.message);
      return [];
    }
  }

  // Get educational videos for specific programming topics
  async getEducationalVideos(topic) {
    const queries = [
      `${topic} tutorial`,
      `${topic} explained`,
      `${topic} course`,
      `${topic} programming`,
      `${topic} coding`
    ];

    const allVideos = [];
    
    for (const query of queries) {
      const videos = await this.searchVideos(query, 2);
      allVideos.push(...videos);
    }

    // Remove duplicates and return top 5
    const uniqueVideos = allVideos.filter((video, index, self) => 
      index === self.findIndex(v => v.id === video.id)
    );

    return uniqueVideos.slice(0, 5);
  }

  // Get specific channel content (like Striver, Abdul Bari, etc.)
  async getFromEducationalChannels(topic) {
    const educationalChannels = {
      'striver': 'UCJskGeByzRRSvmOyZOz61ig', // Take U Forward
      'abdul_bari': 'UCZCFT11CWBi3MHNlGf019nw', // Abdul Bari
      'tushar_roy': 'UCZLJf_R2sWyUtXSKiKlyvAw', // Tushar Roy
      'mycodeschool': 'UClEEsT7DkdVO_fkrBw0OTrA', // MyCodeSchool
      'gfg': 'UC0RhatS1pyxInC00YKjjBqQ' // GeeksforGeeks
    };

    const videos = [];
    
    for (const [name, channelId] of Object.entries(educationalChannels)) {
      const channelVideos = await this.searchVideos(`${topic} site:youtube.com/channel/${channelId}`, 2);
      videos.push(...channelVideos);
    }

    return videos.slice(0, 3);
  }
}

module.exports = new YouTubeService();
