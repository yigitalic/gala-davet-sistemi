import { Injectable, Logger } from '@nestjs/common';

export interface AiRsvpAnalysisResult {
  classification: 'CONFIRMED' | 'DECLINED' | 'UNCERTAIN';
  confidence: number;
  extractedPlusOne: number;
  extractedPlusOneNames: string | null;
  detectedQuestions: string[];
  hasSpecialRequest: boolean;
  reasoning: string;
  aiDraftReply: string;
}

export interface AnalyzeEmailContext {
  body: string;
  subject?: string;
  event?: {
    title: string;
    movieTitle: string;
    venue: string;
    startsAt: Date | string;
    doorsOpenAt: Date | string;
  };
  guest?: {
    firstName: string;
    lastName: string;
  };
}

@Injectable()
export class LlmRsvpAnalyzerService {
  private readonly logger = new Logger(LlmRsvpAnalyzerService.name);

  /**
   * Gelen e-posta metnini LLM Structured Output veya Deterministik NLP Motoru ile analiz eder.
   */
  async analyze(context: AnalyzeEmailContext): Promise<AiRsvpAnalysisResult> {
    const { body, subject = '', event, guest } = context;

    // 1. Katman: Eğer OPENAI_API_KEY veya ANTHROPIC_API_KEY tanımlıysa gerçek LLM çağrısını dener
    const openAiApiKey = process.env.OPENAI_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (openAiApiKey && openAiApiKey.startsWith('sk-')) {
      try {
        const liveResult = await this.callOpenAiStructuredOutput(context, openAiApiKey);
        if (liveResult) return liveResult;
      } catch (err: any) {
        this.logger.warn(`OpenAI çağrısı başarısız oldu, deterministik NLP motoruna geçiliyor: ${err?.message}`);
      }
    } else if (anthropicApiKey && anthropicApiKey.startsWith('sk-ant-')) {
      try {
        const liveResult = await this.callAnthropicStructuredOutput(context, anthropicApiKey);
        if (liveResult) return liveResult;
      } catch (err: any) {
        this.logger.warn(`Anthropic çağrısı başarısız oldu, deterministik NLP motoruna geçiliyor: ${err?.message}`);
      }
    }

    // 2. Katman: Gelişmiş Deterministik Türkçe & İngilizce NLP Karar Motoru (Offline/Fallback)
    return this.analyzeWithDeterministicNlp(body, subject, event, guest);
  }

