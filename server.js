const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use('/', express.static(__dirname));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/ectend', express.static(path.join(__dirname, 'ectend')));

// Configure S3 client for render.com storage
const s3Client = new S3Client({
    region: 'us-east-1',
    credentials: {
        accessKeyId: process.env.RENDER_ACCESS_KEY || 'default',
        secretAccessKey: process.env.RENDER_SECRET_KEY || 'default'
    },
    endpoint: process.env.RENDER_S3_ENDPOINT || 'https://s3.render.com',
    forcePathStyle: true
});

const bucketName = process.env.RENDER_BUCKET_NAME || 'voice-mails';

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max file size
    }
});

// Helper functions for S3 storage
async function uploadToS3(buffer, filename) {
    try {
        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: filename,
            Body: buffer,
            ContentType: 'audio/webm'
        }));
        return `${process.env.RENDER_S3_ENDPOINT}/${bucketName}/${filename}`;
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw error;
    }
}

async function deleteFromS3(filename) {
    try {
        await s3Client.send(new DeleteObjectCommand({
            Bucket: bucketName,
            Key: filename
        }));
    } catch (error) {
        console.error('Error deleting from S3:', error);
        throw error;
    }
}

// Store voice mail metadata in memory (will persist as long as the server is running)
let voiceMails = [];

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/voicemails', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded' });
        }

        const filename = `${Date.now()}.webm`;
        const url = await uploadToS3(req.file.buffer, filename);

        const voiceMail = {
            id: Date.now().toString(),
            filename: filename,
            url: url,
            timestamp: new Date().toISOString()
        };

        voiceMails.push(voiceMail);
        res.json(voiceMail);
    } catch (error) {
        console.error('Error saving voice mail:', error);
        res.status(500).json({ error: 'Error saving voice mail' });
    }
});

app.get('/api/voicemails', (req, res) => {
    try {
        res.json(voiceMails);
    } catch (error) {
        console.error('Error fetching voice mails:', error);
        res.status(500).json({ error: 'Error fetching voice mails' });
    }
});

app.delete('/api/voicemails/:id', async (req, res) => {
    try {
        const voiceMail = voiceMails.find(vm => vm.id === req.params.id);

        if (!voiceMail) {
            return res.status(404).json({ error: 'Voice mail not found' });
        }

        // Delete from S3
        await deleteFromS3(voiceMail.filename);

        // Update the voice mails list
        voiceMails = voiceMails.filter(vm => vm.id !== req.params.id);
        res.json({ message: 'Voice mail deleted successfully' });
    } catch (error) {
        console.error('Error deleting voice mail:', error);
        res.status(500).json({ error: 'Error deleting voice mail' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 