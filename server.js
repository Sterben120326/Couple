const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*' // Allow all origins for now, update this with your frontend URL in production
}));
app.use(express.json());
app.use(express.static('.'));

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/couples-website';
mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Models
const Note = mongoose.model('Note', {
    content: String,
    createdAt: { type: Date, default: Date.now }
});

const VoiceMail = mongoose.model('VoiceMail', {
    filename: String,
    createdAt: { type: Date, default: Date.now }
});

// Storage configuration for voice mails
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './public/uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/notes', async (req, res) => {
    try {
        const note = new Note({ content: req.body.content });
        await note.save();
        res.json(note);
    } catch (error) {
        console.error('Error saving note:', error);
        res.status(500).json({ error: 'Error saving note' });
    }
});

app.get('/api/notes', async (req, res) => {
    try {
        const notes = await Note.find().sort({ createdAt: -1 });
        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Error fetching notes' });
    }
});

app.delete('/api/notes/:id', async (req, res) => {
    try {
        await Note.findByIdAndDelete(req.params.id);
        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Error deleting note' });
    }
});

app.post('/api/voicemails', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded' });
        }
        const voiceMail = new VoiceMail({ filename: req.file.filename });
        await voiceMail.save();
        res.json(voiceMail);
    } catch (error) {
        console.error('Error saving voice mail:', error);
        res.status(500).json({ error: 'Error saving voice mail' });
    }
});

app.get('/api/voicemails', async (req, res) => {
    try {
        const voiceMails = await VoiceMail.find().sort({ createdAt: -1 });
        res.json(voiceMails);
    } catch (error) {
        console.error('Error fetching voice mails:', error);
        res.status(500).json({ error: 'Error fetching voice mails' });
    }
});

app.delete('/api/voicemails/:id', async (req, res) => {
    try {
        const voiceMail = await VoiceMail.findById(req.params.id);
        if (!voiceMail) {
            return res.status(404).json({ error: 'Voice mail not found' });
        }

        // Delete the file
        const filePath = path.join('./public/uploads', voiceMail.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete the database record
        await VoiceMail.findByIdAndDelete(req.params.id);
        res.json({ message: 'Voice mail deleted successfully' });
    } catch (error) {
        console.error('Error deleting voice mail:', error);
        res.status(500).json({ error: 'Error deleting voice mail' });
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
    console.log(`MongoDB URI: ${mongoUri}`);
}); 