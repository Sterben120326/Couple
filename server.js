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

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

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
}); 