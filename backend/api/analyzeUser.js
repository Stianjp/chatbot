// Kan slettes brukes ikke

import express from "express";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const filePath = path.join("data", "userData.json");

// API-endepunkt for å analysere brukerdata og bestemme samtalekategori
router.post("/", async (req, res) => {
  try {
    const { jobStatus, goal } = req.body;

    if (!jobStatus || !goal) {
      return res.status(400).json({ error: "Mangler jobStatus eller goal i forespørselen." });
    }

    const prompt = `
      Du er en AI-assistent som hjelper folk med karriereveiledning.
      En bruker har gitt følgende informasjon:
      
        - Jobbstatus: ${jobStatus}
        - Mål: ${goal}
      
      hvis jobbstatus til brukeren søker jobb er naturligvis svaret 'a' med mindre det er motivasjonen som er problemet
      Basert på målet og nåværende jobbstatus til brukeren skal du kategorisere brukeren i én av følgende grupper:
      a: Jobbsøking
      b: Bytte karriere
      c: Karriereutvikling
      d: Finne sin motivasjon
      e: er du usikker retuner e 
      
      **Du skal kun returnere én enkelt bokstav** (a, b, c, d eller e) uten noe annen tekst.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "system", content: prompt }]
    });

    const category = completion.choices[0].message.content.trim();

    // Sjekk at GPT faktisk returnerer en gyldig bokstav
    if (!["a", "b", "c", "d", "e"].includes(category)) {
      return res.status(400).json({ error: "GPT returnerte en ugyldig kategori." });
    }

    // **Lagre kategorien i JSON-filen**
    if (fs.existsSync(filePath)) {
      let storedData = JSON.parse(fs.readFileSync(filePath));

      // Finn siste brukerdata og legg til kategorien
      if (storedData.length > 0) {
        storedData[storedData.length - 1].category = category;
        fs.writeFileSync(filePath, JSON.stringify(storedData, null, 2));
      }
    }

    res.json({ category });

  } catch (error) {
    console.error("❌ Feil ved analyse av brukerdata:", error);
    res.status(500).json({ error: "Kunne ikke analysere brukerdata." });
  }
});

export default router;