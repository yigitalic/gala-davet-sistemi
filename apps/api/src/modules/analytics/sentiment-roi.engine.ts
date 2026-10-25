import { Injectable, Logger } from '@nestjs/common';
import { SentimentType, SocialPlatform } from '@prisma/client';

export interface SentimentAnalysisResult {
  sentiment: SentimentType;
  sentimentScore: number; // -1.00 ile +1.00 arası
  aiSummary: string; // 1 cümlelik özet
  matchedKeywords: string[];
}

export interface EmvCalculationParams {
  platform: SocialPlatform;
  reachEstimate: number;
  likesCount: number;
  commentsCount: number;
}

export interface EmvCalculationResult {
  emvUsd: number;
  emvTry: number;
  reachValueUsd: number;
  engagementValueUsd: number;
  platformMultiplier: number;
}

// ----------------------------------------------------------------------------
// TÜRKÇE & İNGİLİZCE SİNEMA VE PR ELEŞTİRİ DUYGU SÖZLÜĞÜ (DETERMİNİSTİK & HIZLI)
// ----------------------------------------------------------------------------
const POSITIVE_LEXICON = [
  // Türkçe Sinema / Prömiyer İfadeleri
  'başyapıt',
  'şaheser',
  'muhteşem',
  'büyüleyici',
  'kesinlikle izleyin',
  'kesinlikle gidin',
  'oyunculuklar harika',
  'görsel şölen',
  'soluksuz izledik',
  'soluksuz izledim',
  '10/10',
  'tam not',
  'harikaydı',
  'harika',
  'kusursuz',
  'tavsiye ederim',
  'enfes',
  'mükemmel',
  'çarpıcı',
  'bravo',
  'tebrikler',
  'bayıldım',
  'efsane',
  'etkileyici',
  'olağanüstü',
  'sürükleyici',
  'çok beğendim',
  'derinden etkiledi',
  'gözlerimi alamadım',
  'alkışı hak ediyor',
  'yılın en iyisi',
  // İngilizce Sinema İfadeleri
  'masterpiece',
  'incredible',
  'loved it',
  'must watch',
  'brilliant',
  'outstanding',
  'breathtaking',
  'unforgettable',
  'stellar',
  'phenomenal',
  'spectacular',
  'amazing',
  'fantastic',
  'superb',
  'astonishing',
];

const NEGATIVE_LEXICON = [
  // Türkçe Sinema Eleştirileri
  'hayal kırıklığı',
  'sıkıcı',
  'beklentimin altında',
  'zaman kaybı',
  'senaryo zayıf',
  'senaryo kötü',
  'beğenmedim',
  'kötü',
  'vasat',
  'fiyasko',
  'berbat',
  'tavsiye etmem',
  'başarısız',
  'olmamış',
  'facia',
  'kopuk',
  'beğenemedim',
  'zamanıma yazık',
  'hiç beğenmedim',
  'uyuyakaldım',
  'zoraki izledim',
  'klişelerle dolu',
  'mantık hataları',
  // İngilizce Sinema Eleştirileri
  'disappointment',
  'boring',
  'waste of time',
  'terrible',
  'awful',
  'bad',
  'mediocre',
  'fiasco',
  'poor',
  'flop',
  'underwhelming',
  'unwatchable',
  'dull',
  'predictable',
];

const NEUTRAL_LEXICON = [
  // Türkçe Katılım & Bilgilendirme İfadeleri
  'bu akşam galadayız',
  'galadayız',
  'premiere night',
  'gösterim başladı',
  'sinemadayız',
  'gala gecesi',
  'davet için teşekkürler',
  'film bitti',
  'vizyona giriyor',
  'kırmızı halı',
  'salondayız',
  'gösterim',
  'etkinlik',
  'kokteyl',
  'başladı',
  'katıldık',
  'özel gösterim',
  'basın gösterimi',
  // İngilizce
  'at the premiere',
  'red carpet',
  'screening started',
  'in theaters',
  'press screening',
  'attending',
  'premiering tonight',
];

@Injectable()
export class SentimentRoiEngine {
  private readonly logger = new Logger(SentimentRoiEngine.name);

  // Sabit USD/TRY kuru (kurumsal modelde yapılandırılabilir)
  private readonly usdToTryRate = 35.0;

