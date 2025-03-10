// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// RUTER
import clearDataRouter from "./api/clearData.js";
import saveDataRouter from "./api/saveData.js";
import chatRouter from "./api/chat.js"; 

dotenv.config();

const app = express();
const corsOptions = {
  origin: "http://localhost:3000",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: "Content-Type,Authorization",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json()); // 🚨 VIKTIG! Uten dette kan ikke Express lese JSON-body

// Hvis du ikke bruker openai direkte i server.js kan du fjerne dette:
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Sørg for at "data/"-mappen eksisterer
if (!fs.existsSync("data")) {
  fs.mkdirSync("data");
}

// Tømmer/oppretter userData.json ved serverstart (om du ønsker)
const filePath = path.join("data", "userData.json");
if (fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, "[]", "utf-8");
  console.log("✅ userData.json tømt ved serverstart");
} else {
  fs.writeFileSync(filePath, "[]", "utf-8");
  console.log("✅ userData.json opprettet og tømt ved serverstart");
}

// Rute for å tømme userData.json
app.post('/api/clearData', (req, res) => {
  fs.writeFileSync(filePath, "[]", "utf-8");
  res.json({ message: 'userData.json tømt' });
});

// 🔹 Bruk rutene du faktisk ønsker å beholde
app.use("/api/clearData", clearDataRouter);
app.use("/api/saveData", saveDataRouter);
app.use("/api/chat", chatRouter); 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataFilePath = path.join(__dirname, 'data', 'userData.json');

// Start en ny samtale og returner en chatId
app.post('/saveData/start', (req, res) => {
  const chatId = Date.now().toString();
  res.json({ chatId });
});

// Lagre en melding
app.post('/saveData/save', (req, res) => {
  const { chatId, sender, text } = req.body;
  const newMessage = { chatId, sender, text };

  fs.readFile(dataFilePath, (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read data file' });
    }

    const messages = JSON.parse(data);
    messages.push(newMessage);

    fs.writeFile(dataFilePath, JSON.stringify(messages, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to save message' });
      }

      res.json({ message: 'Message saved' });
    });
  });
});

// Avslutt samtale og lagre den
app.post('/saveData/finish', (req, res) => {
  const { chatId } = req.body;

  fs.readFile(dataFilePath, (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read data file' });
    }

    const messages = JSON.parse(data);
    const chatMessages = messages.filter(msg => msg.chatId === chatId);

    const filePath = path.join(__dirname, 'data', `${chatId}.json`);
    fs.writeFile(filePath, JSON.stringify(chatMessages, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to save chat' });
      }

      res.json({ message: 'Chat saved', filePath });
    });
  });
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`✅ Server kjører på port ${PORT}`));