const apiBaseUrl = process.env.NODE_ENV === 'production'
  ? process.env.REACT_APP_API_BASE_URL_PRODUCTION
  : process.env.REACT_APP_API_BASE_URL_DEVELOPMENT;

export const askChatbot = async (conversationMessages, systemPrompt = "") => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationMessages, systemPrompt }),
    });

    const textResponse = await response.text();
    console.log("🔍 Server response:", textResponse);

    const data = JSON.parse(textResponse);
    return data.response; 
  } catch (error) {
    console.error("❌ Feil ved API-kall:", error);
    return "Beklager, det oppstod en feil.";
  }
};