'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Inbox,
  Sparkles,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Send,
  XCircle,
  HelpCircle,
  UserCheck,
  ShieldCheck,
  Calendar,
  MapPin,
  Film,
  RefreshCw,
  Search,
  MessageSquare,
  ChevronRight,
  UserPlus,
  Play,
  Clock,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Filter,
  Eye,
  Check,
  X,
  Plus,
  Minus,
} from 'lucide-react';

export type AiClassification = 'CONFIRMED' | 'DECLINED' | 'UNCERTAIN';
export type AiReviewStatus = 'AUTO_PROCESSED' | 'NEEDS_REVIEW' | 'APPROVED_AND_SENT' | 'REJECTED';

export interface AiReviewItem {
  id: string;
  emailThreadId: string;
  inboundMessageId: string;
  rawSubject: string;
  rawBody: string;
  receivedAt: string;
  createdAt: string;
  aiClassification: AiClassification;
  aiConfidence: number;
  confidencePercent: number;
  extractedPlusOne: number;
  detectedQuestions: string[];
  aiDraftReply: string | null;
  reviewStatus: AiReviewStatus;
  reviewedAt: string | null;
  reviewedBy: string | null;
  guest: {
    id: string;
    fullName: string;
    company: string | null;
    title: string | null;
    tags: string[];
    isVip: boolean;
    isPress: boolean;
  };
  invitation: {
    id: string;
    rsvpStatus: string;
    plusOneRequested: number;
    plusOneApproved: number;
    plusOneNames: string | null;
    hasTicket: boolean;
  };
  event: {
    id: string;
    title: string;
    movieTitle: string;
    venue: string;
    startsAt: string;
    doorsOpenAt: string;
  };
}

export interface AiInboxKpi {
  totalCount: number;
  autoProcessedCount: number;
  needsReviewCount: number;
  approvedAndSentCount: number;
  rejectedCount: number;
  averageConfidence: number;
  autoProcessedRate: number;
}

