/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Trash2,
  Zap,
  Cpu,
  Orbit,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { PlanetData } from '../types/astronomy';
import { PLANETS_DATA, SUN_DATA } from '../data/planetsData';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

interface CosmicChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlanetId: string | null;
  currentDate: Date;
}

const QUICK_PROMPTS = [
  'What is happening in the Solar System right now?',
  "Why are Saturn's rings so thin yet wide?",
  'What causes a total solar eclipse?',
  "Could life exist beneath Europa's ice?",
  'Why does Venus rotate backwards?',
  'How did Jupiter protect Earth from comets?',
];

export const CosmicChatDrawer: React.FC<CosmicChatDrawerProps> = ({
  isOpen,
  onClose,
  selectedPlanetId,
  currentDate,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content:
        "Greetings, cosmic traveler! I'm **Cosmo**, your AI astrophysicist and guide to the Solar System. Ask me anything about planetary alignments, moons, orbital mechanics, eclipses, or the cosmic history of our celestial neighborhood!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelName, setModelName] = useState<'gemini-3.8-flash' | 'gemini-3.1-flash-lite' | 'gemini-4-argon'>('gemini-3.8-flash');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const userQuery = (textToSend || input).trim();
    if (!userQuery || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);
    setErrorMessage(null);

    // Build context about what the user is currently viewing
    let contextStr = `Current Observatory Date: ${currentDate.toISOString()}`;
    if (selectedPlanetId === 'sun') {
      contextStr += `\nUser is inspecting: The Sun (${SUN_DATA.spectralType}, Mass: ${SUN_DATA.massKg} kg)`;
    } else if (selectedPlanetId) {
      const p = PLANETS_DATA.find((item) => item.id === selectedPlanetId);
      if (p) {
        contextStr += `\nUser is inspecting: ${p.name} (${p.category}, Moons: ${p.moonsCount}, Tagline: "${p.tagline}")`;
      }
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: contextStr,
          modelName: modelName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to reach cosmic intelligence');
      }

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMessage(err?.message || 'Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'model',
        content: 'Conversation cleared. What cosmic mystery shall we explore next?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setErrorMessage(null);
  };

  if (!isOpen) return null;

  return (
    <aside className="absolute left-0 sm:left-6 top-16 bottom-6 w-full sm:w-[420px] z-30 bg-[#070b1e]/98 backdrop-blur-2xl border border-slate-700/80 sm:rounded-3xl shadow-2xl flex flex-col text-slate-100 overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0 bg-[#0a0f26]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-purple-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white">COSMO AI</span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/40">
                ASTROPHYSICIST
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Ask about orbits, planets & physics</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClearChat}
            title="Clear Chat History"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            aria-label="Close Chat"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Model Selection Tabs */}
      <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-xs">
        <span className="text-[11px] font-mono text-slate-400">AI Engine:</span>
        <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setModelName('gemini-3.8-flash')}
            title="Balanced & Detailed (Gemini 3.8 Flash)"
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
              modelName === 'gemini-3.8-flash'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Flash 3.8
          </button>
          <button
            onClick={() => setModelName('gemini-3.1-flash-lite')}
            title="Fast Speed (Gemini 3.1 Flash Lite)"
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
              modelName === 'gemini-3.1-flash-lite'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Fast Lite
          </button>
          <button
            onClick={() => setModelName('gemini-4-argon')}
            title="Complex Reasoning (Gemini 4 Argon)"
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
              modelName === 'gemini-4-argon'
                ? 'bg-purple-500 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Argon 4
          </button>
        </div>
      </div>

      {/* Scrollable Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white ${
                msg.role === 'user'
                  ? 'bg-cyan-600 shadow-md shadow-cyan-600/30'
                  : 'bg-purple-600 shadow-md shadow-purple-600/30'
              }`}
            >
              {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            <div
              className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-cyan-500 text-slate-950 font-medium rounded-tr-sm'
                  : 'bg-[#0f1738] text-slate-100 border border-slate-700/60 rounded-tl-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <div
                className={`text-[9px] mt-1 font-mono text-right ${
                  msg.role === 'user' ? 'text-slate-800' : 'text-slate-400'
                }`}
              >
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center shrink-0 text-white shadow-md">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-[#0f1738] border border-slate-700/60 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>Cosmo is computing astrophysics response...</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Suggested Questions:
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                onClick={() => handleSendMessage(q)}
                disabled={isLoading}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors cursor-pointer text-left disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Field Bar */}
      <div className="p-3 border-t border-slate-800 bg-[#0a0f26] shrink-0">
        <div className="flex items-center gap-2 bg-slate-950 rounded-2xl px-3.5 py-2 border border-slate-700/80 focus-within:border-cyan-400 transition-colors">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Cosmo about the Solar System..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-none"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!input.trim() || isLoading}
            className="p-1.5 rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
