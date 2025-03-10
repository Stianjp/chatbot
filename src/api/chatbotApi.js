// chatbotApi.js

import axios from "axios";

const API_URL = "http://localhost:5001"; // 🚨 Er dette riktig backend-url?

export const saveData = async (consent, messages) => {
  try {
    const response = await axios.post(`${API_URL}/api/saveData`, {
      consent,
      data: messages,
    });
    console.log("Lagringsresultat:", response.data);
  } catch (error) {
    console.error("Feil ved lagring:", error);
  }
};

export const clearBackendData = async () => {
  try {
    const response = await axios.delete(`${API_URL}/api/clearData`);
    console.log("Sletting av data:", response.data);
  } catch (error) {
    console.error("Feil ved sletting av data:", error);
  }
};

// (Valgfritt) Du kan fjerne analyzeUserData og reanalyzeUserData 
// helt hvis du ikke skal bruke dem i det nye oppsettet.