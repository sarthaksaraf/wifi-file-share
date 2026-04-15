const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 8080;
const BASE_DIR = path.join(__dirname, '../channels');

// Create base folder
if (!fs.existsSync(BASE_DIR)) {
  fs.mkdirSync(BASE_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper
function getChannelPath(channelName) {
  const chanDir = path.join(BASE_DIR, channelName);
  const uploadDir = path.join(chanDir, 'uploads');
  if (!fs.existsSync(chanDir)) fs.mkdirSync(chanDir, { recursive: true });
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  return { chanDir, uploadDir };
}

// Default channel
getChannelPath('general');

// Multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { uploadDir } = getChannelPath(req.params.channel);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// Serve uploaded files
app.get('/api/channel/:channel/uploads/:filename', (req, res) => {
  const filePath = path.join(BASE_DIR, req.params.channel, 'uploads', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

// API Routes
app.get('/api/network-ip', (req, res) => {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return res.json({ ip: net.address });
      }
    }
  }
  res.json({ ip: '127.0.0.1' });
});
app.get('/api/channels', (req, res) => {
  const channels = fs.readdirSync(BASE_DIR)
    .filter(c => fs.statSync(path.join(BASE_DIR, c)).isDirectory())
    .sort();
  res.json(channels);
});

app.get('/api/channel/:channel', (req, res) => {
  const channel = req.params.channel;
  const { chanDir } = getChannelPath(channel);

  const notesFile = path.join(chanDir, 'notes.txt');
  let notes = fs.existsSync(notesFile) ? fs.readFileSync(notesFile, 'utf8') : '';

  const uploadDir = path.join(chanDir, 'uploads');
  const files = fs.existsSync(uploadDir)
    ? fs.readdirSync(uploadDir).filter(f => !f.startsWith('.'))
    : [];

  res.json({ notes, files });
});

app.post('/api/channel/:channel/save_text', (req, res) => {
  const { chanDir } = getChannelPath(req.params.channel);
  fs.writeFileSync(path.join(chanDir, 'notes.txt'), req.body.text_content || '');
  res.json({ success: true });
});

app.post('/api/channel/:channel/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ success: true });
});

app.delete('/api/channel/:channel/delete_file/:filename', (req, res) => {
  const filePath = path.join(BASE_DIR, req.params.channel, 'uploads', req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

app.post('/api/create_channel', (req, res) => {
  let name = (req.body.new_chan || '').trim().replace(/\s+/g, '_');
  if (name) {
    getChannelPath(name);
    res.json({ success: true, channel: name });
  } else {
    res.status(400).json({ error: 'Invalid name' });
  }
});

app.delete('/api/channel/:channel/delete', (req, res) => {
  if (req.params.channel === 'general') return res.status(400).json({ error: 'Cannot delete general' });
  const chanDir = path.join(BASE_DIR, req.params.channel);
  if (fs.existsSync(chanDir)) {
    fs.rmSync(chanDir, { recursive: true, force: true });
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Channel not found' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend running at http://0.0.0.0:${PORT}`);
  console.log(`   Open in browser → http://localhost:${PORT} (or your Mac/PC IP for WiFi sharing)`);
});