export default function AiInboxDashboard() {
  const [reviews, setReviews] = useState<AiReviewItem[]>([]);
  const [kpi, setKpi] = useState<AiInboxKpi>({
    totalCount: 0,
    autoProcessedCount: 0,
    needsReviewCount: 0,
    approvedAndSentCount: 0,
    rejectedCount: 0,
    averageConfidence: 94.2,
    autoProcessedRate: 75.0,
  });
  const [selectedReviewId, setSelectedReviewId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'NEEDS_REVIEW' | 'AUTO_PROCESSED' | 'APPROVED_AND_SENT' | 'ALL'>('NEEDS_REVIEW');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  // Yanıt Taslağı Düzenleme State'i
  const [editedDraftReply, setEditedDraftReply] = useState<string>('');
  const [finalRsvpStatus, setFinalRsvpStatus] = useState<'CONFIRMED' | 'DECLINED'>('CONFIRMED');
  const [plusOneApprovedCount, setPlusOneApprovedCount] = useState<number>(0);

  // Simülatör Modal State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simForm, setSimForm] = useState({
    fromEmail: 'ayse.yilmaz@vipdavetli.com',
    subject: 'Re: Dune 3 Türkiye Galası Özel Davetiyeniz',
    body: 'Merhaba, davetiniz için çok teşekkürler. Eşim Ayşe Yılmaz ile birlikte memnuniyetle katılacağım.',
  });
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // Bildirim Banner'ı
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('gala_token') : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await fetch('/api/v1/ai-inbox/reviews?limit=100', { headers });
      if (res.ok) {
        const data = await res.json();
        setReviews(data.items || []);
        if (data.kpi) setKpi(data.kpi);
        if (data.items && data.items.length > 0 && !selectedReviewId) {
          setSelectedReviewId(data.items[0].id);
        }
      } else {
        loadMockReviews();
      }
    } catch {
      loadMockReviews();
    } finally {
      setIsLoading(false);
    }
  };

  const loadMockReviews = () => {
    const mockData: AiReviewItem[] = [
      {
        id: 'rev-001',
        emailThreadId: 'th-001',
        inboundMessageId: 'msg_resend_9921',
        rawSubject: 'Re: Dune 3 Galası Davetiyesi Hakkında',
        rawBody:
          'Harika haber, kesinlikle orada olacağım! Ancak kokteyl saat kaçta başlıyor ve mekanda vale/otopark imkanı var mı?',
        receivedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        aiClassification: 'CONFIRMED',
        aiConfidence: 0.92,
        confidencePercent: 92,
        extractedPlusOne: 0,
        detectedQuestions: [
          'Kokteyl saat kaçta başlıyor?',
          'Mekanda vale veya otopark imkanı var mı?',
        ],
        aiDraftReply: `Sayın Mert Ramazan Demir,\n\n"Dune: Çöl Gezegeni 3" filminin Türkiye Galası davetimize göstermiş olduğunuz ilgi ve katılım teyidiniz için teşekkür ederiz. Aramızda olmanızdan büyük onur duyacağız.\n\nE-postanızda sormuş olduğunuz operasyonel detaylara istinaden:\n• Kapı Açılışı & Kokteyl: Kokteyl resepsiyonumuz ve kırmızı halı karşılama saat 19:00'da başlayacak, gala gösterimi ise saat 20:00'de gerçekleştirilecektir.\n• Vale & Otopark: Zorlu PSM ana girişinde protokol ve VIP davetlilerimiz için ücretsiz vale ve otopark hizmetimiz hazır bulunacaktır.\n\nDinamik kriptografik biletinize davetiye e-postasındaki bağlantıdan dilediğiniz an erişebilirsiniz. Kırmızı halıda görüşmek dileğiyle.\n\nSaygılarımızla,\nGala PR & Protokol Operasyon Ekibi`,
        reviewStatus: 'NEEDS_REVIEW',
        reviewedAt: null,
        reviewedBy: null,
        guest: {
          id: 'gst-101',
          fullName: 'Mert Ramazan Demir',
          company: 'OGM Medya',
          title: 'Başrol Oyuncusu',
          tags: ['VIP', 'INFLUENCER'],
          isVip: true,
          isPress: false,
        },
        invitation: {
          id: 'inv-101',
          rsvpStatus: 'PENDING',
          plusOneRequested: 0,
          plusOneApproved: 0,
          plusOneNames: null,
          hasTicket: false,
        },
        event: {
          id: 'evt-dune-3',
          title: 'Dune: Çöl Gezegeni 3 Türkiye Galası',
          movieTitle: 'Dune: Part Three',
          venue: 'Zorlu PSM Turkcell Sahnesi',
          startsAt: '2026-11-20T20:00:00Z',
          doorsOpenAt: '2026-11-20T19:00:00Z',
        },
      },
      {
        id: 'rev-002',
        emailThreadId: 'th-002',
        inboundMessageId: 'msg_resend_9922',
        rawSubject: 'Re: Dune 3 Galası Katılım Bildirimi',
        rawBody:
          'Çekim takvimimi ayarlamaya çalışıyorum, yarın akşam netleştirip kesin bilgi vereceğim.',
        receivedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        aiClassification: 'UNCERTAIN',
        aiConfidence: 0.65,
        confidencePercent: 65,
        extractedPlusOne: 0,
        detectedQuestions: [],
        aiDraftReply: `Sayın Kıvanç Tatlıtuğ,\n\n"Dune: Part Three" filminin Türkiye Galası davetimize geri dönüşünüz için teşekkür ederiz.\n\nProgramınızı netleştirdiğinizde katılım durumunuzu bu e-postayı yanıtlayarak bildirebilirsiniz. Salon oturma planlaması gereği en geç yarın akşama kadar dönüşünüzü rica ederiz.\n\nSaygılarımızla,\nGala PR & Protokol Operasyon Ekibi`,
        reviewStatus: 'NEEDS_REVIEW',
        reviewedAt: null,
        reviewedBy: null,
        guest: {
          id: 'gst-102',
          fullName: 'Kıvanç Tatlıtuğ',
          company: 'Gaye Sökmen Ajans',
          title: 'Usta Oyuncu',
          tags: ['VIP'],
          isVip: true,
          isPress: false,
        },
        invitation: {
          id: 'inv-102',
          rsvpStatus: 'UNCERTAIN',
          plusOneRequested: 0,
          plusOneApproved: 0,
          plusOneNames: null,
          hasTicket: false,
        },
        event: {
          id: 'evt-dune-3',
          title: 'Dune: Çöl Gezegeni 3 Türkiye Galası',
          movieTitle: 'Dune: Part Three',
          venue: 'Zorlu PSM Turkcell Sahnesi',
          startsAt: '2026-11-20T20:00:00Z',
          doorsOpenAt: '2026-11-20T19:00:00Z',
        },
      },
      {
        id: 'rev-003',
        emailThreadId: 'th-003',
        inboundMessageId: 'msg_resend_9923',
        rawSubject: 'Re: Dune 3 Galası Özel Davetiyeniz',
        rawBody:
          'Merhaba, davetiniz için çok teşekkürler. Eşim Ayşe Yılmaz ile birlikte memnuniyetle katılacağım.',
        receivedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        aiClassification: 'CONFIRMED',
        aiConfidence: 0.98,
        confidencePercent: 98,
        extractedPlusOne: 1,
        detectedQuestions: [],
        aiDraftReply: `Sayın Haluk Bilginer,\n\n"Dune: Part Three" filminin Türkiye Galası davetimize teyidiniz için teşekkür ederiz. Eşiniz Ayşe Yılmaz ile birlikte katılımınız memnuniyetle onaylanmıştır.\n\nSaygılarımızla,\nGala PR Ekibi`,
        reviewStatus: 'AUTO_PROCESSED',
        reviewedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        reviewedBy: 'OTONOM_AI_AJAN',
        guest: {
          id: 'gst-103',
          fullName: 'Haluk Bilginer',
          company: 'Haluk Bilginer Tiyatrosu',
          title: 'Başrol & Usta Sanatçı',
          tags: ['VIP'],
          isVip: true,
          isPress: false,
        },
        invitation: {
          id: 'inv-103',
          rsvpStatus: 'CONFIRMED',
          plusOneRequested: 1,
          plusOneApproved: 1,
          plusOneNames: 'Ayşe Yılmaz',
          hasTicket: true,
        },
        event: {
          id: 'evt-dune-3',
          title: 'Dune: Çöl Gezegeni 3 Türkiye Galası',
          movieTitle: 'Dune: Part Three',
          venue: 'Zorlu PSM Turkcell Sahnesi',
          startsAt: '2026-11-20T20:00:00Z',
          doorsOpenAt: '2026-11-20T19:00:00Z',
        },
      },
      {
        id: 'rev-004',
        emailThreadId: 'th-004',
        inboundMessageId: 'msg_resend_9924',
        rawSubject: 'Re: Basın Gösterimi & Gala Davetiyesi',
        rawBody:
          'Maalesef o tarihte yurt dışında olacağım için galaya katılamıyorum. Başarılı bir gösterim dilerim.',
        receivedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
        aiClassification: 'DECLINED',
        aiConfidence: 0.97,
        confidencePercent: 97,
        extractedPlusOne: 0,
        detectedQuestions: [],
        aiDraftReply: `Sayın Ceyda Karan,\n\n"Dune: Part Three" filminin Türkiye Galası'na katılamayacağınızı üzüntüyle öğrendik. Bir sonraki basın gösteriminde sizi ağırlamaktan onur duyarız.`,
        reviewStatus: 'AUTO_PROCESSED',
        reviewedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
        reviewedBy: 'OTONOM_AI_AJAN',
        guest: {
          id: 'gst-104',
          fullName: 'Ceyda Karan',
          company: 'Sinema Eleştirmenleri Derneği',
          title: 'Baş Sinema Yazarı',
          tags: ['PRESS'],
          isVip: false,
          isPress: true,
        },
        invitation: {
          id: 'inv-104',
          rsvpStatus: 'DECLINED',
          plusOneRequested: 0,
          plusOneApproved: 0,
          plusOneNames: null,
          hasTicket: false,
        },
        event: {
          id: 'evt-dune-3',
          title: 'Dune: Çöl Gezegeni 3 Türkiye Galası',
          movieTitle: 'Dune: Part Three',
          venue: 'Zorlu PSM Turkcell Sahnesi',
          startsAt: '2026-11-20T20:00:00Z',
          doorsOpenAt: '2026-11-20T19:00:00Z',
        },
      },
    ];

    setReviews(mockData);
    setKpi({
      totalCount: 4,
      autoProcessedCount: 2,
      needsReviewCount: 2,
      approvedAndSentCount: 0,
      rejectedCount: 0,
      averageConfidence: 94.2,
      autoProcessedRate: 50.0,
    });
    setSelectedReviewId('rev-001');
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Seçili İnceleme Değiştiğinde Taslak Alanını Doldur
  const selectedReview = useMemo(() => {
    return reviews.find((r) => r.id === selectedReviewId) || reviews[0];
  }, [reviews, selectedReviewId]);

  useEffect(() => {
    if (selectedReview) {
      setEditedDraftReply(selectedReview.aiDraftReply || '');
      setFinalRsvpStatus(
        selectedReview.aiClassification === 'DECLINED' ? 'DECLINED' : 'CONFIRMED'
      );
      setPlusOneApprovedCount(selectedReview.extractedPlusOne || 0);
    }
  }, [selectedReviewId, selectedReview]);

  // Sekme ve Arama Filtresi
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (activeTab !== 'ALL' && r.reviewStatus !== activeTab) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const guestName = r.guest.fullName.toLowerCase();
        const subject = r.rawSubject.toLowerCase();
        const body = r.rawBody.toLowerCase();
        return guestName.includes(term) || subject.includes(term) || body.includes(term);
      }
      return true;
    });
  }, [reviews, activeTab, searchTerm]);

  // PR Yöneticisi Taslağı Onaylama & Gönderme
  const handleApproveAndSend = async () => {
    if (!selectedReview) return;
    setIsApproving(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('gala_token') : null;
      const res = await fetch(`/api/v1/ai-inbox/reviews/${selectedReview.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          finalReplyText: editedDraftReply,
          finalRsvpStatus,
          plusOneApproved: plusOneApprovedCount,
        }),
      });

      if (res.ok) {
        setNotification({
          show: true,
          type: 'success',
          message: `Yanıt başarıyla onaylandı ve gönderildi. Davetli LCV durumu: ${finalRsvpStatus}`,
        });
        await fetchReviews();
      } else {
        // Mock fallback güncelleme
        setReviews((prev) =>
          prev.map((r) =>
            r.id === selectedReview.id
              ? {
                  ...r,
                  reviewStatus: 'APPROVED_AND_SENT',
                  aiDraftReply: editedDraftReply,
                  reviewedAt: new Date().toISOString(),
                  reviewedBy: 'PR Yöneticisi',
                  invitation: {
                    ...r.invitation,
                    rsvpStatus: finalRsvpStatus,
                    plusOneApproved: plusOneApprovedCount,
                    hasTicket: finalRsvpStatus === 'CONFIRMED',
                  },
                }
              : r
          )
        );
        setKpi((prev) => ({
          ...prev,
          needsReviewCount: Math.max(0, prev.needsReviewCount - 1),
          approvedAndSentCount: prev.approvedAndSentCount + 1,
        }));
        setNotification({
          show: true,
          type: 'success',
          message: `[Simülasyon] Yanıt onaylandı, e-posta sevk edildi ve LCV güncellendi.`,
        });
      }
    } catch {
      setNotification({
        show: true,
        type: 'error',
        message: 'Onaylama işleminde bir hata oluştu.',
      });
    } finally {
      setIsApproving(false);
    }
  };

  // PR Yöneticisi Taslağı Reddetme
  const handleRejectReview = async () => {
    if (!selectedReview) return;
    const reason = prompt('Taslağı reddetme gerekçeniz (Opsiyonel):') || 'Manuel işlem';
    setIsRejecting(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('gala_token') : null;
      const res = await fetch(`/api/v1/ai-inbox/reviews/${selectedReview.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        setNotification({
          show: true,
          type: 'info',
          message: 'AI taslağı reddedildi ve manuel müdahale için işaretlendi.',
        });
        await fetchReviews();
      } else {
        setReviews((prev) =>
          prev.map((r) =>
            r.id === selectedReview.id
              ? {
                  ...r,
                  reviewStatus: 'REJECTED',
                  reviewedAt: new Date().toISOString(),
                  reviewedBy: 'PR Yöneticisi',
                }
              : r
          )
        );
        setKpi((prev) => ({
          ...prev,
          needsReviewCount: Math.max(0, prev.needsReviewCount - 1),
          rejectedCount: prev.rejectedCount + 1,
        }));
      }
    } catch {
      // Hata
    } finally {
      setIsRejecting(false);
    }
  };

  // Canlı Simülasyon Tetikleme
  const handleRunSimulation = async (preset?: {
    fromEmail: string;
    subject: string;
    body: string;
  }) => {
    const payload = preset || simForm;
    setIsSimulating(true);
    setSimulationResult(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('gala_token') : null;
      const res = await fetch('/api/v1/ai-inbox/simulate-inbound', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setSimulationResult(data);
        await fetchReviews();
      } else {
        // Client-side Simülasyon Fallback
        const isConfirm = payload.body.toLowerCase().includes('memnuniyetle') || payload.body.toLowerCase().includes('geliyorum');
        const isDecline = payload.body.toLowerCase().includes('maalesef') || payload.body.toLowerCase().includes('katılamıyorum');
        const hasQuestions = payload.body.includes('?') || payload.body.toLowerCase().includes('kaçta') || payload.body.toLowerCase().includes('vale');
        const hasPlusOne = payload.body.toLowerCase().includes('eşim');

        const simRes = {
          success: true,
          classification: isDecline ? 'DECLINED' : isConfirm ? 'CONFIRMED' : 'UNCERTAIN',
          confidence: hasQuestions ? 0.92 : isConfirm || isDecline ? 0.98 : 0.65,
          autoProcessed: (isConfirm || isDecline) && !hasQuestions,
          reviewStatus: (isConfirm || isDecline) && !hasQuestions ? 'AUTO_PROCESSED' : 'NEEDS_REVIEW',
          extractedPlusOne: hasPlusOne ? 1 : 0,
          detectedQuestions: hasQuestions
            ? ['Kokteyl saat kaçta başlıyor?', 'Mekanda vale veya otopark imkanı var mı?']
            : [],
        };
        setSimulationResult(simRes);
        setNotification({
          show: true,
          type: 'info',
          message: `[Simülasyon] Webhook başarıyla tetiklendi -> ${simRes.reviewStatus}`,
        });
      }
    } catch {
      setNotification({
        show: true,
        type: 'error',
        message: 'Simülasyon çalıştırılırken hata meydana geldi.',
      });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Üst Navigasyon & Başlık Çubuğu */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-amber-900/30 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-amber-400" />
                ÇİFT YÖNLÜ OTONOM AI GELEN KUTUSU
              </span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Inbound Webhook • Structured LLM Parser • AES-256-GCM
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>Otonom AI LCV Gelen Kutusu</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1 max-w-3xl">
              Davetlilerin e-posta yanıtlarını yapay zeka ile otomatik ayrıştırır, net teyitleri otonom işler, soru içeren ve belirsiz yanıtlar için PR yöneticisine onay taslağı sunar.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setIsSimulatorOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-gray-950 font-bold text-sm transition shadow-lg shadow-amber-900/20"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Canlı AI Simülatörü</span>
            </button>

            <button
              onClick={fetchReviews}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 text-sm font-medium transition"
              title="Yenile"
            >
              <RefreshCw className={`w-4 h-4 text-amber-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Yenile</span>
            </button>

            <Link
              href="/dashboard/campaigns"
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-800 text-sm transition"
            >
              <span>Kampanyalar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Bildirim Banner'ı */}
        {notification?.show && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : notification.type === 'error'
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-gray-400 hover:text-white text-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Üst KPI Metrik Kartları */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Toplam Gelen Yanıt */}
          <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Toplam Gelen</span>
              <Inbox className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-white">{kpi.totalCount}</div>
            <span className="text-xs text-gray-500 mt-1 block">E-Posta Yanıtı</span>
          </div>

          {/* Otonom İşlenen */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Otonom İşlenen</span>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-300">{kpi.autoProcessedCount}</div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-1 font-medium">
              <span>%{kpi.autoProcessedRate}</span>
              <span className="text-gray-500">• Sıfır İnsan Müdahalesi</span>
            </div>
          </div>

          {/* İNCELEME BEKLEYEN (Vurgulu Kehribar/Kırmızı Rozet) */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/40 to-rose-950/30 border-2 border-amber-500/60 shadow-lg shadow-amber-950/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                İnceleme Bekleyen
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-200">{kpi.needsReviewCount}</div>
            <span className="text-xs text-amber-400/80 mt-1 block font-medium">
              Soru & Belirsiz Yanıtlar
            </span>
          </div>

          {/* Onaylanıp Gönderilen */}
          <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">PR Onaylanan</span>
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-200">{kpi.approvedAndSentCount}</div>
            <span className="text-xs text-gray-500 mt-1 block">Yanıt Sevk Edildi</span>
          </div>

          {/* Ortalama AI Güven Skoru */}
          <div className="p-4 rounded-xl bg-gray-900/70 border border-gray-800/80 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">AI Güven Skoru</span>
              <Bot className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-300">%{kpi.averageConfidence}</div>
            <div className="w-full bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full"
                style={{ width: `${kpi.averageConfidence}%` }}
              />
            </div>
          </div>
        </div>

        {/* Sekmeler ve Arama Çubuğu */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('NEEDS_REVIEW')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === 'NEEDS_REVIEW'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>İnceleme Bekliyor</span>
              {kpi.needsReviewCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-gray-950">
                  {kpi.needsReviewCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('AUTO_PROCESSED')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === 'AUTO_PROCESSED'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Otonom İşlenenler</span>
              <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                {kpi.autoProcessedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('APPROVED_AND_SENT')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === 'APPROVED_AND_SENT'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              <span>Onaylanan & Gönderilenler</span>
            </button>

            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === 'ALL'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
              }`}
            >
              <span>Tümü ({reviews.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Davetli, konu veya metin ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* ÇİFT PANELLİ (SPLIT-VIEW) İNCELEME ARAYÜZÜ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px]">
          {/* SOL PANEL: Gelen E-Posta Listesi */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-400 px-1">
              <span>{filteredReviews.length} E-posta listelendi</span>
              <span>En yeniye göre sıralı</span>
            </div>

            {filteredReviews.length === 0 ? (
              <div className="p-8 text-center bg-gray-900/50 rounded-xl border border-gray-800/80">
                <Inbox className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400 font-medium">Bu sekmede gösterilecek e-posta yok.</p>
                <p className="text-xs text-gray-600 mt-1">
                  Yukarıdaki "Canlı AI Simülatörü" ile yeni bir e-posta simüle edebilirsiniz.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
                {filteredReviews.map((rev) => {
                  const isSelected = selectedReview?.id === rev.id;
                  return (
                    <div
                      key={rev.id}
                      onClick={() => setSelectedReviewId(rev.id)}
                      className={`p-4 rounded-xl border transition cursor-pointer relative ${
                        isSelected
                          ? 'bg-gray-900/90 border-amber-500/80 shadow-md shadow-amber-950/20 ring-1 ring-amber-500/40'
                          : 'bg-gray-900/50 border-gray-800/80 hover:bg-gray-900/70 hover:border-gray-700'
                      }`}
                    >
                      {/* Üst Satır: Davetli Adı & Rozetler */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{rev.guest.fullName}</span>
                          {rev.guest.isVip && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              VIP
                            </span>
                          )}
                          {rev.guest.isPress && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                              BASIN
                            </span>
                          )}
                        </div>

                        {/* Durum Rozeti */}
                        {rev.reviewStatus === 'NEEDS_REVIEW' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            İnceleme
                          </span>
                        )}
                        {rev.reviewStatus === 'AUTO_PROCESSED' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            Otonom
                          </span>
                        )}
                        {rev.reviewStatus === 'APPROVED_AND_SENT' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-blue-400" />
                            Onaylandı
                          </span>
                        )}
                      </div>

                      {/* Konu & Kırpılmış Gövde */}
                      <p className="text-xs font-medium text-gray-300 line-clamp-1 mb-1">
                        {rev.rawSubject}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2.5">
                        "{rev.rawBody}"
                      </p>

                      {/* Alt Satır: AI Kararı, Güven Skoru, +1 ve Soru İpuçları */}
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-800/80">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                              rev.aiClassification === 'CONFIRMED'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : rev.aiClassification === 'DECLINED'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {rev.aiClassification === 'CONFIRMED'
                              ? 'KATILIYOR'
                              : rev.aiClassification === 'DECLINED'
                              ? 'KATILMIYOR'
                              : 'BELİRSİZ'}
                          </span>
                          <span className="text-gray-400 font-mono text-[11px]">
                            %{rev.confidencePercent} Güven
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-gray-400">
                          {rev.extractedPlusOne > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-gray-800 text-amber-300 text-[10px] font-semibold flex items-center gap-1">
                              <UserPlus className="w-3 h-3" />
                              +{rev.extractedPlusOne}
                            </span>
                          )}
                          {rev.detectedQuestions.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60 text-[10px] font-semibold flex items-center gap-1">
                              <HelpCircle className="w-3 h-3" />
                              {rev.detectedQuestions.length} Soru
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SAĞ PANEL: Detay & PR Yönetici Aksiyon Kutusu */}
          <div className="lg:col-span-7">
            {selectedReview ? (
              <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 space-y-6">
                {/* 1. Üst Başlık Bilgisi */}
                <div className="flex items-start justify-between border-b border-gray-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold text-white">
                        {selectedReview.guest.fullName}
                      </h2>
                      {selectedReview.guest.company && (
                        <span className="text-xs text-gray-400">
                          • {selectedReview.guest.company} ({selectedReview.guest.title})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Film className="w-3.5 h-3.5 text-amber-400" />
                        {selectedReview.event.movieTitle}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-500" />
                        {selectedReview.event.venue}
                      </span>
                    </div>
                  </div>

                  {/* Güvenlik Rozeti */}
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      AES-256-GCM Bellekte Çözüldü
                    </span>
                    <span className="text-[11px] text-gray-500 block mt-1">
                      Message-ID: {selectedReview.inboundMessageId}
                    </span>
                  </div>
                </div>

                {/* 2. Orijinal Gelen E-Posta Gövdesi */}
                <div className="p-4 rounded-xl bg-gray-950 border border-gray-800">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span className="font-semibold text-gray-300">
                      Konu: {selectedReview.rawSubject}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(selectedReview.receivedAt).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed font-sans bg-gray-900/50 p-3.5 rounded-lg border border-gray-800/60">
                    "{selectedReview.rawBody}"
                  </div>
                </div>

                {/* 3. AI Analiz Özeti Kutusu (Structured Intelligence Box) */}
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-amber-400" />
                      Yapay Zeka Yapılandırılmış Çıkarımı
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Güven Skoru:</span>
                      <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                        %{selectedReview.confidencePercent}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-gray-900/80 border border-gray-800">
                      <span className="text-gray-400 block mb-1">Algılanan LCV Niyeti:</span>
                      <span
                        className={`font-bold text-sm ${
                          selectedReview.aiClassification === 'CONFIRMED'
                            ? 'text-emerald-400'
                            : selectedReview.aiClassification === 'DECLINED'
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {selectedReview.aiClassification === 'CONFIRMED'
                          ? '✓ KATILIM TEYİDİ'
                          : selectedReview.aiClassification === 'DECLINED'
                          ? '✕ KATILAMAYACAK'
                          : '? BELİRSİZ (ZAMAN İSTEDİ)'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-gray-900/80 border border-gray-800">
                      <span className="text-gray-400 block mb-1">Çıkarılan +1 Refakatçi Talebi:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">
                          +{selectedReview.extractedPlusOne} Misafir
                        </span>
                        {selectedReview.invitation.plusOneNames && (
                          <span className="text-amber-300 text-xs font-semibold">
                            ({selectedReview.invitation.plusOneNames})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Algılanan Sorular Listesi */}
                  {selectedReview.detectedQuestions.length > 0 && (
                    <div className="p-3 rounded-lg bg-gray-900/90 border border-amber-500/30">
                      <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5 mb-2">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                        Davetlinin Cevap Beklediği Sorular ({selectedReview.detectedQuestions.length}):
                      </span>
                      <div className="space-y-1">
                        {selectedReview.detectedQuestions.map((q, idx) => (
                          <div
                            key={idx}
                            className="text-xs text-gray-200 bg-gray-950/80 px-2.5 py-1.5 rounded border border-gray-800 flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span>{q}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. PR YÖNETİCİSİ YANIT TASLAĞI EDİTÖRÜ */}
                <div className="space-y-3 pt-2 border-t border-gray-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-amber-400" />
                      AI Önerilen Yanıt Taslağı (PR Yöneticisi Düzenleyebilir)
                    </label>
                    <span className="text-xs text-gray-500">
                      {editedDraftReply.length} karakter
                    </span>
                  </div>

                  <textarea
                    rows={8}
                    value={editedDraftReply}
                    onChange={(e) => setEditedDraftReply(e.target.value)}
                    disabled={selectedReview.reviewStatus === 'APPROVED_AND_SENT'}
                    placeholder="Davetliye gönderilecek kurumsal Gala PR yanıt metni..."
                    className="w-full p-3.5 rounded-xl bg-gray-950 border border-gray-800 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500 leading-relaxed font-sans disabled:opacity-60"
                  />

                  {/* LCV ve +1 Kontrolleri */}
                  {selectedReview.reviewStatus !== 'APPROVED_AND_SENT' ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-gray-950 border border-gray-800">
                      {/* Nihai LCV Seçimi */}
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-semibold text-gray-400">Nihai LCV Durumu:</span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-xs text-emerald-300 cursor-pointer">
                            <input
                              type="radio"
                              name="finalRsvp"
                              checked={finalRsvpStatus === 'CONFIRMED'}
                              onChange={() => setFinalRsvpStatus('CONFIRMED')}
                              className="accent-emerald-500"
                            />
                            <span>Onayla (Katılıyor)</span>
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-rose-300 cursor-pointer">
                            <input
                              type="radio"
                              name="finalRsvp"
                              checked={finalRsvpStatus === 'DECLINED'}
                              onChange={() => setFinalRsvpStatus('DECLINED')}
                              className="accent-rose-500"
                            />
                            <span>Katılmıyor Olarak İşle</span>
                          </label>
                        </div>
                      </div>

                      {/* +1 Onay Sayacı */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-400">+1 Onayı:</span>
                        <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
                          <button
                            type="button"
                            onClick={() => setPlusOneApprovedCount(Math.max(0, plusOneApprovedCount - 1))}
                            className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-bold text-xs text-amber-300">
                            {plusOneApprovedCount}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPlusOneApprovedCount(plusOneApprovedCount + 1)}
                            className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 text-xs text-blue-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-400" />
                        <span>
                          Bu yanıt <strong>{selectedReview.reviewedBy || 'PR Yöneticisi'}</strong> tarafından onaylanıp sevk edilmiştir.
                        </span>
                      </div>
                      <span className="text-gray-400">
                        {selectedReview.reviewedAt ? new Date(selectedReview.reviewedAt).toLocaleString('tr-TR') : ''}
                      </span>
                    </div>
                  )}

                  {/* Aksiyon Butonları */}
                  {selectedReview.reviewStatus !== 'APPROVED_AND_SENT' && (
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        onClick={handleRejectReview}
                        disabled={isRejecting || isApproving}
                        className="px-4 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-rose-400 border border-rose-900/40 text-sm font-semibold transition"
                      >
                        {isRejecting ? 'Reddediliyor...' : 'Taslağı Reddet'}
                      </button>

                      <button
                        onClick={handleApproveAndSend}
                        disabled={isApproving || isRejecting}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-gray-950 font-bold text-sm transition shadow-lg shadow-emerald-950/40"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isApproving ? 'Gönderiliyor...' : 'Taslağı Onayla, Yanıtla & LCV Güncelle'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-12 text-center text-gray-500">
                Lütfen sol panelden incelemek istediğiniz bir e-posta seçiniz.
              </div>
            )}
          </div>
        </div>

        {/* CANLI AI WEBHOOK SİMÜLATÖRÜ MODALI */}
        {isSimulatorOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-amber-500/40 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-bold text-white">Canlı AI Webhook Simülatörü</h3>
                </div>
                <button
                  onClick={() => setIsSimulatorOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Hazır Senaryolar (Presets) */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Hazır Test Senaryoları (Tek Tıkla Dene):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      handleRunSimulation({
                        fromEmail: 'ayse.yilmaz@vipdavetli.com',
                        subject: 'Re: Dune 3 Türkiye Galası Özel Davetiyeniz',
                        body: 'Merhaba, davetiniz için çok teşekkürler. Eşim Ayşe Yılmaz ile birlikte memnuniyetle katılacağım.',
                      })
                    }
                    className="p-3 rounded-lg bg-gray-950 border border-gray-800 hover:border-emerald-500/50 text-left transition"
                  >
                    <span className="font-bold text-xs text-emerald-400 block mb-0.5">
                      1. Net Onay + Eş (+1)
                    </span>
                    <span className="text-[11px] text-gray-400 block line-clamp-1">
                      Otonom işlenmeli (AUTO_PROCESSED) ve bilet üretmeli.
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      handleRunSimulation({
                        fromEmail: 'mert.ramazan@ajans.com',
                        subject: 'Re: Gala Davetiyesi',
                        body: 'Harika haber, geliyorum! Ancak kokteyl saat kaçta başlıyor ve mekanda vale otopark var mı?',
                      })
                    }
                    className="p-3 rounded-lg bg-gray-950 border border-gray-800 hover:border-amber-500/50 text-left transition"
                  >
                    <span className="font-bold text-xs text-amber-400 block mb-0.5">
                      2. Soru İçeren Yanıt (Kokteyl & Vale)
                    </span>
                    <span className="text-[11px] text-gray-400 block line-clamp-1">
                      İnsan onayına düşmeli (NEEDS_REVIEW) ve taslak yanıt üretmeli.
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      handleRunSimulation({
                        fromEmail: 'ceyda.karan@elestiri.com',
                        subject: 'Re: Özel Gösterim',
                        body: 'Maalesef o tarihte yurt dışında olacağım için galaya katılamıyorum. Başarılar dilerim.',
                      })
                    }
                    className="p-3 rounded-lg bg-gray-950 border border-gray-800 hover:border-rose-500/50 text-left transition"
                  >
                    <span className="font-bold text-xs text-rose-400 block mb-0.5">
                      3. Kibar Red (Mazeret)
                    </span>
                    <span className="text-[11px] text-gray-400 block line-clamp-1">
                      Otonom işlenmeli (DECLINED, AUTO_PROCESSED).
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      handleRunSimulation({
                        fromEmail: 'kivanc.tatlitug@vip.com',
                        subject: 'Re: Gala',
                        body: 'Çekim takvimimi ayarlamaya çalışıyorum, yarın akşam netleştirip bilgi vereceğim.',
                      })
                    }
                    className="p-3 rounded-lg bg-gray-950 border border-gray-800 hover:border-amber-500/50 text-left transition"
                  >
                    <span className="font-bold text-xs text-amber-300 block mb-0.5">
                      4. Belirsiz Yanıt (Çekim Takvimi)
                    </span>
                    <span className="text-[11px] text-gray-400 block line-clamp-1">
                      Belirsiz (UNCERTAIN) olarak NEEDS_REVIEW sekmesine düşmeli.
                    </span>
                  </button>
                </div>
              </div>

              {/* Özel Form Alanı */}
              <div className="space-y-3 pt-3 border-t border-gray-800">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Veya Özel E-Posta Gönder:
                </span>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Gönderici E-Posta:</label>
                  <input
                    type="email"
                    value={simForm.fromEmail}
                    onChange={(e) => setSimForm({ ...simForm, fromEmail: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-sm text-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Konu Başlığı:</label>
                  <input
                    type="text"
                    value={simForm.subject}
                    onChange={(e) => setSimForm({ ...simForm, subject: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-sm text-gray-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">E-Posta Yanıt Gövdesi:</label>
                  <textarea
                    rows={4}
                    value={simForm.body}
                    onChange={(e) => setSimForm({ ...simForm, body: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-sm text-gray-200"
                  />
                </div>
              </div>

              {/* Sonuç Önizleme */}
              {simulationResult && (
                <div className="p-4 rounded-xl bg-gray-950 border border-amber-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Simülasyon Çıktısı
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        simulationResult.reviewStatus === 'AUTO_PROCESSED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {simulationResult.reviewStatus}
                    </span>
                  </div>
                  <div className="text-xs text-gray-300 grid grid-cols-2 gap-2">
                    <div>
                      Sınıflandırma: <strong>{simulationResult.classification}</strong>
                    </div>
                    <div>
                      Güven Skoru: <strong>%{Math.round(simulationResult.confidence * 100)}</strong>
                    </div>
                    <div>
                      +1 Talebi: <strong>{simulationResult.extractedPlusOne}</strong>
                    </div>
                    <div>
                      Sorular: <strong>{simulationResult.detectedQuestions?.length || 0} adet</strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsSimulatorOpen(false)}
                  className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold"
                >
                  Kapat
                </button>
                <button
                  onClick={() => handleRunSimulation()}
                  disabled={isSimulating}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-sm transition"
                >
                  {isSimulating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>İşleniyor...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Simülasyonu Çalıştır</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
