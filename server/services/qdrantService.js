const { QdrantClient } = require('@qdrant/js-client-rest');

class QdrantService {
  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });
    this.collectionName = 'roadmap_embeddings';
  }

  async initializeCollection() {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        col => col.name === this.collectionName
      );

      if (!collectionExists) {
        // Create collection for roadmap embeddings
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 1536, // OpenAI text-embedding-ada-002 dimension
            distance: 'Cosine'
          }
        });
        console.log(`Qdrant collection "${this.collectionName}" created`);
      }
    } catch (error) {
      console.error('Error initializing Qdrant collection:', error);
    }
  }

  async addRoadmapEmbedding(roadmapId, title, description, embedding) {
    try {
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: roadmapId,
            vector: embedding,
            payload: {
              roadmapId,
              title,
              description,
              createdAt: new Date().toISOString()
            }
          }
        ]
      });
      console.log(`Embedding added for roadmap: ${roadmapId}`);
    } catch (error) {
      console.error('Error adding roadmap embedding:', error);
    }
  }

  async searchSimilarRoadmaps(queryEmbedding, limit = 5) {
    try {
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        limit,
        with_payload: true
      });

      return searchResult.map(result => ({
        roadmapId: result.payload.roadmapId,
        title: result.payload.title,
        description: result.payload.description,
        similarity: result.score
      }));
    } catch (error) {
      console.error('Error searching similar roadmaps:', error);
      return [];
    }
  }

  async deleteRoadmapEmbedding(roadmapId) {
    try {
      await this.client.delete(this.collectionName, {
        wait: true,
        points: [roadmapId]
      });
      console.log(`Embedding deleted for roadmap: ${roadmapId}`);
    } catch (error) {
      console.error('Error deleting roadmap embedding:', error);
    }
  }

  async getCollectionInfo() {
    try {
      const info = await this.client.getCollection(this.collectionName);
      return info;
    } catch (error) {
      console.error('Error getting collection info:', error);
      return null;
    }
  }
}

module.exports = new QdrantService();
