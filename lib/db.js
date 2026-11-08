
import mongoose from 'mongoose';
import dns from 'node:dns';

function applyDnsFix() {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1', '1.0.0.1']);
    if (dns.setDefaultResultOrder) {
      dns.setDefaultResultOrder('ipv4first');
    }
  } catch {
    // Ignore in environments where setServers is restricted
  }
}

// Ensure DNS servers are set to reliable public resolvers on initial load
applyDnsFix();

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDB() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error(
      'Please define the MONGODB_URI environment variable inside .env.local'
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    applyDnsFix();

    const opts = {
      bufferCommands: false,
      maxPoolSize: 5, // Lower maxPoolSize to prevent exhausting free tier limits
      maxIdleTimeMS: 10000, // Close idle connections quickly to free up resources
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = (async () => {
      try {
        return await mongoose.connect(MONGODB_URI, opts);
      } catch (err) {
        if (err?.message?.includes('querySrv') || err?.message?.includes('ECONNREFUSED')) {
          applyDnsFix();
          return await mongoose.connect(MONGODB_URI, opts);
        }
        throw err;
      }
    })().then((mongooseInstance) => {
      return mongooseInstance;
    }).catch(err => {
      cached.promise = null;
      throw err;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectToDB;
