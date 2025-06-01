const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use('/', express.static(__dirname));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/ectend', express.static(path.join(__dirname, 'ectend')));

// Create uploads directory in the app directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// File to store voice mail metadata
const voiceMailsFile = path.join(__dirname, 'voicemails.json');
if (!fs.existsSync(voiceMailsFile)) {
    fs.writeFileSync(voiceMailsFile, '[]');
}

// File to store notes
const notesFile = path.join(__dirname, 'notes.json');
if (!fs.existsSync(notesFile)) {
    fs.writeFileSync(notesFile, '[]');
}

// Storage configuration for voice mails
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const filename = `${Date.now()}.webm`;
        cb(null, filename);
    }
});

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
        fileSize: 5 * 1024 * 1024 // Reduced to 5MB max file size
    }
});

// Helper functions for voice mail data
function getVoiceMails() {
    try {
        if (fs.existsSync(voiceMailsFile)) {
            const data = fs.readFileSync(voiceMailsFile, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Error reading voice mails:', error);
        return [];
    }
}

function saveVoiceMails(voiceMails) {
    try {
        fs.writeFileSync(voiceMailsFile, JSON.stringify(voiceMails, null, 2));
    } catch (error) {
        console.error('Error saving voice mails:', error);
        throw error;
    }
}

// Helper functions for notes
function getNotes() {
    try {
        if (fs.existsSync(notesFile)) {
            const data = fs.readFileSync(notesFile, 'utf8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        console.error('Error reading notes:', error);
        return [];
    }
}

function saveNotes(notes) {
    try {
        fs.writeFileSync(notesFile, JSON.stringify(notes, null, 2));
    } catch (error) {
        console.error('Error saving notes:', error);
        throw error;
    }
}

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Notes endpoints with logging
app.get('/api/notes', (req, res) => {
    console.log('GET /api/notes - Fetching notes');
    try {
        const notes = getNotes();
        console.log(`Found ${notes.length} notes`);
        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Error fetching notes' });
    }
});

app.post('/api/notes', (req, res) => {
    console.log('POST /api/notes - Adding new note');
    try {
        const { content } = req.body;
        console.log('Note content:', content);
        
        if (!content) {
            console.log('Error: Note content is missing');
            return res.status(400).json({ error: 'Note content is required' });
        }

        const notes = getNotes();
        const note = {
            id: Date.now().toString(),
            content,
            timestamp: new Date().toISOString()
        };

        notes.push(note);
        saveNotes(notes);
        console.log('Note saved successfully:', note.id);
        res.json(note);
    } catch (error) {
        console.error('Error saving note:', error);
        res.status(500).json({ error: 'Error saving note' });
    }
});

app.delete('/api/notes/:id', (req, res) => {
    console.log(`DELETE /api/notes/${req.params.id} - Deleting note`);
    try {
        const notes = getNotes();
        const updatedNotes = notes.filter(note => note.id !== req.params.id);
        saveNotes(updatedNotes);
        console.log('Note deleted successfully');
        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Error deleting note' });
    }
});

// Voice mail endpoints
app.post('/api/voicemails', upload.single('audio'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded' });
        }

        const voiceMails = getVoiceMails();
        const voiceMail = {
            id: Date.now().toString(),
            filename: req.file.filename,
            url: `/uploads/${req.file.filename}`,
            timestamp: new Date().toISOString()
        };

        // Keep only the last 10 voice mails to manage storage
        if (voiceMails.length >= 10) {
            const oldestVoiceMail = voiceMails[0];
            const oldFilePath = path.join(uploadsDir, oldestVoiceMail.filename);
            if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
            }
            voiceMails.shift();
        }

        voiceMails.push(voiceMail);
        saveVoiceMails(voiceMails);
        res.json(voiceMail);
    } catch (error) {
        console.error('Error saving voice mail:', error);
        res.status(500).json({ error: 'Error saving voice mail' });
    }
});

app.get('/api/voicemails', (req, res) => {
    try {
        const voiceMails = getVoiceMails();
        res.json(voiceMails);
    } catch (error) {
        console.error('Error fetching voice mails:', error);
        res.status(500).json({ error: 'Error fetching voice mails' });
    }
});

app.delete('/api/voicemails/:id', (req, res) => {
    try {
        const voiceMails = getVoiceMails();
        const voiceMail = voiceMails.find(vm => vm.id === req.params.id);

        if (!voiceMail) {
            return res.status(404).json({ error: 'Voice mail not found' });
        }

        // Delete the file
        const filePath = path.join(uploadsDir, voiceMail.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Update the voice mails list
        const updatedVoiceMails = voiceMails.filter(vm => vm.id !== req.params.id);
        saveVoiceMails(updatedVoiceMails);
        res.json({ message: 'Voice mail deleted successfully' });
    } catch (error) {
        console.error('Error deleting voice mail:', error);
        res.status(500).json({ error: 'Error deleting voice mail' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Notes file location:', notesFile);
    console.log('Voice mails file location:', voiceMailsFile);
}); 