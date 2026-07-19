'use client';

import { useEffect, useRef, useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME: Message = {
  role: 'assistant',
  content: 'مرحباً بكِ في أمانة 💜\nأنا مساعدتكِ الذكيّة. كيف يمكنني مساعدتكِ؟',
};

export function AiChatWidget({ lang }: { lang: 'ar' | 'en' }) {
  const ar = lang === 'ar';
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  async function send() {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    const history = messages.filter(m => m.role !== 'assistant' || m !== WELCOME);
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await fetch('/api/landing-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply ?? (ar ? 'عذراً، حدث خطأ ما. حاولي مجدداً.' : 'Sorry, something went wrong. Please try again.'),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: ar ? 'تعذّر الاتصال. تحقّقي من الإنترنت وحاولي مجدداً.' : 'Connection failed. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* زر الشات العائم */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={ar ? 'فتح المساعدة' : 'Open assistant'}
        className="fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)' }}
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round" className="h-6 w-6">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
        {/* نقطة تنبيه */}
        {!open && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[9px] font-bold text-white shadow">
            AI
          </span>
        )}
      </button>

      {/* نافذة الشات */}
      {open && (
        <div
          dir={ar ? 'rtl' : 'ltr'}
          className="fixed bottom-24 left-6 z-50 flex w-80 flex-col overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-2xl dark:border-purple-900/30 dark:bg-slate-900"
          style={{ maxHeight: '28rem' }}
        >
          {/* الرأس */}
          <div
            className="flex items-center gap-3 px-4 py-3 text-white"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)' }}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg">💜</span>
            <div className="flex-1">
              <p className="text-sm font-bold">{ar ? 'مساعدة أمانة الذكيّة' : 'Amana AI Assistant'}</p>
              <p className="text-xs text-white/70">{ar ? 'متصلة الآن' : 'Online now'}</p>
            </div>
          </div>

          {/* المحادثة */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: '18rem' }}>
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? (ar ? 'justify-start' : 'justify-end') : (ar ? 'justify-end' : 'justify-start')}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-50 text-slate-800 dark:bg-purple-900/30 dark:text-slate-200'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className={`flex ${ar ? 'justify-end' : 'justify-start'}`}>
                <div className="flex items-center gap-1.5 rounded-2xl bg-purple-50 px-4 py-3 dark:bg-purple-900/30">
                  {[0, 1, 2].map(d => (
                    <span
                      key={d}
                      className="h-2 w-2 rounded-full bg-purple-400"
                      style={{ animation: `bounce 1.2s ${d * 0.2}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* حقل الإدخال */}
          <div className="flex items-center gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
              placeholder={ar ? 'اكتبي سؤالكِ…' : 'Type your question…'}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-purple-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
            />
            <button
              onClick={() => void send()}
              disabled={!input.trim() || loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)' }}
              aria-label={ar ? 'إرسال' : 'Send'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                {ar
                  ? <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  : <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                }
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: .6; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </>
  );
}
