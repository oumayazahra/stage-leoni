import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import '../styles/Chatbot.css';

const API_BASE    = 'http://localhost:5000/api';
const CHAR_DELAY  = 10; // ms par caractère (accéléré)

const Chatbot = ({ salleId }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen]   = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: "Bonjour ! Je suis l'Assistant Sécurité & Infra LEONI 🤖. Posez-moi vos questions par écrit ou via le micro.", thoughts: [] }
  ]);
  const [input, setInput]         = useState('');
  const [isListening, setIsListening]   = useState(false);
  const [isSpeaking, setIsSpeaking]     = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // File d'attente pour le streaming de texte
  const charQueueRef   = useRef('');
  const timerRef       = useRef(null);
  const streamDoneRef  = useRef(false);

  // Références générales
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  // ── Speech Recognition ──
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setSpeechSupported(true);
    const rec = new SR();
    rec.lang = 'fr-FR'; rec.continuous = false; rec.interimResults = false;
    rec.onstart  = () => setIsListening(true);
    rec.onend    = () => setIsListening(false);
    rec.onerror  = () => setIsListening(false);
    rec.onresult = (e) => { const t = e.results[0][0].transcript; if (t.trim()) handleSendMessage(t); };
    recognitionRef.current = rec;
  }, [salleId]);

  // ── TTS ──
  const speakText = (rawText) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const clean = rawText.replace(/[*_#`~>]/g, '').replace(/\n/g, '. ');
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = 'fr-FR'; utter.rate = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const fr = voices.find(v => v.lang.startsWith('fr') && v.name.includes('Google')) || voices.find(v => v.lang.startsWith('fr'));
    if (fr) utter.voice = fr;
    utter.onstart = () => setIsSpeaking(true);
    utter.onend   = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utter);
  };

  // ══════════════════════════════════════════════════════════
  // Moteur caractère par caractère
  // ══════════════════════════════════════════════════════════
  const startCharTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      if (charQueueRef.current.length === 0) {
        if (streamDoneRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setMessages(prev => {
            const u = [...prev];
            const last = u.length - 1;
            if (u[last]?.isStreaming) u[last] = { ...u[last], isStreaming: false };
            return u;
          });
        }
        return;
      }
      const char = charQueueRef.current[0];
      charQueueRef.current = charQueueRef.current.slice(1);
      setMessages(prev => {
        const u = [...prev];
        const last = u.length - 1;
        if (u[last]?.isStreaming) u[last] = { ...u[last], text: u[last].text + char };
        return u;
      });
    }, CHAR_DELAY);
  }, []);

  // ══════════════════════════════════════════════════════════
  // handleSendMessage
  // ══════════════════════════════════════════════════════════
  const handleSendMessage = async (textToSend) => {
    const queryText = textToSend || input;
    // On vérifie si le dernier message est en cours de réflexion ou stream
    const isBusy = messages.length > 0 && (messages[messages.length - 1].isThinking || messages[messages.length - 1].isStreaming);
    if (!queryText.trim() || isBusy) return;

    if (isListening) recognitionRef.current?.stop();
    if (isSpeaking) window.speechSynthesis?.cancel();

    // Reset stream state
    charQueueRef.current = '';
    streamDoneRef.current = false;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    // On ajoute le message utilisateur ET la coquille du message bot
    setMessages(prev => [
      ...prev,
      { sender: 'user', text: queryText },
      { sender: 'bot', text: '', thoughts: [], isThinking: true, isStreaming: false }
    ]);
    setInput('');

    try {
      const response = await fetch(`${API_BASE}/chatbot/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText, salleId, role: user?.role, badgeId: user?.badgeId })
      });

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = '';

      const processBlock = (eventName, dataStr) => {
        let data = {};
        try { data = JSON.parse(dataStr); } catch { return; }

        switch (eventName) {

          case 'thinking':
            // Ajouter la ligne de réflexion grisée
            setMessages(prev => {
              const u = [...prev];
              const last = u.length - 1;
              if (u[last]?.isThinking) {
                u[last] = { ...u[last], thoughts: [...(u[last].thoughts || []), data.step] };
              }
              return u;
            });
            break;

          case 'stream_start':
            // Fin du thinking, début de l'écriture
            setMessages(prev => {
              const u = [...prev];
              const last = u.length - 1;
              if (u[last]) {
                u[last] = { ...u[last], isThinking: false, isStreaming: true };
              }
              return u;
            });
            startCharTimer();
            break;

          case 'chunk':
            if (data.token) charQueueRef.current += data.token;
            break;

          case 'done':
            streamDoneRef.current = true;
            if (data.fullReply) setTimeout(() => speakText(data.fullReply), 1000);
            break;

          case 'error':
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
            setMessages(prev => {
              const u = [...prev];
              const last = u.length - 1;
              if (u[last]) {
                u[last] = { ...u[last], isThinking: false, isStreaming: false, text: data.message || 'Une erreur est survenue.' };
              }
              return u;
            });
            break;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop();
        for (const block of blocks) {
          const lines   = block.split('\n');
          let eventName = 'message', dataStr = '';
          for (const line of lines) {
            if (line.startsWith('event:')) eventName = line.slice(6).trim();
            if (line.startsWith('data:'))  dataStr   = line.slice(5).trim();
          }
          if (dataStr) processBlock(eventName, dataStr);
        }
      }

    } catch (err) {
      console.error('[Chatbot]', err);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setMessages(prev => {
        const u = [...prev];
        const last = u.length - 1;
        if (u[last]) u[last] = { ...u[last], isThinking: false, isStreaming: false, text: 'Impossible de contacter le serveur.' };
        return u;
      });
    }
  };

  const toggleVoice = () => {
    if (!speechSupported) { alert('Utilisez Google Chrome.'); return; }
    if (isListening) recognitionRef.current.stop();
    else { window.speechSynthesis?.cancel(); recognitionRef.current.start(); }
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter') handleSendMessage(); };

  if (!user) return null;

  const isBusy = messages.length > 0 && (messages[messages.length - 1].isThinking || messages[messages.length - 1].isStreaming);

  if (!isOpen) {
    return (
      <button className="chatbot-icon-bubble" onClick={() => setIsOpen(true)}>
        <span className="bubble-symbol">💬</span>
      </button>
    );
  }

  return (
    <div className="chatbot-window">
      <div className="chatbot-header">
        <div className="bot-header-title">
          <span className="bot-avatar">🤖</span>
          <div>
            <h4>Assistant IA LEONI</h4>
            <span className="bot-status">
              {messages.length > 0 && messages[messages.length - 1].isThinking ? '🧠 Réflexion en cours...'
               : messages.length > 0 && messages[messages.length - 1].isStreaming ? '✍️ Génération...'
               : isSpeaking ? '🔊 En train de parler...'
               : '● En ligne'}
            </span>
          </div>
        </div>
        <button className="chatbot-close-btn" onClick={() => {
          setIsOpen(false);
          window.speechSynthesis?.cancel();
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        }}>✕</button>
      </div>

      <div className="chatbot-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message-wrapper ${msg.sender === 'bot' ? 'wrapper-bot' : 'wrapper-user'}`}>
            <div className={`message-bubble message-${msg.sender}`}>
              <div className="message-sender-name">{msg.sender === 'bot' ? 'Assistant IA' : 'Moi'}</div>
              
              {msg.sender === 'bot' ? (
                <div className="message-content-container">
                  {/* BLOC THINKING STYLE "AGENT" */}
                  {msg.thoughts && msg.thoughts.length > 0 && (
                    <div className="agent-thinking-block">
                      <div className="agent-thinking-header">
                        {msg.isThinking ? <span className="agent-spinner"></span> : <span className="agent-done-icon">✓</span>}
                        <span className="agent-header-text">
                          {msg.isThinking ? 'L\'agent réfléchit...' : 'Analyse terminée'}
                        </span>
                      </div>
                      <div className="agent-thinking-steps">
                        {msg.thoughts.map((t, i) => (
                          <div key={i} className="agent-step">
                            <span className="step-bullet">↳</span> {t}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* REPONSE FINALE */}
                  {(msg.text || msg.isStreaming) && (
                    <div className="message-markdown">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                      {msg.isStreaming && <span className="streaming-cursor">▍</span>}
                    </div>
                  )}
                </div>
              ) : (
                <p className="message-text">{msg.text}</p>
              )}
            </div>
          </div>
        ))}

        {/* Indicateurs Vocaux */}
        {(isListening || isSpeaking) && (
          <div className="voice-indicator-container">
            <div className="voice-soundwave">
              {[...Array(5)].map((_, i) => <span key={i} className="wave" />)}
            </div>
            <span className="voice-status-text">
              {isListening ? 'Je vous écoute...' : 'Je vous réponds...'}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-input-area">
        {speechSupported && (
          <button
            type="button"
            className={`mic-button ${isListening ? 'mic-active' : ''} ${isSpeaking ? 'mic-speaking' : ''}`}
            onClick={toggleVoice}
            disabled={isBusy}
          >
            {isListening ? '🛑' : isSpeaking ? '🔊' : '🎙️'}
          </button>
        )}

        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={
            messages.length > 0 && messages[messages.length - 1].isThinking ? '🧠 Réflexion...'
            : messages.length > 0 && messages[messages.length - 1].isStreaming ? '✍️ Génération...'
            : 'Posez une question...'
          }
          disabled={isListening || isBusy}
        />

        <button
          onClick={() => handleSendMessage()}
          className="send-button"
          disabled={!input.trim() || isListening || isBusy}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
};

export default Chatbot;