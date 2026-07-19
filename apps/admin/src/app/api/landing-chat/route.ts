import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? '';

const SYSTEM_PROMPT = `أنتِ مساعدة أمانة — تطبيق نقل نسائي ذكيّ في المملكة العربية السعودية.
أجيبي على أسئلة الزوار باختصار ووضوح (٢-٣ جمل كحدّ أقصى).
المعلومات الأساسية:
- أمانة: تطبيق نقل نسائي ١٠٠٪ — سائقات ومركبات موثّقات، ركاب نساء فقط.
- مدعوم بالذكاء الاصطناعي: اقتراح وجهات، دعم ذكيّ فوريّ، تسعير ديناميكي عادل.
- ميزات الأمان: زرّ طوارئ SOS، مشاركة الرحلة مع العائلة، توثيق كامل للسائقات.
- متاح في جميع مدن المملكة العربية السعودية.
- التسجيل: من تطبيق أمانة على Google Play أو App Store.
- للسائقات: سجّلي من خلال التطبيق وأكملي التوثيق.
- للدعم: يمكن التواصل عبر التطبيق بعد التسجيل.
إن لم تعرفي الإجابة، قولي ذلك بلطف واقترحي التواصل عبر التطبيق.
الردّ دائماً بالعربية ما لم يكتب الزائر بالإنجليزية.`;

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json() as {
      message: string;
      history: { role: 'user' | 'assistant'; content: string }[];
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'empty message' }, { status: 400 });
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(history ?? []).slice(-6), // آخر 6 رسائل فقط
      { role: 'user', content: message.trim() },
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 200,
        temperature: 0.6,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Groq error:', err);
      return NextResponse.json({ error: 'groq_error' }, { status: 502 });
    }

    const data = await res.json() as {
      choices: { message: { content: string } }[];
    };
    const reply = data.choices?.[0]?.message?.content ?? 'عذراً، لم أتمكّن من الإجابة الآن.';
    return NextResponse.json({ reply });
  } catch (e) {
    console.error('landing-chat error:', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
