// redis-flush.js - A simple script to flush all Redis data
const { createClient } = require('redis');
const fs = require('fs');
const path = require('path');

// Manual dotenv-like functionality
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env.development.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = envContent.split('\n');
      
      envVars.forEach(line => {
        // Skip comments and empty lines
        if (!line || line.startsWith('#')) return;
        
        // Parse KEY=VALUE format
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || '';
          
          // Remove quotes if present
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          
          process.env[key] = value;
        }
      });
      
      console.log('Loaded environment variables from .env.development.local');
    } else {
      console.log('No .env.development.local file found');
    }
  } catch (err) {
    console.error('Error loading .env.development.local file:', err);
  }
}

async function flushRedis() {
  // Load environment variables
  loadEnv();
  
  if (!process.env.REDIS_URL) {
    console.error("ERROR: REDIS_URL environment variable is not set.");
    process.exit(1);
  }
  
  try {
    console.log("Connecting to Redis...");
    const client = createClient({ url: process.env.REDIS_URL });
    
    client.on('error', (err) => {
      console.error('Redis error:', err);
      process.exit(1);
    });
    
    await client.connect();
    console.log("Connected to Redis. Flushing all data...");
    
    const result = await client.sendCommand(['FLUSHALL']);
    console.log("Redis FLUSHALL result:", result);
    
    await client.disconnect();
    console.log("Disconnected from Redis. All data has been cleared.");
    
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

flushRedis();