  // GELİŞMİŞ DETERMINİSTİK TÜRKÇE & İNGİLİZCE NLP KARAR MOTORU
  public analyzeWithDeterministicNlp(
    body: string,
    subject = '',
    event?: AnalyzeEmailContext['event'],
    guest?: AnalyzeEmailContext['guest']
  ): AiRsvpAnalysisResult {
    const rawText = `${subject}\n${body}`.trim();
    const normalized = rawText.toLowerCase().replace(/['"’`]/g, '');

    // 1. Reddetme İfadeleri Tespiti (Öncelikli kontrol)
    const declinePatterns = [
      /\bkatılamıyorum\b/,
      /\bkatılamayacağım\b/,
      /\bkatılamayacağız\b/,
      /\bgelemeyeceğim\b/,
      /\bgelemeyeceğiz\b/,
      /\bgelemem\b/,
      /\bgelemeyiz\b/,
      /\bmaalesef\b/,
      /\bşehir dışındayım\b/,
      /\bşehir dışında olacağım\b/,
      /\byurt dışındayım\b/,
      /\byurt dışında olacağım\b/,
      /\bbaşka bir (?:programım|randevum|etkinliğim|planım) var\b/,
      /\bmüsait değilim\b/,
      /\bmüsait olamayacağım\b/,
      /\büzülerek\b/,
      /\bcannot attend\b/,
      /\bwill not be able\b/,
      /\bwon't be able\b/,
      /\bunable to attend\b/,
      /\bdecline\b/,
      /\bregretfully\b/,
    ];

    // 2. Belirsizlik İfadeleri Tespiti
    const uncertaintyPatterns = [
      /\bnetleştirip\b/,
      /\bnetleştirmeye çalışıyorum\b/,
      /\bprogramımı netleştirip\b/,
      /\bçekim takvimimi\b/,
      /\btakvimimi ayarlamaya çalışıyorum\b/,
      /\bkesin değil\b/,
      /\bnet değil\b/,
      /\bbelki\b/,
      /\bbakacağım\b/,
      /\bhaber vereceğim\b/,
      /\bdöneceğim\b/,
      /\bemin değilim\b/,
      /\bnot sure\b/,
      /\btentative\b/,
      /\bmight\b/,
      /\bwill let you know\b/,
      /\bconfirm later\b/,
      /\byarın (?:akşam|sabah|öğlen)? (?:netleştirip|bilgi|döneceğim)\b/,
    ];

    // 3. Onay İfadeleri Tespiti
    const confirmPatterns = [
      /\bkatılıyorum\b/,
      /\bkatılacağım\b/,
      /\bkatılacağız\b/,
      /\bgeleceğim\b/,
      /\bgeliyorum\b/,
      /\bgeliyoruz\b/,
      /\borada olacağım\b/,
      /\borada olacağız\b/,
      /\bmemnuniyetle\b/,
      /\bbüyük bir (?:zevk|memnuniyet|onur)le\b/,
      /\bharika haber\b/,
      /\bkesinlikle\b/,
      /\bdavetinizi kabul ediyorum\b/,
      /\bteyit\b/,
      /\bteyit ediyorum\b/,
      /\battending\b/,
      /\bwill attend\b/,
      /\bconfirmed\b/,
      /\blooking forward\b/,
      /\bcount me in\b/,
    ];

    let hasDecline = declinePatterns.some((pattern) => pattern.test(normalized));
    let hasUncertainty = uncertaintyPatterns.some((pattern) => pattern.test(normalized));
    let hasConfirm = confirmPatterns.some((pattern) => pattern.test(normalized));

    // Çelişki Çözümlemesi:
    // Eğer hem "katıl..." hem de "maalesef/yurt dışında" varsa, decline ağır basar ("katılamıyorum" durumu)
    if (hasDecline && hasConfirm) {
      if (
        normalized.includes('katılamıyorum') ||
        normalized.includes('katılamayacağım') ||
        normalized.includes('maalesef') ||
        normalized.includes('gelemeyeceğim')
      ) {
        hasConfirm = false;
      }
    }

    // 4. +1 ve Refakatçi İsim Çıkarımı
    let extractedPlusOne = 0;
    let extractedPlusOneNames: string | null = null;

    // +1 Refakatçi regex'leri
    // "Eşim Ayşe Yılmaz ile" veya "Eşim Ayşe Yılmaz ile birlikte"
    const namedSpouseRegex = /(?:eşim|refakatçim|arkadaşım|nişanlım|sevgilim|asistanım|ortağım)\s+([A-ZÇĞİÖŞÜa-zçğıöşü]+(?:\s+[A-ZÇĞİÖŞÜa-zçğıöşü]+)+)\s+ile/i;
    const namedMatch = rawText.match(namedSpouseRegex);

    if (namedMatch && namedMatch[1]) {
      const candidateName = namedMatch[1].trim();
      const lowerCandidate = candidateName.toLowerCase();
      const blacklistWords = ['birlikte', 'beraber', 'katılacağım', 'geleceğim', 'katılıyorum', 'geliyorum'];
      const isClean = !blacklistWords.some((w) => lowerCandidate.includes(w));
      if (isClean && candidateName.length >= 3) {
        extractedPlusOne = 1;
        extractedPlusOneNames = candidateName;
      }
    }

    if (extractedPlusOne === 0) {
      // "Eşimle", "Refakatçimle", "+1", "iki kişi", "2 arkadaşımla"
      const multiFriendRegex = /(?:ekibimden|yanımda)?\s*(\d+)\s*(?:arkadaşımla|kişiyle|meslektaşımla)/i;
      const multiMatch = normalized.match(multiFriendRegex);

      if (multiMatch && multiMatch[1]) {
        extractedPlusOne = parseInt(multiMatch[1], 10);
      } else if (
        normalized.includes('eşimle') ||
        normalized.includes('eşim ile') ||
        normalized.includes('nişanlımla') ||
        normalized.includes('sevgilimle') ||
        normalized.includes('arkadaşımla') ||
        normalized.includes('refakatçimle') ||
        normalized.includes('asistanımla') ||
        normalized.includes('ortağımla') ||
        normalized.includes('+1') ||
        normalized.includes('artı bir') ||
        /\b2 kişi\b/.test(normalized) ||
        /\biki kişi\b/.test(normalized) ||
        /\b2 bilet\b/.test(normalized)
      ) {
        extractedPlusOne = 1;
      } else if (/\b3 kişi\b/.test(normalized) || /\büç kişi\b/.test(normalized)) {
        extractedPlusOne = 2;
      }
    }

    // 5. Özel Soru Tespiti (detectedQuestions)
    const detectedQuestions: string[] = [];

    // Kokteyl / Kapı Açılış Saati
    if (
      normalized.includes('saat kaçta') ||
      normalized.includes('kaçta başlıyor') ||
      normalized.includes('kaçta açılıyor') ||
      (normalized.includes('kokteyl') && (normalized.includes('kaçta') || normalized.includes('saat') || normalized.includes('?')))
    ) {
      detectedQuestions.push('Kokteyl saat kaçta başlıyor?');
    }

    // Vale / Otopark
    if (
      normalized.includes('vale') ||
      normalized.includes('otopark') ||
      normalized.includes('park yeri') ||
      normalized.includes('arabayı nereye') ||
      normalized.includes('araç park')
    ) {
      detectedQuestions.push('Mekanda vale veya otopark imkanı var mı?');
    }

    // Dress Code / Kıyafet Kuralı
    if (
      normalized.includes('dress code') ||
      normalized.includes('kıyafet') ||
      normalized.includes('ne giyilecek') ||
      normalized.includes('kıyafet kuralı') ||
      normalized.includes('black tie')
    ) {
      detectedQuestions.push('Dress code (kıyafet kuralı) nedir?');
    }

    // İkram / Menü
    if (
      normalized.includes('menü') ||
      normalized.includes('yemek') ||
      normalized.includes('ikram') ||
      normalized.includes('vejetaryen') ||
      normalized.includes('vegan')
    ) {
      detectedQuestions.push('Gala gecesi ikram veya menü detayları nelerdir?');
    }

    // Genel Soru İşareti Yakalama
    if (detectedQuestions.length === 0 && normalized.includes('?')) {
      const sentences = rawText.split(/[.!\n]+/);
      for (const sentence of sentences) {
        if (sentence.includes('?')) {
          const trimmed = sentence.trim();
          if (trimmed.length > 5 && !detectedQuestions.includes(trimmed)) {
            detectedQuestions.push(trimmed);
          }
        }
      }
    }

    // 6. Özel İstek (hasSpecialRequest)
    const specialRequestKeywords = [
      'ön sıra',
      'protokol',
      'vejetaryen',
      'vegan',
      'glütensiz',
      'röportaj',
      'basın röportajı',
      'kamera',
      'özel araç',
      'özel masa',
      'tekerlekli sandalye',
      'engelli',
      'vip lounge',
    ];
    const hasSpecialRequest = specialRequestKeywords.some((kw) => normalized.includes(kw));

    // 7. Sınıflandırma ve Güven Skoru Belirleme
    let classification: 'CONFIRMED' | 'DECLINED' | 'UNCERTAIN' = 'UNCERTAIN';
    let confidence = 0.5;
    let reasoning = '';

    if (hasDecline) {
      classification = 'DECLINED';
      confidence = 0.96;
      reasoning = 'Davetli e-postasında galaya katılamayacağını, şehir/yurt dışında olduğunu veya mazeretini net bir dille bildirdi.';
    } else if (hasConfirm && !hasUncertainty) {
      classification = 'CONFIRMED';
      confidence = detectedQuestions.length > 0 ? 0.92 : 0.97;
      reasoning = `Davetli katılımını net şekilde teyit etti.${
        extractedPlusOne > 0 ? ` +${extractedPlusOne} refakatçi talebi algılandı.` : ''
      }${detectedQuestions.length > 0 ? ' Ancak operasyonel sorular içeriyor.' : ''}`;
    } else if (hasUncertainty) {
      classification = 'UNCERTAIN';
      confidence = 0.65;
      reasoning = 'Davetli programını veya çekim takvimini henüz netleştirmediğini, daha sonra bilgi vereceğini belirtti.';
    } else {
      classification = 'UNCERTAIN';
      confidence = 0.45;
      reasoning = 'E-posta gövdesinde kesin onay veya red ifadesi tespit edilemedi, belirsiz yanıt.';
    }

    // 8. Kişiselleştirilmiş AI Yanıt Taslağı Üretimi (aiDraftReply)
    const aiDraftReply = this.generateDraftReply({
      classification,
      guest,
      event,
      extractedPlusOne,
      extractedPlusOneNames,
      detectedQuestions,
    });

    return {
      classification,
      confidence: Number(confidence.toFixed(2)),
      extractedPlusOne,
      extractedPlusOneNames,
      detectedQuestions,
      hasSpecialRequest,
      reasoning,
      aiDraftReply,
    };
  }

  // KURUMSAL GALA PR YANIT TASLAĞI ÜRETİCİSİ
  private generateDraftReply(params: {
    classification: 'CONFIRMED' | 'DECLINED' | 'UNCERTAIN';
    guest?: AnalyzeEmailContext['guest'];
    event?: AnalyzeEmailContext['event'];
    extractedPlusOne: number;
    extractedPlusOneNames: string | null;
    detectedQuestions: string[];
  }): string {
    const { classification, guest, event, extractedPlusOne, extractedPlusOneNames, detectedQuestions } = params;

    const guestTitle = guest?.firstName ? `Sayın ${guest.firstName} ${guest.lastName || ''}`.trim() : 'Sayın Davetlimiz';
    const movieTitle = event?.movieTitle || 'merakla beklenen filmimizin';
    const venue = event?.venue || 'Zorlu PSM Turkcell Sahnesi';

    let startsAtStr = '20:30';
    let doorsOpenAtStr = '19:30';

    if (event?.startsAt) {
      try {
        const d = new Date(event.startsAt);
        startsAtStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      } catch {}
    }
    if (event?.doorsOpenAt) {
      try {
        const d = new Date(event.doorsOpenAt);
        doorsOpenAtStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      } catch {}
    }

    const lines: string[] = [];
    lines.push(`${guestTitle},`);
    lines.push('');

    if (classification === 'CONFIRMED') {
      lines.push(
        `"${movieTitle}" filminin Türkiye Galası davetimize göstermiş olduğunuz ilgi ve katılım teyidiniz için teşekkür ederiz. Aramızda olmanızdan büyük onur duyacağız.`
      );

      if (extractedPlusOne > 0) {
        if (extractedPlusOneNames) {
          lines.push(
            `Refakatçiniz ${extractedPlusOneNames} ile birlikte katılımınız (${extractedPlusOne + 1} kişilik rezervasyon) memnuniyetle işleme alınmıştır.`
          );
        } else {
          lines.push(
            `Yanınızda katılacak ${extractedPlusOne} kişilik refakatçi talebiniz protokol listemize eklenmiştir.`
          );
        }
      }

      // Sorulara Özel Yanıtlar
      if (detectedQuestions.length > 0) {
        lines.push('');
        lines.push('E-postanızda sormuş olduğunuz operasyonel detaylara istinaden:');

        for (const q of detectedQuestions) {
          if (q.includes('Kokteyl') || q.includes('kaçta')) {
            lines.push(
              `• Kapı Açılışı & Kokteyl: Kokteyl resepsiyonumuz ve kırmızı halı karşılama saat ${doorsOpenAtStr}'da başlayacak, gala gösterimi ise saat ${startsAtStr}'da gerçekleştirilecektir.`
            );
          }
          if (q.includes('vale') || q.includes('otopark')) {
            lines.push(
              `• Vale & Otopark: ${venue} ana girişinde protokol ve VIP davetlilerimiz için ücretsiz vale ve otopark hizmetimiz hazır bulunacaktır.`
            );
          }
          if (q.includes('Dress code') || q.includes('kıyafet')) {
            lines.push(
              '• Kıyafet Kuralı: Gala gecemizin dress code konsepti "Black Tie / Kırmızı Halı Şıklığı" olarak belirlenmiştir.'
            );
          }
          if (q.includes('menü') || q.includes('ikram')) {
            lines.push(
              '• İkramlar: Kokteyl süresince gurme ikramlar ve içecek servisi sunulacaktır. Özel menü talepleriniz için lütfen bize önceden bilgi veriniz.'
            );
          }
        }
      }

      lines.push('');
      lines.push(
        'Dinamik kriptografik biletinize davetiye e-postasındaki bağlantıdan dilediğiniz an erişebilirsiniz. Kırmızı halıda görüşmek dileğiyle.'
      );
    } else if (classification === 'DECLINED') {
      lines.push(
        `"${movieTitle}" filminin Türkiye Galası'na katılamayacağınızı üzüntüyle öğrendik. Yoğun programınızda başarılar diler, bir sonraki özel gösterim ve gala organizasyonumuzda sizi ağırlamaktan onur duyarız.`
      );
    } else {
      // UNCERTAIN
      lines.push(
        `"${movieTitle}" filminin Türkiye Galası davetimize geri dönüşünüz için teşekkür ederiz.`
      );
      lines.push(
        'Programınızı netleştirdiğinizde katılım durumunuzu bu e-postayı yanıtlayarak bildirebilirsiniz.'
      );

      if (detectedQuestions.length > 0) {
        lines.push('');
        lines.push('Merak ettiğiniz hususlarla ilgili ön bilgilendirme:');
        lines.push(`• Mekan & Saat: ${venue} salonunda saat ${doorsOpenAtStr}'da kapılar açılacak ve kokteyl başlayacaktır.`);
        lines.push('• Vale Hizmeti: Mekanda VIP davetlilerimiz için vale hizmetimiz aktif olacaktır.');
      }

      lines.push('');
      lines.push(
        'Salon oturma planlaması gereği katılım durumunuzu en kısa sürede netleştirmenizi rica ederiz.'
      );
    }

    lines.push('');
    lines.push('Saygılarımızla,');
    lines.push('Gala PR & Protokol Operasyon Ekibi');

    return lines.join('\n');
  }

  // OPENAI STRUCTURED OUTPUT ENTEGRASYONU (Canlı Mod)
  private async callOpenAiStructuredOutput(
    context: AnalyzeEmailContext,
    apiKey: string
  ): Promise<AiRsvpAnalysisResult | null> {
    const prompt = `Gala davetiyesine gelen şu yanıt e-postasını analiz et:
Konu: ${context.subject || 'Gala Davetiye Yanıtı'}
Gövde:
${context.body}

Etkinlik: ${context.event?.movieTitle || 'Film Galası'}, Mekan: ${context.event?.venue || 'Zorlu PSM'}
Kapı Açılışı: ${context.event?.doorsOpenAt || '19:30'}, Başlangıç: ${context.event?.startsAt || '20:30'}
Davetli: ${context.guest?.firstName || ''} ${context.guest?.lastName || ''}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Sen sinema galası ve protokol davetiyeleri için uzman bir PR asistanısın. Gelen yanıtları JSON formatında analiz et.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI HTTP ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return {
      classification: parsed.classification || 'UNCERTAIN',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
      extractedPlusOne: typeof parsed.extractedPlusOne === 'number' ? parsed.extractedPlusOne : 0,
      extractedPlusOneNames: parsed.extractedPlusOneNames || null,
      detectedQuestions: Array.isArray(parsed.detectedQuestions) ? parsed.detectedQuestions : [],
      hasSpecialRequest: Boolean(parsed.hasSpecialRequest),
      reasoning: parsed.reasoning || 'OpenAI analizi tamamlandı.',
      aiDraftReply: parsed.aiDraftReply || this.generateDraftReply({
        classification: parsed.classification || 'UNCERTAIN',
        guest: context.guest,
        event: context.event,
        extractedPlusOne: parsed.extractedPlusOne || 0,
        extractedPlusOneNames: parsed.extractedPlusOneNames || null,
        detectedQuestions: parsed.detectedQuestions || [],
      }),
    };
  }

  // ANTHROPIC STRUCTURED OUTPUT ENTEGRASYONU (Canlı Mod)
  private async callAnthropicStructuredOutput(
    context: AnalyzeEmailContext,
    apiKey: string
  ): Promise<AiRsvpAnalysisResult | null> {
    const prompt = `Gala davetiyesine gelen şu yanıt e-postasını analiz et ve sadece JSON olarak yanıt ver:
{
  "classification": "CONFIRMED" | "DECLINED" | "UNCERTAIN",
  "confidence": number,
  "extractedPlusOne": number,
  "extractedPlusOneNames": string | null,
  "detectedQuestions": string[],
  "hasSpecialRequest": boolean,
  "reasoning": string,
  "aiDraftReply": string
}

Gelen E-posta:
${context.body}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic HTTP ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const content = data?.content?.[0]?.text;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return {
      classification: parsed.classification || 'UNCERTAIN',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
      extractedPlusOne: typeof parsed.extractedPlusOne === 'number' ? parsed.extractedPlusOne : 0,
      extractedPlusOneNames: parsed.extractedPlusOneNames || null,
      detectedQuestions: Array.isArray(parsed.detectedQuestions) ? parsed.detectedQuestions : [],
      hasSpecialRequest: Boolean(parsed.hasSpecialRequest),
      reasoning: parsed.reasoning || 'Anthropic analizi tamamlandı.',
      aiDraftReply: parsed.aiDraftReply || this.generateDraftReply({
        classification: parsed.classification || 'UNCERTAIN',
        guest: context.guest,
        event: context.event,
        extractedPlusOne: parsed.extractedPlusOne || 0,
        extractedPlusOneNames: parsed.extractedPlusOneNames || null,
        detectedQuestions: parsed.detectedQuestions || [],
      }),
    };
  }
}