  /**
   * Metni küçük harfe ve Türkçe karakter uyumuna çevirir
   */
  private normalizeText(text: string): string {
    return text
      .toLocaleLowerCase('tr-TR')
      .replace(/[\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 1. DUYGU ANALİZİ (SENTIMENT ANALYSIS) MOTORU
   * Deterministic Türkçe & İngilizce Sinema Sözlüğü + Çevrimdışı Güvenilirlik
   */
  analyzePostSentiment(
    captionText: string,
    movieTitle?: string,
  ): SentimentAnalysisResult {
    if (!captionText || captionText.trim().length === 0) {
      return {
        sentiment: SentimentType.NEUTRAL,
        sentimentScore: 0.0,
        aiSummary: 'Paylaşım metni bulunmuyor.',
        matchedKeywords: [],
      };
    }

    const normalized = this.normalizeText(captionText);

    const matchedPositive: string[] = [];
    const matchedNegative: string[] = [];
    const matchedNeutral: string[] = [];

    // Pozitif terim araması
    for (const term of POSITIVE_LEXICON) {
      if (normalized.includes(term)) {
        matchedPositive.push(term);
      }
    }

    // Negatif terim araması
    for (const term of NEGATIVE_LEXICON) {
      if (normalized.includes(term)) {
        matchedNegative.push(term);
      }
    }

    // Nötr terim araması
    for (const term of NEUTRAL_LEXICON) {
      if (normalized.includes(term)) {
        matchedNeutral.push(term);
      }
    }

    const posCount = matchedPositive.length;
    const negCount = matchedNegative.length;
    const neuCount = matchedNeutral.length;

    let sentiment: SentimentType = SentimentType.NEUTRAL;
    let sentimentScore = 0.05;
    let aiSummary = '';
    const filmName = movieTitle ? `"${movieTitle}"` : 'Film';

    // 1. Pozitif baskınsa
    if (posCount > negCount && posCount > 0) {
      sentiment = SentimentType.POSITIVE;
      // Skor: +0.60 ile +0.98 arası
      const bonus = Math.min(0.38, (posCount - 1) * 0.1);
      sentimentScore = parseFloat((0.65 + bonus).toFixed(2));
      const topKeywords = matchedPositive.slice(0, 3).join(', ');
      aiSummary = `${filmName} hakkında son derece coşkulu ve olumlu görüş bildirdi; '${topKeywords}' ifadeleriyle yapımı övdü.`;
    }
    // 2. Negatif baskınsa
    else if (negCount > posCount && negCount > 0) {
      sentiment = SentimentType.NEGATIVE;
      // Skor: -0.40 ile -0.95 arası
      const penalty = Math.min(0.55, (negCount - 1) * 0.12);
      sentimentScore = parseFloat((-0.45 - penalty).toFixed(2));
      const topKeywords = matchedNegative.slice(0, 3).join(', ');
      aiSummary = `${filmName} gösterimi sonrası hayal kırıklığı ve eleştiri paylaştı; '${topKeywords}' unsurlarına dikkat çekti.`;
    }
    // 3. Eşit veya sadece nötr ise
    else {
      sentiment = SentimentType.NEUTRAL;
      sentimentScore = posCount > 0 && negCount > 0 ? 0.0 : 0.08;
      if (neuCount > 0) {
        aiSummary = `Gala gecesi ve gösterim katılımını aktardı, etkinlik atmosferini ve kırmızı halıyı paylaştı.`;
      } else {
        aiSummary = `Etkinlikle ilgili genel bilgilendirme veya görsel paylaşımı yapıldı.`;
      }
    }

    const allMatched = [
      ...matchedPositive,
      ...matchedNegative,
      ...matchedNeutral,
    ];

    return {
      sentiment,
      sentimentScore,
      aiSummary,
      matchedKeywords: allMatched,
    };
  }

  /**
   * 2. REKLAM EŞDEĞERİ DEĞERİ (EARNED MEDIA VALUE - EMV) HESAPLAYICI
   * Endüstri Standardı PR/ROI Formülü:
   * EMV = (Erişim * Erişim_Katsayısı + Beğeni * Beğeni_Katsayısı + Yorum * Yorum_Katsayısı) * Platform_Çarpanı
   */
  calculateEmv(params: EmvCalculationParams): EmvCalculationResult {
    const { platform, reachEstimate, likesCount, commentsCount } = params;

    // Platform bazlı endüstriyel CPM & Etkileşim katsayıları ($)
    let reachRate = 0.015; // 1.000 gösterim başı 15$ -> gösterim başı 0.015$
    let likeRate = 0.2;
    let commentRate = 0.8;
    let platformMultiplier = 1.0;

    switch (platform) {
      case SocialPlatform.INSTAGRAM:
        reachRate = 0.016;
        likeRate = 0.22;
        commentRate = 0.85;
        platformMultiplier = 1.0;
        break;
      case SocialPlatform.TIKTOK:
        reachRate = 0.013;
        likeRate = 0.15;
        commentRate = 0.65;
        platformMultiplier = 1.15; // Viral erişim çarpanı
        break;
      case SocialPlatform.YOUTUBE:
        reachRate = 0.025; // Uzun vadeli izlenme & yüksek CPM
        likeRate = 0.35;
        commentRate = 1.25;
        platformMultiplier = 1.3;
        break;
      case SocialPlatform.X:
        reachRate = 0.01;
        likeRate = 0.12;
        commentRate = 0.55;
        platformMultiplier = 0.9;
        break;
      default:
        break;
    }

    const reachValueUsd = reachEstimate * reachRate;
    const engagementValueUsd =
      likesCount * likeRate + commentsCount * commentRate;
    const rawEmvUsd = (reachValueUsd + engagementValueUsd) * platformMultiplier;

    const emvUsd = parseFloat(rawEmvUsd.toFixed(2));
    const emvTry = parseFloat((emvUsd * this.usdToTryRate).toFixed(2));

    return {
      emvUsd,
      emvTry,
      reachValueUsd: parseFloat(reachValueUsd.toFixed(2)),
      engagementValueUsd: parseFloat(engagementValueUsd.toFixed(2)),
      platformMultiplier,
    };
  }
}
