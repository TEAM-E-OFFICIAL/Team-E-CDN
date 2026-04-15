import express from 'express';
import multer from 'multer';
import bcrypt from 'bcrypt';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.body.folder || 'default';
    const folderPath = path.join(UPLOAD_DIR, folder);
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
    cb(null, folderPath);
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

// Create password-protected folder
app.post('/api/create-folder', async (req, res) => {
  const { folderName, password } = req.body;
  if (!folderName || !password) return res.status(400).json({ error: "Folder name and password required" });

  const folderPath = path.join(UPLOAD_DIR, folderName);
  if (fs.existsSync(folderPath)) return res.status(409).json({ error: "Folder already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  fs.mkdirSync(folderPath);

  // Save password hash
  fs.writeFileSync(path.join(folderPath, '.password'), hashedPassword);

  res.json({ success: true, folder: folderName });
});

// Upload file to folder
app.post('/api/upload', upload.single('file'), (req, res) => {
  const { folder, password } = req.body;
  if (!folder || !password) return res.status(400).json({ error: "Folder and password required" });

  const folderPath = path.join(UPLOAD_DIR, folder);
  if (!fs.existsSync(folderPath)) return res.status(404).json({ error: "Folder not found" });

  const hash = fs.readFileSync(path.join(folderPath, '.password'), 'utf-8');
  const valid = bcrypt.compareSync(password, hash);

  if (!valid) return res.status(401).json({ error: "Incorrect password" });

  res.json({
    success: true,
    filename: req.file.filename,
    url: `/uploads/${folder}/${req.file.filename}`
  });
});

// List files in folder (requires password)
app.post('/api/list', (req, res) => {
  const { folder, password } = req.body;
  const folderPath = path.join(UPLOAD_DIR, folder);

  if (!fs.existsSync(folderPath)) return res.status(404).json({ error: "Folder not found" });

  const hash = fs.readFileSync(path.join(folderPath, '.password'), 'utf-8');
  if (!bcrypt.compareSync(password, hash)) return res.status(401).json({ error: "Incorrect password" });

  const files = fs.readdirSync(folderPath)
    .filter(f => f !== '.password')
    .map(filename => ({
      name: filename,
      url: `/uploads/${folder}/${filename}`,
      size: fs.statSync(path.join(folderPath, filename)).size
    }));

  res.json({ files });
});

// Serve uploaded files
app.use('/uploads', express.static(UPLOAD_DIR));

app.listen(PORT, () => {
  console.log(`🚀 Team E CDN running on http://localhost:${PORT}`);
});
