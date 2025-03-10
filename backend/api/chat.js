// backend/api/chat.js
import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/chat
router.post("/", async (req, res) => {
  const { conversationMessages, systemPrompt } = req.body;
  if (!conversationMessages || !systemPrompt) {
    return res.status(400).json({ error: "Mangler conversationMessages eller systemPrompt." });
  }

  try {
    // Lag "messages" for GPT
    const messagesForGPT = [
      { role: "system", content: systemPrompt },
      ...conversationMessages
      // f.eks. { role: "user", content: "Tekst" }, { role: "assistant", content: "Bot-svar" }, ...
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // eller gpt-4
      messages: messagesForGPT,
    });

    const gptReply = completion.choices[0].message.content;
    res.json({ response: gptReply });
  } catch (error) {
    console.error("Feil i /api/chat:", error);
    res.status(500).json({ error: "Noe gikk galt i GPT-kallet." });
  }
});

export default router;