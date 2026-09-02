const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let memoryServer;

const connectDB = async () => {
  let mongoUri = process.env.MONGODB_URI;

  try {
    if (mongoUri) {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        autoIndex: true
      });
      console.log('MongoDB connected');
      return;
    }

    memoryServer = await MongoMemoryServer.create();
    mongoUri = memoryServer.getUri();
    await mongoose.connect(mongoUri, {
      dbName: 'notestudio'
    });
    console.log('MongoDB connected to in-memory server');
  } catch (error) {
    if (mongoUri && /127\.0\.0\.1|localhost/.test(mongoUri)) {
      console.warn('Local MongoDB not available, falling back to in-memory MongoDB.');
      try {
        memoryServer = await MongoMemoryServer.create();
        await mongoose.connect(memoryServer.getUri(), { dbName: 'notestudio' });
        console.log('MongoDB connected to in-memory server fallback');
        return;
      } catch (fallbackError) {
        console.error('MongoDB fallback error:', fallbackError.message);
      }
    }

    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
