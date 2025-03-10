import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  initialMessage,
  phaseOnePrompt,
  phaseTwoPrompt,
} from "../data/chatbotPrompts";
import "../styles/Chatbot.css";
import { askChatbot } from "../utils/langchainChatbot";
import logo from "../media/logo.png";
import miniLogo from "../media/MH_logo.png";
import { IoClose } from "react-icons/io5";

/*
  Chatbot.jsx:
  - Fase = 1 => GPT bruker phaseOnePrompt (5-8 spørsmål).
  - Fase = 2 => GPT bruker phaseTwoPrompt (7 spørsmål + oppsummering).
*/

const Chatbot = () => {
  // Meldingshistorikk
  const [messages, setMessages] = useState([
    { sender: "bot", text: initialMessage },
  ]);

  // Samtykke (hvis du fremdeles vil bruke det)
  const [consent, setConsent] = useState(null);

  // Brukerens input + states
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [chatId, setChatId] = useState(null); // ID for samtalen
  const [hoverText, setHoverText] = useState("Klikk for å kopiere ID");
  const [hoverXbottom, setHoverXbottom] = useState("Klikk for å avslutte samtalen");

  // Fase-styring: 1 = kort kartlegging, 2 = dyp motivasjon
  const [phase, setPhase] = useState(1);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    clearData(); // Tøm userData.json når siden lastes inn
    startNewChat(); // Start en ny samtale når chatboten lastes inn
  }, []);

  // Start en ny samtale og hent en ID
  const startNewChat = async () => {
    try {
      const response = await axios.post("http://localhost:5001/saveData/start");
      setChatId(response.data.chatId);
      console.log("Ny samtale startet med ID:", response.data.chatId);
    } catch (error) {
      console.error("❌ Feil ved oppstart av chat:", error);
    }
  };

  // Autoscroll / autofokus
  useEffect(() => {
    scrollToBottom();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages]);

  // Tøm userData.json
  const clearData = async () => {
    try {
      await axios.post("http://localhost:5001/api/clearData");
      console.log("userData.json tømt");
    } catch (error) {
      console.error("❌ Feil ved tømming av userData.json:", error);
    }
  };

  // Samtykke-håndtering
  const handleConsent = (userConsent) => {
    setConsent(userConsent);
    const userMsg = { sender: "user", text: userConsent ? "Ja, jeg samtykker." : "Nei, jeg ønsker ikke lagring." };
    const botMsg = { sender: "bot", text: "Tusen takk! Mitt navn er SoftAI, hva heter du?" };

    const newMessages = [...messages, userMsg, botMsg];
    setMessages(newMessages);

    if (userConsent) {
      saveMessage(userMsg);
      saveMessage(botMsg);
    }
  };

  // Send melding
  const sendMessage = async () => {
    if (!input.trim()) return;
    setLoading(true);

    // Legg til brukermelding
    const userMessage = { sender: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    saveMessage(userMessage);
    setInput("");
    inputRef.current.style.height = "30px";

    setIsTyping(true);

    // Vent litt og kall GPT
    setTimeout(async () => {
      let botReply = "";

      // 1) Bygg hele konversasjonen i GPT-format
      const conversationMessages = buildConversationForGPT([...messages, userMessage]);

      // 2) Velg prompt basert på fase
      let systemPrompt = phaseOnePrompt;
      if (phase === 2) {
        systemPrompt = phaseTwoPrompt;
      }

      // 3) Kall GPT
      botReply = await askChatbot(conversationMessages, systemPrompt);

      // 4) TELL antall assistent-svar i denne fasen
      const newAssistantCount = countAssistantMessages([...messages, { sender: "bot", text: botReply }], phase);

      // 5) Bytt til fase 2 hvis vi er i fase 1 og GPT har passert ~5–8 meldinger
      if (phase === 1 && newAssistantCount >= 8) {
        console.log("Bytter til fase 2...");
        // Sett fase til 2
        setPhase(2);
      }

      // 6) Oppdater meldinger med GPT-svar
      setMessages((prev) => [...prev, { sender: "bot", text: botReply }]);
      saveMessage({ sender: "bot", text: botReply });

      setIsTyping(false);
      setLoading(false);
    }, 500);
  };

  // Ensure phase 2 is activated properly
useEffect(() => {
  if (phase === 2) {
    console.log(" Fase 2 er aktivert! Bytter til dyp motivasjonsanalyse.");
  }
}, [phase]);

  // Lagre en melding til backend
  const saveMessage = async (message) => {
    try {
      await axios.post("http://localhost:5001/saveData/save", {
        chatId,
        sender: message.sender,
        text: message.text,
      });
    } catch (error) {
      console.error("❌ Feil ved lagring av melding:", error);
    }
  };

  const [chatEnded, setChatEnded] = useState(false);

  // Avslutt samtale og lagre den
  const finishChat = async () => {
    if (isFinishingChat) return; // Hindre flere trykk
    setIsFinishingChat(true); // Lås knappen

    try {
        if (consent === false) {
            console.log("🚫 Bruker har ikke samtykket. Samtalen slettes.");
            await axios.delete(`http://localhost:5001/saveData/delete/${chatId}`);
            console.log("🚫 Samtale slettet siden brukeren ikke ga samtykke.");
        } else {
              const response = await axios.post("http://localhost:5001/saveData/finish", { chatId });
              console.log(response.data.message, "Fil lagret på:", response.data.filePath);
        }
    } catch (error) {
          console.error("❌ Feil ved sletting/lagring av samtale:", error);
    }
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "bot", text: "Takk for samtalen!😊 Ha en fin dag videre!" }
    ]);
    setChatEnded(true); // Sørg for at knappen vises
  };
  // Slett samtalen dersom brukeren ikke samtykket
  
  const [isFinishingChat, setIsFinishingChat] = useState(false); // For å hindre dobbelklikk

  // Start en ny samtale fra bunnen av
  const restartChat = async () => {
    setChatId(null);
    setConsent(null);
    setChatEnded(false); // Tillat meldinger igjen
    setIsFinishingChat(false); // 🔄 Reset finishChat-knappen
    setMessages([{ sender: "bot", text: initialMessage }]);
    startNewChat(); // Start en ny samtale med ny ID
  };

  // Autoscroll
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Juster inputfeltets høyde
  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = "30px";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  // Kopier chat-ID til utklippstavlen
  const copyChatId = () => {
    navigator.clipboard.writeText(chatId).then(() => {
      setHoverText("ID kopiert!");
      setTimeout(() => setHoverText("Klikk for å kopiere ID"), 2000);
    });
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <img src={logo} alt="MeyerHaugen" className="logo" />
        <p className="chat-date">
          {new Date().toLocaleDateString("no-NO", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        {chatId && (
          <p
            className="chat-id"
            onClick={copyChatId}
            title={hoverText}
            style={{ cursor: "pointer" }}
          >
            Chat ID: <span style={{textDecoration: "underline" }}>{chatId}</span> 
          </p>
        )}
      </header>

      <div className="chatbot-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.sender}`}>
            {msg.sender === "bot" ? (
              i === messages.length - 1 ? (
                <img src={miniLogo} alt="Bot" className="bot-avatar" />
              ) : (
                <div className="bot-avatar-placeholder"></div>
              )
            ) : null}
            <div className={`chat-bubble ${msg.sender}`}>{msg.text}</div>
          </div>
        ))}

        {isTyping && (
          <div className="typing-bubble">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {chatEnded && (
        <div className="restart-chat">
          <button className="restart-button" onClick={restartChat}>
                Start ny samtale
          </button>
        </div>
      )}

      {consent === null && (
        <div className="consent-buttons">
          <button className="accept" onClick={() => handleConsent(true)}>Godta</button>
          <button className="decline" onClick={() => handleConsent(false)}>Avslå</button>
        </div>
      )}

      {consent !== null && (
          <div className="chat-input">
              <textarea
                  ref={inputRef}
                  placeholder="Skriv melding her"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (!chatEnded) sendMessage(); // Kun send hvis chat ikke er avsluttet
                      }
                  }}
                  disabled={loading || chatEnded} // Deaktivert hvis chat er avsluttet
                  rows={1}
                  style={{ resize: "none", minHeight: "30px", maxHeight: "200px", overflowY: "auto" }}
              />
              <button onClick={sendMessage} disabled={loading || chatEnded}>
                  ➤
              </button>
              <button 
                  onClick={finishChat} 
                  title={hoverXbottom}
                  disabled={isFinishingChat} // Deaktiver knappen etter første trykk
                  >                         
                  <IoClose />
              </button>
          </div>
      )}
    </div>
  );
};

/** 
 * Bygg et array i GPT-format: {role: "assistant"|"user", content: "..."}
 * Basert på {sender: "bot"|"user", text: "..."} 
 */
function buildConversationForGPT(allMessages) {
  return allMessages.map((m) => ({
    role: m.sender === "bot" ? "assistant" : "user",
    content: m.text,
  }));
}

/**
 * Teller hvor mange meldinger "bot" har kommet med i gjeldende fase.
 * Du kan velge å differensiere på om meldingen ble postet i currentPhase. Men i en enkel variant:
 */
function countAssistantMessages(allMessages, currentPhase) {
  let count = 0;
  for (const msg of allMessages) {
    if (msg.sender === "bot") {
      count++;
    }
  }
  return count;
}

export default Chatbot;