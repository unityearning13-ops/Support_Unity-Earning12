import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, User, RefreshCw, MessageSquare, ArrowLeft } from 'lucide-react';
import { FormattedText } from './FormattedText';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

interface UnityBotChatProps {
  onGoHome?: () => void;
}

export const UnityBotChat: React.FC<UnityBotChatProps> = ({ onGoHome }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'bot',
      text: 'আসসালামু আলাইকুম! 👋 আমি ইউনিটি আর্নিং-এর অফিশিয়াল **ইউনিটি চ্যাট বট**।\n\n🌐 অফিশিয়াল ওয়েবসাইট: www.unityearning.com\n\nআমাদের কাজ শিখতে ও শুরু করতে আমাদের সেমিনার মিটিংয়ে জয়েন করুন:\n⏰ সেমিনারের সময়সূচি: সকাল ১১:০০ টা, দুপুর ৩:০০ টা ও সন্ধ্যা ৭:০০ টা।\n\nযেকোনো প্রশ্ন থাকলে আমাকে জিজ্ঞাসা করতে পারেন অথবা নিচে **\'হোম\'** ট্যাবে ক্লিক করে সরাসরি আমাদের কাউন্সিলরের ইনবক্সে কথা বলুন!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleQuickClick = (q: string) => {
    // Send quick question immediately
    handleQuickSend(q);
  };

  const handleQuickSend = async (userText: string) => {
    if (!userText.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/bot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, history: messages }),
      });

      if (!res.ok) {
        throw new Error('API server error');
      }

      const data = await res.json();
      const botReply = data.reply || getLocalFallbackReply(userText);

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.warn('Bot API network fallback:', err);
      const fallbackText = getLocalFallbackReply(userText);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    handleQuickSend(input.trim());
  };

  const getLocalFallbackReply = (prompt: string): string => {
    const text = prompt.toLowerCase();

    if (text.includes('কাজ') || text.includes('জব') || text.includes('কাজের') || text.includes('কী কাজ') || text.includes('কি কাজ')) {
      return `আমাদের ইউনিটি আর্নিং প্ল্যাটফর্মে যে সকল সহজ ও আকর্ষণীয় ১৩টি কাজ রয়েছে: 🌟

১. 📧 ইমেইল সেলিং (Email Selling)
২. 🖼️ ফটো এডিটিং (Photo Editing)
৩. 📊 ডাটা এন্ট্রি (Data Entry)
৪. 📝 ফর্ম ফিলাপ (Form Filup)
৫. ⌨️ টাইপিং জব (Typing Job)
৬. 📢 ডিজিটাল মার্কেটিং (Digital Marketing)
৭. 🎬 ভিডিও এডিটিং (Video Editing)
৮. 🛍️ প্রোডাক্ট সেলিং (Product Selling)
৯. 🤝 নেটওয়ার্ক মার্কেটিং (Network Marketing)
১০. ⚡ মাইক্রো জবস (Micro Jobs)
১১. 🛡️ মডারেটর জব (Moderator Job)
১২. 🔢 কোড বসানো (Code Entry)
১৩. 🎮 গেমিং মার্কেটিং (Gaming Marketing)

💡 এসব কাজের ফ্রি প্রশিক্ষণ ও শুরু করার গাইডলাইন পেতে আমাদের ফ্রি লাইভ সেমিনারে যুক্ত হোন।

📌 সেমিনার মিটিং সময়সূচী:
⏰ বেলা ১১:০০ টা
⏰ বিকাল ৩:০০ টা
⏰ সন্ধ্যা ৭:০০ টা

📲 মিটিংয়ে যুক্ত হতে প্লে-স্টোর থেকে **Google Meet** অ্যাপটি ইনস্টল রাখুন!`;
    }

    if (text.includes('ইনকাম') || text.includes('টাকা') || text.includes('আয়') || text.includes('আয')) {
      return 'ইউনিটি আর্নিং-এ যুক্ত হয়ে সঠিক নিয়ম মেনে গাইডলাইন অনুসরণ করলে দৈনিক **১,০০০ থেকে ২,০০০+ টাকা** ইনকাম করা সম্পূর্ণ সম্ভব! 🎯\n\nবর্তমানে আমাদের ৭০,০০০+ (সত্তর হাজার) এরও বেশি শিক্ষার্থী সফলভাবে কাজ করছেন।\n🌐 ওয়েবসাইট: www.unityearning.com';
    }

    if (text.includes('স্টুডেন্ট') || text.includes('কতজন') || text.includes('ছাত্র') || text.includes('কমিউনিটি')) {
      return 'আলহামদুলিল্লাহ, ইউনিটি আর্নিং-এ বর্তমানে **৭০,০০০+ (সত্তর হাজারের বেশি)** শিক্ষার্থী সফলভাবে যুক্ত হয়ে কাজ করছেন ও ক্যারিয়ার গড়ছেন। 🌟';
    }

    if (text.includes('সরকারি') || text.includes('সার্টিফিকেট') || text.includes('অনুমোদিত') || text.includes('লাইসেন্স')) {
      return 'জি অবশ্যই! ইউনিটি আর্নিং হলো **বাংলাদেশ সরকার অনুমোদিত ও লাইসেন্সপ্রাপ্ত** দেশের ১ নম্বর স্বনামধন্য আইটি ও ফ্রিল্যান্সিং ক্যারিয়ার ট্রেইনিং ইনস্টিটিউট। 🏛️📜\n🌐 অফিশিয়াল ওয়েবসাইট: www.unityearning.com';
    }

    if (text.includes('কোর্স') || text.includes('কীভাবে') || text.includes('শুরু') || text.includes('ওয়েবসাইট') || text.includes('মিটিং') || text.includes('সেমিনার')) {
      return 'কাজ ভালোভাবে বুঝতে ও শুরু করতে আমাদের নিয়মিত ফ্রি সেমিনার মিটিংয়ে অংশ নিন। 🚀\n\n⏰ **সেমিনার মিটিংয়ের সময়সূচি:**\n• সকাল ১১:০০ টা\n• দুপুর ৩:০০ টা\n• সন্ধ্যা ৭:০০ টা\n\n🌐 অফিশিয়াল ওয়েবসাইট: www.unityearning.com\n\nযেকোনো প্রশ্ন থাকলে বা সেমিনার লিংক পেতে নিচে **\'হোম\'** ট্যাবে ক্লিক করে আমাদের অফিশিয়াল কাউন্সিলরের সাথে ইনবক্সে সরাসরি কথা বলুন!';
    }

    return 'ধন্যবাদ আপনার প্রশ্নের জন্য! 😊\n\n**ইউনিটি আর্নিং** (www.unityearning.com) হলো বাংলাদেশ সরকার অনুমোদিত ১ নম্বর ফ্রিল্যান্সিং ক্যারিয়ার প্ল্যাটফর্ম, যেখানে ৭০,০০০+ শিক্ষার্থী কাজ করছেন।\n\nকাজ শিখতে প্রতিদিনের অনলাইন সেমিনারে অংশ নিন:\n⏰ সেমিনার সময়: সকাল ১১:০০, দুপুর ৩:০০ ও সন্ধ্যা ৭:০০ টা।\n\nযেকোনো সমস্যায় নিচে **\'হোম\'** ট্যাবে ক্লিক করে কাউন্সিলরের ইনবক্সে মেসেজ দিয়ে কথা বলুন!';
  };

  const quickQuestions = [
    'কি কি কাজ আছে?',
    'কীভাবে কাজ শুরু করব?',
    'সেমিনার মিটিং কত টায়?',
    'দৈনিক কত টাকা ইনকাম সম্ভব?',
    'ওয়েবসাইট লিংক কত?',
  ];

  return (
    <div className="flex h-full w-full flex-col bg-slate-900/5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-teal-500/20 bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 px-4 py-3 text-white shadow-md">
        <div className="flex items-center gap-3">
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="rounded-xl p-1.5 text-teal-100 hover:bg-white/10 transition cursor-pointer md:hidden"
              title="হোমে ফিরুন"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-300 text-teal-950 font-black shadow-inner">
            <Bot className="h-6 w-6 text-teal-950" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-teal-900" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm sm:text-base font-black text-white tracking-tight">ইউনিটি চ্যাট বট</h2>
              <span className="rounded-full bg-emerald-400/20 border border-emerald-300/40 px-2 py-0.2 text-[9px] font-bold text-emerald-200 flex items-center gap-0.5">
                <Sparkles className="h-2.5 w-2.5 text-emerald-300" /> AI
              </span>
            </div>
            <p className="text-[11px] text-teal-200/90 font-medium">অনলাইন • ৭০,০০০+ শিক্ষার্থীদের এআই সহায়িকা</p>
          </div>
        </div>

        <button
          onClick={() => {
            setMessages([
              {
                id: Date.now().toString(),
                sender: 'bot',
                text: 'আসসালামু আলাইকুম! 👋 আমি ইউনিটি আর্নিং-এর অফিশিয়াল **ইউনিটি চ্যাট বট**। কিভাবে সাহায্য করতে পারি?\n\n🌐 অফিশিয়াল ওয়েবসাইট: www.unityearning.com',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
          }}
          className="flex items-center gap-1 text-[11px] font-bold text-teal-100 hover:text-white bg-white/10 hover:bg-white/20 border border-white/15 px-2.5 py-1.5 rounded-xl transition cursor-pointer"
          title="নতুন চ্যাট শুরু করুন"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">রিসেট</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 bg-gradient-to-b from-slate-100/50 to-teal-50/30">
        {messages.map((msg) => {
          const isBot = msg.sender === 'bot';
          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2.5 ${isBot ? 'justify-start' : 'justify-end'}`}
            >
              {isBot && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-700 to-emerald-600 text-white shadow-xs">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                  isBot
                    ? 'bg-white text-slate-800 border border-teal-100/80 rounded-bl-xs'
                    : 'bg-gradient-to-r from-teal-700 to-emerald-700 text-white rounded-br-xs font-medium'
                }`}
              >
                <div>
                  <FormattedText text={msg.text} isMe={!isBot} />
                </div>
                <div
                  className={`mt-1.5 text-[9px] text-right font-medium ${
                    isBot ? 'text-slate-400' : 'text-teal-100'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {!isBot && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-white shadow-xs">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-teal-700 text-white">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl bg-white border border-teal-100 px-4 py-3 shadow-xs flex items-center gap-2 text-xs text-teal-800 font-semibold">
              <span className="h-2 w-2 rounded-full bg-teal-600 animate-bounce" />
              <span className="h-2 w-2 rounded-full bg-teal-600 animate-bounce [animation-delay:0.2s]" />
              <span className="h-2 w-2 rounded-full bg-teal-600 animate-bounce [animation-delay:0.4s]" />
              <span className="ml-1 text-[11px]">ইউনিটি চ্যাট বট টাইপ করছেন...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggested Question Chips */}
      <div className="px-3.5 py-2.5 bg-white border-t border-teal-100/60 overflow-x-auto flex items-center gap-2 scrollbar-none shadow-2xs">
        <span className="text-[10px] font-extrabold text-teal-800 shrink-0 bg-teal-50 px-2 py-1 rounded-lg border border-teal-100">
          প্রশ্নসমূহ:
        </span>
        {quickQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleQuickClick(q)}
            className="shrink-0 rounded-xl bg-teal-50/90 border border-teal-200 px-3 py-1.5 text-[11px] font-bold text-teal-900 hover:bg-teal-600 hover:text-white transition cursor-pointer shadow-2xs active:scale-95"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200/80">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="আপনার প্রশ্নটি লিখুন (যেমন: কি কি কাজ আছে?)..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 rounded-2xl border border-teal-200/80 bg-slate-50 py-2.5 px-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none transition shadow-2xs font-medium"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-700 text-white shadow-xs hover:from-teal-800 hover:to-emerald-800 disabled:opacity-40 transition cursor-pointer shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
