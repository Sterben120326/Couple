# Couples Website

A personal website for couples to share notes and voice messages. Built with Node.js, Express, and MongoDB.

## Features
- Share notes between users
- Record and share voice messages
- Music player with favorite songs
- Timer display

## Live Demo
To set up the live version:

1. Deploy the backend to Render.com (free tier):
   - Sign up at render.com
   - Create a new Web Service
   - Connect your GitHub repository
   - Set the following:
     - Build Command: `npm install`
     - Start Command: `node server.js`
   - Add environment variable:
     - MONGODB_URI (from MongoDB Atlas)

2. Set up MongoDB Atlas (free tier):
   - Sign up at mongodb.com/cloud/atlas
   - Create a free cluster
   - Create a database user
   - Get your connection string
   - Add IP address 0.0.0.0/0 to allow access from anywhere

## Local Development
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   node server.js
   ```

3. Open index.html in your browser

## Environment Variables
Create a .env file with:
```
MONGODB_URI=your_mongodb_connection_string
PORT=3000
``` 