// backend/api/reanalyzeUser.js
//Kan slettes brukes ikke
import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/", async (req, res) => {
  const { jobStatus, goal, conversationSnippet } = req.body;

  if (!jobStatus || !goal) {
    return res.status(400).json({ error: "Mangler jobStatus eller goal i forespørselen." });
  }

  try {
    const prompt = `
      Du er en AI-assistent som hjelper folk med karriereveiledning.
      Bruker har tidligere oppgitt:
       - Jobbstatus: ${jobStatus}
       - Mål: ${goal}

      Nylig samtaleutdrag:
      ${conversationSnippet}

      Basert på all informasjon:
      - a: Jobbsøking
      - b: Bytte karriere
      - c: Karriereutvikling
      - d: Finne sin motivasjon
      - e: Usikker (eller uklart)

      Returner kun én bokstav (a, b, c, d, e) og ingen annen tekst.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: prompt }],
    });

    const newCategory = completion.choices[0].message.content.trim().toLowerCase();

    if (!["a", "b", "c", "d", "e"].includes(newCategory)) {
      return res.status(400).json({ error: "GPT returnerte en ugyldig kategori." });
    }

    res.json({ newCategory });
  } catch (error) {
    console.error("Feil i /reanalyzeUser:", error);
    res.status(500).json({ error: "Kunne ikke re-analysere brukerdata." });
  }
});

export default router;