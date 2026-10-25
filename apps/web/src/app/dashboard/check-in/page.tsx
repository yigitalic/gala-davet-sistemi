'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  QrCode,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Camera,
  CameraOff,
  SwitchCamera,
  Users,
  Film,
  Building,
  UserCheck,
  Lock,
  Clock,
  Sparkles,
  ArrowRight,
  Search,
  Filter,
  Ban,
  Activity,
  Zap,
  Play,
  RotateCcw,
  Smartphone,
  Eye,
  Volume2,
  VolumeX,
  KeyRound,
  SlidersHorizontal,
  Printer,
  Award,
} from 'lucide-react';
import { GalaApi, getStoredToken } from '@/lib/api-client';
import { useGalaEvent } from '@/lib/gala-context';

export type ScanResultType =
  | 'SUCCESS'
  | 'REPLAY_ATTACK_BLOCKED'
  | 'EXPIRED_QR'
  | 'REVOKED'
  | 'ALREADY_CHECKED_IN'
  | 'INVALID_TOKEN';

export interface ScanResponseData {
  allowed: boolean;
  scanResult: ScanResultType;
  message: string;
  guest?: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    company: string | null;
    title: string | null;
    tags: string[];
  };
  invitation?: {
    id: string;
    plusOneApproved: number;
    plusOneNames: string | null;
    totalAllowed: number;
    currentlyEntered: number;
  };
  event?: {
    id: string;
    title: string;
    venue: string;
  };
  checkedInAt?: string;
  alreadyCheckedInDetails?: {
    firstCheckInAt?: string;
    totalEntered: number;
    maxAllowed: number;
  };
}

export interface CheckInLogItem {
  id: string;
  scannedAt: string;
  scanResult: ScanResultType;
  guestEnteredCount: number;
  deviceInfo?: string | null;
  ipAddress?: string | null;
  ticketId: string;
  scannedBy: {
    id: string;
    name: string;
    role: string;
  };
  guest?: {
    id: string;
    name: string;
    company?: string | null;
    title?: string | null;
    tags?: string[];
  } | null;
  eventTitle: string;
}

export interface GateKpiData {
  totalExpected: number;
  checkedInGuests: number;
  remainingGuests: number;
  occupancyRate: number;
  replayAttacksBlocked: number;
  expiredQrBlocked: number;
  revokedBlocked: number;
  alreadyCheckedInBlocked: number;
  totalSecurityIncidents: number;
}

// WEB AUDIO API GERİ BİLDİRİM MOTORU (HARİCİ SES DOSYASI OLMADAN OSCILLATOR)
class GateAudioFeedback {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playSuccessBeep() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Çift tonlu onay 'Bip' sesi: 880Hz -> 1320Hz
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.1);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, now + 0.09);
      gain2.gain.setValueAtTime(0.22, now + 0.09);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.09);
      osc2.stop(now + 0.26);
    } catch (e) {
      console.warn('[Audio] Ses çalınamadı:', e);
    }
  }

  playAlarmSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Düşük frekanslı güvenlik alarmı: 220Hz -> 160Hz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.35);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('[Audio] Alarm sesi çalınamadı:', e);
    }
  }
}

const audioFeedback = new GateAudioFeedback();

export default function DoorCheckInPwaPage() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Tarayıcı Modu: Canlı Kamera (WebRTC) vs Siber Senaryo Simülatörü
  const [scannerMode, setScannerMode] = useState<'CAMERA' | 'SIMULATOR'>('CAMERA');

  // WebRTC Kamera Durumu & Ref'ler
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFpsText, setCameraFpsText] = useState<string>('30 FPS');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const lastScannedQrRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);

  // Giriş Yapacak Kişi Adedi (+1 Kontrolü)
  const [enteredCount, setEnteredCount] = useState<number>(1);

  // Manuel Hızlı Doğrulama Formu
  const [manualTicketId, setManualTicketId] = useState<string>('');
  const [manualTotpCode, setManualTotpCode] = useState<string>('');
  const [manualPayload, setManualPayload] = useState<string>('');

  // Anlık Tarama Sonucu Kartı
  const [lastScanResult, setLastScanResult] = useState<ScanResponseData | null>(null);

  // Canlı İstatistikler & Loglar
  const [kpi, setKpi] = useState<GateKpiData>({
    totalExpected: 350,
    checkedInGuests: 184,
    remainingGuests: 166,
    occupancyRate: 53,
    replayAttacksBlocked: 3,
    expiredQrBlocked: 5,
    revokedBlocked: 2,
    alreadyCheckedInBlocked: 4,
    totalSecurityIncidents: 14,
  });

  const [recentLogs, setRecentLogs] = useState<CheckInLogItem[]>([]);
  const [logFilter, setLogFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Revoke Modal State
  const [revokeModalOpen, setRevokeModalOpen] = useState<boolean>(false);
  const [revokeTicketId, setRevokeTicketId] = useState<string>('');
  const [revokeReason, setRevokeReason] = useState<string>('');
  const [isRevoking, setIsRevoking] = useState<boolean>(false);

  // Gala Context ve Akreditasyon Yaka Kartı State
  const { triggerVipArrivalAlert, selectedEvent: globalSelectedEvent } = useGalaEvent();
  const [badgeModalOpen, setBadgeModalOpen] = useState<boolean>(false);
  const [badgeGuest, setBadgeGuest] = useState<{
    fullName: string;
    company: string | null;
    title: string | null;
    tag: string;
    plusOneApproved: number;
    plusOneNames: string | null;
    eventTitle: string;
    venue: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Ses kapatma / açma senkronizasyonu
  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    audioFeedback.isMuted = next;
  };

  // İstatistikleri ve Logları Yükleme
  const fetchStatsAndLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await GalaApi.getCheckInStats();
      if (data && data.kpi) {
        setKpi(data.kpi);
        if (data.recentLogs) setRecentLogs(data.recentLogs);
      } else {
        loadMockData();
      }
    } catch {
      loadMockData();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMockData = () => {
    setKpi({
      totalExpected: 420,
      checkedInGuests: 245,
      remainingGuests: 175,
      occupancyRate: 58,
      replayAttacksBlocked: 4,
      expiredQrBlocked: 7,
      revokedBlocked: 3,
      alreadyCheckedInBlocked: 6,
      totalSecurityIncidents: 20,
    });

    const now = Date.now();
    setRecentLogs([
      {
        id: 'log-001',
        scannedAt: new Date(now - 1000 * 30).toISOString(),
        scanResult: 'SUCCESS',
        guestEnteredCount: 2,
        deviceInfo: 'Galaxy Tab S9 - A Kapısı (WebRTC PWA)',
        ipAddress: '192.168.1.101',
        ticketId: 'tkt-8842-vip',
        scannedBy: { id: 'usr-1', name: 'Ahmet Demir', role: 'DOOR_STAFF' },
        guest: {
          id: 'gst-1',
          name: 'Haluk Bilginer',
          company: 'Oyuncular Sendikası',
          title: 'Onur Konuğu',
          tags: ['VIP', 'CREW'],
        },
        eventTitle: 'Dune: Messiah Türkiye Galası & Kırmızı Halı',
      },
      {
        id: 'log-002',
        scannedAt: new Date(now - 1000 * 120).toISOString(),
        scanResult: 'REPLAY_ATTACK_BLOCKED',
        guestEnteredCount: 1,
        deviceInfo: 'iPhone 15 Pro - Protokol Kapısı',
        ipAddress: '192.168.1.105',
        ticketId: 'tkt-8842-vip',
        scannedBy: { id: 'usr-1', name: 'Ahmet Demir', role: 'DOOR_STAFF' },
        guest: {
          id: 'gst-1',
          name: 'Haluk Bilginer (Kopya Ekran Görüntüsü)',
          company: 'Oyuncular Sendikası',
          title: 'Onur Konuğu',
          tags: ['VIP'],
        },
        eventTitle: 'Dune: Messiah Türkiye Galası & Kırmızı Halı',
      },
      {
        id: 'log-003',
        scannedAt: new Date(now - 1000 * 300).toISOString(),
        scanResult: 'EXPIRED_QR',
        guestEnteredCount: 1,
        deviceInfo: 'Pixel 8 - Basın Giriş',
        ipAddress: '192.168.1.102',
        ticketId: 'tkt-9912-press',
        scannedBy: { id: 'usr-2', name: 'Barış Kaya', role: 'PR_MANAGER' },
        guest: {
          id: 'gst-2',
          name: 'Mehmet Yılmaz',
          company: 'Hürriyet Sinema',
          title: 'Kültür Muhabiri',
          tags: ['PRESS'],
        },
        eventTitle: 'Dune: Messiah Türkiye Galası & Kırmızı Halı',
      },
      {
        id: 'log-004',
        scannedAt: new Date(now - 1000 * 540).toISOString(),
        scanResult: 'SUCCESS',
        guestEnteredCount: 1,
        deviceInfo: 'Galaxy Tab S9 - A Kapısı',
        ipAddress: '192.168.1.101',
        ticketId: 'tkt-1234-infl',
        scannedBy: { id: 'usr-1', name: 'Ahmet Demir', role: 'DOOR_STAFF' },
        guest: {
          id: 'gst-3',
          name: 'Danla Bilic',
          company: 'Dijital İçerik',
          title: 'İçerik Üreticisi',
          tags: ['INFLUENCER', 'GALA_NIGHT'],
        },
        eventTitle: 'Dune: Messiah Türkiye Galası & Kırmızı Halı',
      },
      {
        id: 'log-005',
        scannedAt: new Date(now - 1000 * 780).toISOString(),
        scanResult: 'REVOKED',
        guestEnteredCount: 1,
        deviceInfo: 'Galaxy Tab S9 - A Kapısı',
        ipAddress: '192.168.1.101',
        ticketId: 'tkt-9999-bad',
        scannedBy: { id: 'usr-1', name: 'Ahmet Demir', role: 'DOOR_STAFF' },
        guest: {
          id: 'gst-4',
          name: 'Yetkisiz Paylaşım Yapılan Kişi',
          company: 'Bilinmeyen',
          tags: ['BLACKLIST'],
        },
        eventTitle: 'Dune: Messiah Türkiye Galası & Kırmızı Halı',
      },
    ]);
  };

  useEffect(() => {
    fetchStatsAndLogs();
  }, [fetchStatsAndLogs]);

  // WEBRTC KAMERA YAŞAM DÖNGÜSÜ (getUserMedia & BarcodeDetector / Canvas)

  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(
    async (mode: 'environment' | 'user' = facingMode) => {
      stopCamera();
      setCameraError(null);

      try {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
          throw new Error('Tarayıcınız veya ortamınız WebRTC kamera akışını desteklemiyor.');
        }

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: mode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setCameraActive(true);
        setFacingMode(mode);
        setCameraFpsText('30 FPS AKTİF');

        // Canlı kare tarama döngüsü başlat
        initBarcodeDetectionLoop();
      } catch (err: any) {
        console.warn('[WebRTC Camera] Kamera açılamadı:', err);
        setCameraActive(false);

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError(
            'Kamera erişim izni reddedildi. Tarayıcı ayarlarından izin verin veya aşağıdaki Manuel Doğrulama / Simülatör kutusunu kullanın.'
          );
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraError(
            'Cihazda fiziksel kamera donanımı tespit edilemedi. Masaüstü/Simülatör veya Manuel Doğrulama moduna geçebilirsiniz.'
          );
        } else {
          setCameraError(
            err.message || 'Kamera akışı başlatılırken beklenmedik bir hata oluştu.'
          );
        }
      }
    },
    [facingMode, stopCamera]
  );

  const toggleCameraDirection = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  };

  // Kare yakalama ve BarcodeDetector / Canvas döngüsü
  const initBarcodeDetectionLoop = () => {
    let detector: any = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch {
        detector = null;
      }
    }

    const scanFrame = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        scanLoopRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const video = videoRef.current;

      // 1. Tarayıcı yerleşik BarcodeDetector destekliyorsa
      if (detector) {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            const now = Date.now();
            if (
              rawValue &&
              (rawValue !== lastScannedQrRef.current ||
                now - lastScannedTimeRef.current > 3000)
            ) {
              lastScannedQrRef.current = rawValue;
              lastScannedTimeRef.current = now;
              handleAutoDetectedQr(rawValue);
            }
          }
        } catch {
          // Frame decode atlama
        }
      } else {
        // 2. BarcodeDetector yoksa Canvas üzerine kare yakalama ve hazır tutma
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }
        }
      }

      scanLoopRef.current = requestAnimationFrame(scanFrame);
    };

    scanLoopRef.current = requestAnimationFrame(scanFrame);
  };

  // Kameradan otomatik QR okunduğunda
  const handleAutoDetectedQr = (qrString: string) => {
    executeScan({ qrPayload: qrString });
  };

  // Sayfadan ayrılırken kamerayı kapat
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // KAPI DOĞRULAMA ÇAĞRISI (executeScan & Sesli Geri Bildirim)

  const executeScan = async (payloadOrParams: {
    qrPayload?: string;
    ticketId?: string;
    totpCode?: string;
    guestEnteredCount?: number;
    scenarioLabel?: string;
  }) => {
    setIsScanning(true);
    setLastScanResult(null);

    const targetPayload = {
      qrPayload: payloadOrParams.qrPayload,
      ticketId: payloadOrParams.ticketId,
      totpCode: payloadOrParams.totpCode,
      guestEnteredCount: payloadOrParams.guestEnteredCount || enteredCount,
      deviceInfo: `Gala PWA WebRTC (${facingMode === 'environment' ? 'Arka Kamera' : 'Ön Kamera'})`,
    };

    try {
      const res = await GalaApi.verifyAndScanQr(targetPayload);

      if (res && res.scanResult) {
        setLastScanResult(res);

        // Web Audio API ile ses çal
        if (res.allowed || res.scanResult === 'SUCCESS') {
          audioFeedback.playSuccessBeep();

          // VIP veya PRESS Davetli Girişinde Canlı Alarm Tetikle
          if (res.guest && (res.guest.tags?.includes('VIP') || res.guest.tags?.includes('PRESS'))) {
            triggerVipArrivalAlert({
              guestName: res.guest.fullName || `${res.guest.firstName} ${res.guest.lastName}`,
              guestTag: res.guest.tags.includes('VIP') ? 'VIP' : 'PRESS',
              company: res.guest.company,
              gateName: 'Kapı A (Ana Protokol)',
              plusOneCount: res.invitation?.plusOneApproved || 0,
            });
          }
        } else {
          audioFeedback.playAlarmSound();
        }

        await fetchStatsAndLogs();
      } else {
        simulateScanLocally(payloadOrParams);
      }
    } catch {
      simulateScanLocally(payloadOrParams);
    } finally {
      setIsScanning(false);
    }
  };

  // Çevrimdışı / API Yokken Yerel Güvenlik Simülatörü
  const simulateScanLocally = (params: {
    qrPayload?: string;
    ticketId?: string;
    totpCode?: string;
    guestEnteredCount?: number;
    scenarioLabel?: string;
  }) => {
    const label = params.scenarioLabel || '';

    let mockResult: ScanResponseData;

    if (label.includes('REPLAY')) {
      mockResult = {
        allowed: false,
        scanResult: 'REPLAY_ATTACK_BLOCKED',
        message: 'SİBER GÜVENLİK UYARISI: REPLAY ATTACK / KOPYA EKRAN GÖRÜNTÜSÜ ENGELLENDİ!',
        guest: {
          id: 'gst-8842',
          firstName: 'Haluk',
          lastName: 'Bilginer',
          fullName: 'Haluk Bilginer',
          company: 'Tiyatro & Sinema Oyuncuları Derneği',
          title: 'Onur Konuğu & Başrol',
          tags: ['VIP', 'CREW'],
        },
      };
      setKpi((prev) => ({
        ...prev,
        replayAttacksBlocked: prev.replayAttacksBlocked + 1,
        totalSecurityIncidents: prev.totalSecurityIncidents + 1,
      }));
    } else if (label.includes('EXPIRED')) {
      mockResult = {
        allowed: false,
        scanResult: 'EXPIRED_QR',
        message: 'SÜRESİ DOLMUŞ QR KOD! (30 Saniyelik TOTP Penceresi Aşılmıştır)',
        guest: {
          id: 'gst-9912',
          firstName: 'Mehmet',
          lastName: 'Yılmaz',
          fullName: 'Mehmet Yılmaz',
          company: 'Hürriyet Sinema',
          title: 'Kültür Muhabiri',
          tags: ['PRESS'],
        },
      };
      setKpi((prev) => ({
        ...prev,
        expiredQrBlocked: prev.expiredQrBlocked + 1,
        totalSecurityIncidents: prev.totalSecurityIncidents + 1,
      }));
    } else if (label.includes('REVOKED')) {
      mockResult = {
        allowed: false,
        scanResult: 'REVOKED',
        message: 'BU BİLET İPTAL EDİLMİŞTİR (REVOKED) — PROTOKOL LİSTESİNDEN ÇIKARILDI',
        guest: {
          id: 'gst-9999',
          firstName: 'Eski',
          lastName: 'Davetli',
          fullName: 'Yetkisiz Paylaşım Yapan Şahıs',
          company: 'Medya',
          title: null,
          tags: ['BLACKLIST'],
        },
      };
      setKpi((prev) => ({
        ...prev,
        revokedBlocked: prev.revokedBlocked + 1,
        totalSecurityIncidents: prev.totalSecurityIncidents + 1,
      }));
    } else if (label.includes('ALREADY_CHECKED_IN')) {
      mockResult = {
        allowed: false,
        scanResult: 'ALREADY_CHECKED_IN',
        message: 'MÜKERRER GİRİŞ REDDEDİLDİ: Bu biletin kontenjanı daha önce tamamen doldurulmuştur!',
        guest: {
          id: 'gst-7721',
          firstName: 'Kıvanç',
          lastName: 'Tatlıtuğ',
          fullName: 'Kıvanç Tatlıtuğ',
          company: 'Ay Yapım',
          title: 'Başrol Oyuncusu',
          tags: ['VIP'],
        },
        invitation: {
          id: 'inv-7721',
          plusOneApproved: 1,
          plusOneNames: 'Başak Dizer',
          totalAllowed: 2,
          currentlyEntered: 2,
        },
        alreadyCheckedInDetails: {
          firstCheckInAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          totalEntered: 2,
          maxAllowed: 2,
        },
      };
      setKpi((prev) => ({
        ...prev,
        alreadyCheckedInBlocked: prev.alreadyCheckedInBlocked + 1,
        totalSecurityIncidents: prev.totalSecurityIncidents + 1,
      }));
    } else {
      // Varsayılan Başarılı Geçiş (SUCCESS)
      mockResult = {
        allowed: true,
        scanResult: 'SUCCESS',
        message: 'GİRİŞ ONAYLANDI — PROTOKOL KIRMIZI HALI KONTROLÜ BAŞARILI',
        guest: {
          id: 'gst-8842',
          firstName: 'Haluk',
          lastName: 'Bilginer',
          fullName: 'Haluk Bilginer',
          company: 'Tiyatro & Sinema Oyuncuları Derneği',
          title: 'Onur Konuğu & Başrol',
          tags: ['VIP', 'CREW'],
        },
        invitation: {
          id: 'inv-8842',
          plusOneApproved: 1,
          plusOneNames: 'Zerrin Tekindor',
          totalAllowed: 2,
          currentlyEntered: enteredCount,
        },
        event: {
          id: 'evt-001',
          title: 'Dune: Messiah Türkiye Galası & Kırmızı Halı',
          venue: 'Zorlu PSM Turkcell Sahnesi',
        },
        checkedInAt: new Date().toISOString(),
      };
      setKpi((prev) => ({
        ...prev,
        checkedInGuests: prev.checkedInGuests + enteredCount,
        remainingGuests: Math.max(0, prev.remainingGuests - enteredCount),
        occupancyRate: Math.min(
          100,
          Math.round(((prev.checkedInGuests + enteredCount) / prev.totalExpected) * 100)
        ),
      }));
    }

    setLastScanResult(mockResult);

    // Web Audio Çalma
    if (mockResult.allowed || mockResult.scanResult === 'SUCCESS') {
      audioFeedback.playSuccessBeep();

      // Canlı VIP / Basın Giriş Alarmı Tetikleme
      if (mockResult.guest && (mockResult.guest.tags?.includes('VIP') || mockResult.guest.tags?.includes('PRESS'))) {
        triggerVipArrivalAlert({
          guestName: mockResult.guest.fullName || `${mockResult.guest.firstName} ${mockResult.guest.lastName}`,
          guestTag: mockResult.guest.tags.includes('VIP') ? 'VIP' : 'PRESS',
          company: mockResult.guest.company,
          gateName: 'Kapı A (Ana Protokol)',
          plusOneCount: mockResult.invitation?.plusOneApproved || 0,
        });
      }
    } else {
      audioFeedback.playAlarmSound();
    }

    // Yerel log listesine ekle
    const newLog: CheckInLogItem = {
      id: `log-${Date.now()}`,
      scannedAt: new Date().toISOString(),
      scanResult: mockResult.scanResult,
      guestEnteredCount: enteredCount,
      deviceInfo: `PWA Saha Terminali (${params.scenarioLabel || 'WebRTC'})`,
      ticketId: params.ticketId || 'tkt-live',
      scannedBy: { id: 'usr-1', name: 'Ahmet Demir', role: 'DOOR_STAFF' },
      guest: mockResult.guest
        ? {
            id: mockResult.guest.id,
            name: mockResult.guest.fullName,
            company: mockResult.guest.company,
            title: mockResult.guest.title,
            tags: mockResult.guest.tags,
          }
        : null,
      eventTitle: 'Dune: Messiah Türkiye Galası & Kırmızı Halı',
    };

    setRecentLogs((prev) => [newLog, ...prev]);
  };

  // Bilet İptali (Revoke) Form Gönderimi
  const handleRevokeSubmit = async () => {
    if (!revokeTicketId || !revokeReason) return;
    setIsRevoking(true);
    try {
      await GalaApi.revokeTicket(revokeTicketId, revokeReason);
      setRevokeModalOpen(false);
      setRevokeTicketId('');
      setRevokeReason('');
      await fetchStatsAndLogs();
    } catch {
      setRevokeModalOpen(false);
      setRevokeTicketId('');
      setRevokeReason('');
      setKpi((prev) => ({ ...prev, revokedBlocked: prev.revokedBlocked + 1 }));
    } finally {
      setIsRevoking(false);
    }
  };

  // Filtrelenmiş Loglar
  const filteredLogs = useMemo(() => {
    return recentLogs.filter((item) => {
      if (logFilter !== 'ALL' && item.scanResult !== logFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const guestMatch = item.guest?.name.toLowerCase().includes(term);
        const ticketMatch = item.ticketId.toLowerCase().includes(term);
        const staffMatch = item.scannedBy.name.toLowerCase().includes(term);
        if (!guestMatch && !ticketMatch && !staffMatch) return false;
      }
      return true;
    });
  }, [recentLogs, logFilter, searchTerm]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Gizli Canvas (Kare Yakalama Analizi) */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* ÜST BİLGİLENDİRME VE KOMUTA ÇUBUĞU */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-800/80 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <ShieldCheck className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>Kapı Check-In & Canlı WebRTC QR Doğrulama</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    PWA v2.0
                  </span>
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  Dune: Messiah Türkiye Galası • Zorlu PSM Protokol Girişi
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Ses Aç / Kapa Butonu (Web Audio API) */}
            <button
              onClick={toggleMute}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition ${
                isMuted
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-900/50'
                  : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
              }`}
              title="Web Audio Saha Geri Bildirim Sesi"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{isMuted ? 'Ses Kapalı' : 'Saha Sesi Açık'}</span>
            </button>

            <button
              onClick={() => fetchStatsAndLogs()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-900/80 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 text-xs font-semibold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Yenile</span>
            </button>

            <Link
              href="/dashboard/security"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-900/80 hover:bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-800 text-xs transition"
            >
              <span>KVKK Denetim İzi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* CANLI KAPI İSTATİSTİK KARTLARI (KPI) */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[11px] uppercase font-bold tracking-wider text-gray-400">
              Beklenen Davetli
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                {kpi.totalExpected}
              </span>
              <Users className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Asil + Onaylı +1 toplamı</p>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-300">
              İçeri Giren (Checked-In)
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                {kpi.checkedInGuests}
              </span>
              <UserCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="w-full bg-emerald-950/60 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-emerald-400 h-full rounded-full"
                style={{ width: `${Math.min(100, kpi.occupancyRate)}%` }}
              />
            </div>
            <p className="text-[10px] text-emerald-400/80 mt-1">
              Doluluk Oranı: %{kpi.occupancyRate}
            </p>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[11px] uppercase font-bold tracking-wider text-gray-400">
              Kalan Beklenen
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                {kpi.remainingGuests}
              </span>
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Henüz giriş yapmayanlar</p>
          </div>

          <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[11px] uppercase font-bold tracking-wider text-rose-300">
              Engellenen Replay Attack
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">
                {kpi.replayAttacksBlocked}
              </span>
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <p className="text-[10px] text-rose-400/80 mt-1">Kopya ekran görüntüsü</p>
          </div>

          <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between col-span-2 lg:col-span-1">
            <span className="text-[11px] uppercase font-bold tracking-wider text-amber-300">
              Süresi Dolan / İptal QR
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
                {kpi.expiredQrBlocked + kpi.revokedBlocked}
              </span>
              <Ban className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-[10px] text-amber-400/80 mt-1">
              {kpi.expiredQrBlocked} Süresi Dolan + {kpi.revokedBlocked} Revoked
            </p>
          </div>
        </div>

        {/* ANA KAPI ÇALIŞMA ALANI: KAMERA VİZÖRÜ & ANLIK SONUÇ KARTI */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SOL: TARAYICI PANELİ (5 Kolon) */}
          <div className="lg:col-span-5 space-y-4">
            {/* ÇİFT MODLU TARAYICI SEÇİCİ SEKMELERİ */}
            <div className="flex p-1 bg-gray-900 border border-gray-800 rounded-2xl text-xs font-bold">
              <button
                onClick={() => {
                  setScannerMode('CAMERA');
                  if (!cameraActive) startCamera('environment');
                }}
                className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition ${
                  scannerMode === 'CAMERA'
                    ? 'bg-amber-500 text-gray-950 shadow-md shadow-amber-500/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Canlı Kamera (WebRTC)</span>
              </button>
              <button
                onClick={() => {
                  setScannerMode('SIMULATOR');
                  stopCamera();
                }}
                className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition ${
                  scannerMode === 'SIMULATOR'
                    ? 'bg-amber-500 text-gray-950 shadow-md shadow-amber-500/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Siber Senaryo Simülatörü</span>
              </button>
            </div>

            {/* Kamera Vizör Kartı */}
            <div className="bg-gradient-to-b from-[#131722] to-[#0a0d14] border border-amber-500/30 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="flex items-center gap-1.5 font-bold text-amber-400">
                  <Camera className="w-4 h-4" />
                  {scannerMode === 'CAMERA' ? 'CANLI WEBRTC VİZÖRÜ' : 'SİMÜLATÖR PANELİ'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                    cameraActive
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  ● {cameraActive ? cameraFpsText : 'BEKLEMEDE'}
                </span>
              </div>

              {/* Kamera Çerçevesi ve Lazer Taraması */}
              <div className="relative aspect-[4/3] rounded-2xl bg-black border-2 border-gray-800 flex items-center justify-center overflow-hidden group">
                {/* Canlı Video Akışı */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                    cameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                />

                {/* Kamera Kılavuz Çizgileri */}
                <div className="absolute inset-4 border border-dashed border-amber-500/40 rounded-xl pointer-events-none z-10" />
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-amber-400 pointer-events-none z-10" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-amber-400 pointer-events-none z-10" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-amber-400 pointer-events-none z-10" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-amber-400 pointer-events-none z-10" />

                {/* Hareketli Lazer Taraması Animasyonu */}
                {cameraActive && (
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-pulse z-10" />
                )}

                {/* Kamera Kapalıyken veya Başlatılmamışken Merkez İkon */}
                {!cameraActive && (
                  <div className="text-center p-6 space-y-2 z-10">
                    <QrCode className="w-16 h-16 text-amber-400/40 mx-auto" />
                    <p className="text-xs text-gray-400 font-medium">
                      {scannerMode === 'CAMERA'
                        ? 'Kamera akışını başlatmak için butona basınız'
                        : 'Simülatör modunda test senaryolarını çalıştırınız'}
                    </p>
                  </div>
                )}

                {/* Yükleniyor / Tarama Yapılıyor Katmanı */}
                {isScanning && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20">
                    <div className="text-center space-y-2">
                      <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                      <p className="text-xs font-bold text-amber-200">
                        Kriptografik Doğrulama Yapılıyor...
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Kamera Hata Bildirimi (Kamera yoksa veya izin verilmediyse) */}
              {cameraError && (
                <div className="mt-3 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <p>{cameraError}</p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setScannerMode('SIMULATOR')}
                      className="px-2.5 py-1 rounded bg-amber-500 text-gray-950 font-bold text-[10px] hover:bg-amber-400 transition"
                    >
                      Simülatör Moduna Geç
                    </button>
                    <button
                      onClick={() => startCamera('environment')}
                      className="px-2.5 py-1 rounded bg-gray-800 text-gray-200 text-[10px] hover:bg-gray-700 transition"
                    >
                      Tekrar Dene
                    </button>
                  </div>
                </div>
              )}

              {/* WebRTC Kamera Kontrol Butonları */}
              {scannerMode === 'CAMERA' && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {!cameraActive ? (
                    <button
                      onClick={() => startCamera('environment')}
                      className="col-span-2 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-950/40"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Kamerayı Başlat (Arka Kamera)</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={toggleCameraDirection}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold rounded-xl text-xs transition border border-gray-700"
                      >
                        <SwitchCamera className="w-3.5 h-3.5 text-amber-400" />
                        <span>{facingMode === 'environment' ? 'Ön Kamera' : 'Arka Kamera'}</span>
                      </button>
                      <button
                        onClick={stopCamera}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 bg-rose-900/60 hover:bg-rose-800/80 text-rose-200 font-bold rounded-xl text-xs transition border border-rose-700/60"
                      >
                        <CameraOff className="w-3.5 h-3.5" />
                        <span>Kamerayı Durdur</span>
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Giriş Yapan Kişi Adedi Seçici (+1 Kontrolü) */}
              <div className="mt-4 flex items-center justify-between bg-gray-950/80 border border-gray-800 rounded-xl p-2.5">
                <span className="text-xs text-gray-300 font-semibold flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-400" />
                  İçeri Giren Kişi Sayısı:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEnteredCount((prev) => Math.max(1, prev - 1))}
                    className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs flex items-center justify-center transition"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-sm text-white px-2">
                    {enteredCount}
                  </span>
                  <button
                    onClick={() => setEnteredCount((prev) => Math.min(5, prev + 1))}
                    className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs flex items-center justify-center transition"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* MANUEL HIZLI DOĞRULAMA KUTUSU (Düşük Ekran Parlaklığı / Kırık Ekran / Hızlı Kod Girişi) */}
              <div className="mt-4 pt-3.5 border-t border-gray-800 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>MANUEL HIZLI DOĞRULAMA (TICKET ID & TOTP)</span>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (manualTicketId && manualTotpCode) {
                      executeScan({
                        ticketId: manualTicketId,
                        totpCode: manualTotpCode,
                        guestEnteredCount: enteredCount,
                      });
                    }
                  }}
                  className="space-y-2"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={manualTicketId}
                      onChange={(e) => setManualTicketId(e.target.value)}
                      placeholder="Ticket ID (örn: tkt-8842-vip)"
                      className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <input
                      type="text"
                      maxLength={6}
                      value={manualTotpCode}
                      onChange={(e) => setManualTotpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="6 Haneli TOTP (482910)"
                      className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-mono tracking-widest text-center"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isScanning || !manualTicketId || manualTotpCode.length !== 6}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-bold rounded-xl text-xs transition"
                  >
                    Hemen Doğrula & Giriş Onayla
                  </button>
                </form>
              </div>

              {/* SİBER SENARYO SİMÜLATÖRÜ BUTONLARI */}
              {scannerMode === 'SIMULATOR' && (
                <div className="mt-4 space-y-2 pt-3 border-t border-gray-800">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Kapı Doğrulama Test Senaryoları:
                  </p>

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() =>
                        executeScan({
                          ticketId: 'tkt-8842-vip',
                          totpCode: '482910',
                          guestEnteredCount: enteredCount,
                          scenarioLabel: 'SUCCESS',
                        })
                      }
                      disabled={isScanning}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 text-emerald-200 text-xs font-bold transition text-left"
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        1. Geçerli VIP +1 Bilet Okut
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                        SUCCESS
                      </span>
                    </button>

                    <button
                      onClick={() =>
                        executeScan({
                          ticketId: 'tkt-8842-vip',
                          totpCode: '482910',
                          guestEnteredCount: 1,
                          scenarioLabel: 'REPLAY_ATTACK_BLOCKED',
                        })
                      }
                      disabled={isScanning}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/40 text-rose-200 text-xs font-bold transition text-left"
                    >
                      <span className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        2. Ekran Görüntüsü / Replay Attack Denemesi
                      </span>
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded">
                        REPLAY
                      </span>
                    </button>

                    <button
                      onClick={() =>
                        executeScan({
                          ticketId: 'tkt-9912-press',
                          totpCode: '112233',
                          guestEnteredCount: 1,
                          scenarioLabel: 'EXPIRED_QR',
                        })
                      }
                      disabled={isScanning}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/40 text-amber-200 text-xs font-bold transition text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        3. Süresi Dolmuş (30sn Geçmiş) QR Okut
                      </span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">
                        EXPIRED
                      </span>
                    </button>

                    <button
                      onClick={() =>
                        executeScan({
                          ticketId: 'tkt-9999-bad',
                          totpCode: '998877',
                          guestEnteredCount: 1,
                          scenarioLabel: 'REVOKED',
                        })
                      }
                      disabled={isScanning}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-500/40 text-red-200 text-xs font-bold transition text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Ban className="w-4 h-4 text-red-400 flex-shrink-0" />
                        4. İptal Edilmiş (Revoked) Bilet Okut
                      </span>
                      <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded">
                        REVOKED
                      </span>
                    </button>

                    <button
                      onClick={() =>
                        executeScan({
                          ticketId: 'tkt-7721-vip',
                          totpCode: '778899',
                          guestEnteredCount: 1,
                          scenarioLabel: 'ALREADY_CHECKED_IN',
                        })
                      }
                      disabled={isScanning}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40 text-purple-200 text-xs font-bold transition text-left"
                    >
                      <span className="flex items-center gap-2">
                        <RotateCcw className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        5. Mükerrer Giriş Denemesi (Kontenjan Dolu)
                      </span>
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                        ALREADY_IN
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Manuel İmzalı Payload String Girişi */}
              <div className="mt-4 pt-3 border-t border-gray-800">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (manualPayload) {
                      executeScan({ qrPayload: manualPayload });
                    }
                  }}
                  className="space-y-2"
                >
                  <label className="text-[10px] uppercase font-bold text-gray-400">
                    Manuel QR Payload / İmzalı String Girişi
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualPayload}
                      onChange={(e) => setManualPayload(e.target.value)}
                      placeholder="GALA-QR:v1:tkt-xxx:123456:timestamp:signature"
                      className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={isScanning || !manualPayload}
                      className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-xs transition"
                    >
                      Dene
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* SAĞ: ANLIK KAPI SONUÇ KARTI & GÜVENLİK GÜNLÜĞÜ (7 Kolon) */}
          <div className="lg:col-span-7 space-y-5">
            {/* ANLIK SONUÇ KARTI (BÜYÜK VURGULU) */}
            {lastScanResult ? (
              <div
                className={`rounded-3xl p-6 sm:p-7 border-2 shadow-2xl transition-all duration-300 ${
                  lastScanResult.allowed
                    ? 'bg-gradient-to-br from-emerald-950/80 via-gray-950 to-gray-950 border-emerald-500 shadow-emerald-950/40'
                    : 'bg-gradient-to-br from-rose-950/90 via-gray-950 to-gray-950 border-rose-500 shadow-rose-950/50'
                }`}
              >
                {/* Sonuç Başlık Şeridi */}
                <div className="flex items-center justify-between gap-3 border-b border-gray-800/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        lastScanResult.allowed
                          ? 'bg-emerald-500 text-gray-950 shadow-lg shadow-emerald-500/30'
                          : 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                      }`}
                    >
                      {lastScanResult.allowed ? (
                        <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                      ) : (
                        <ShieldAlert className="w-7 h-7 stroke-[2.5]" />
                      )}
                    </div>

                    <div>
                      <span
                        className={`text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                          lastScanResult.allowed
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {lastScanResult.scanResult}
                      </span>
                      <h2
                        className={`text-xl sm:text-2xl font-black mt-1 ${
                          lastScanResult.allowed ? 'text-emerald-300' : 'text-rose-400'
                        }`}
                      >
                        {lastScanResult.message}
                      </h2>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-gray-400 hidden sm:block">
                    {new Date().toLocaleTimeString('tr-TR')}
                  </span>
                </div>

                {/* Detay Bilgileri */}
                {lastScanResult.guest && (
                  <div className="mt-5 space-y-4">
                    <div className="bg-gray-950/70 border border-gray-800/80 rounded-2xl p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-800/80 pb-3">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-gray-400">
                            Davetli Protokol Bilgisi
                          </p>
                          <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
                            {lastScanResult.guest.fullName}
                          </h3>
                          {lastScanResult.guest.company && (
                            <p className="text-xs text-gray-300 flex items-center gap-1 mt-0.5">
                              <Building className="w-3.5 h-3.5 text-amber-400" />
                              {lastScanResult.guest.company}
                              {lastScanResult.guest.title ? ` • ${lastScanResult.guest.title}` : ''}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {lastScanResult.guest.tags?.map((tag) => (
                            <span
                              key={tag}
                              className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${
                                tag === 'VIP'
                                  ? 'bg-amber-400 text-gray-950 shadow-md shadow-amber-400/20'
                                  : tag === 'PRESS'
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                  : tag === 'BLACKLIST'
                                  ? 'bg-rose-600 text-white animate-pulse'
                                  : 'bg-gray-800 text-gray-300'
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Onaylı +1 Kontenjan Bilgisi */}
                      {lastScanResult.invitation && (
                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-gray-900/80 rounded-xl p-3">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">
                              Onaylı Giriş Kontenjanı
                            </span>
                            <div className="text-sm font-black text-white flex items-center gap-1.5 mt-0.5">
                              <Users className="w-4 h-4 text-amber-400" />
                              {lastScanResult.invitation.plusOneApproved > 0
                                ? `Asil + ${lastScanResult.invitation.plusOneApproved} Misafir (${lastScanResult.invitation.totalAllowed} Kişi)`
                                : '1 Kişi (Yalnızca Asil Davetli)'}
                            </div>
                            {lastScanResult.invitation.plusOneNames && (
                              <p className="text-[11px] text-amber-300/80 mt-1">
                                Refakatçi: {lastScanResult.invitation.plusOneNames}
                              </p>
                            )}
                          </div>

                          <div className="bg-gray-900/80 rounded-xl p-3">
                            <span className="text-[10px] text-gray-400 uppercase font-bold">
                              İçeri Alınan Sayı
                            </span>
                            <div className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                              {lastScanResult.invitation.currentlyEntered} / {lastScanResult.invitation.totalAllowed} Kişi Girdi
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1">
                              Kontenjan Güncellendi
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Mükerrer Giriş Ayrıntısı */}
                      {lastScanResult.alreadyCheckedInDetails && (
                        <div className="mt-3 bg-purple-950/40 border border-purple-800/50 rounded-xl p-3 text-xs text-purple-200">
                          <p className="font-bold flex items-center gap-1.5">
                            <RotateCcw className="w-4 h-4 text-purple-400" />
                            Mükerrer Giriş Detayı:
                          </p>
                          <p className="mt-0.5 text-gray-300">
                            Bu biletle ilk giriş saati:{' '}
                            <span className="font-mono text-purple-300 font-bold">
                              {new Date(
                                lastScanResult.alreadyCheckedInDetails.firstCheckInAt || ''
                              ).toLocaleTimeString('tr-TR')}
                            </span>
                            . Tanımlı toplam {lastScanResult.alreadyCheckedInDetails.maxAllowed} kişilik hak dolmuştur.
                          </p>
                        </div>
                      )}

                      {/* VIP / BASIN AKREDİTASYON YAKA KARTI YAZDIRMA BUTONU */}
                      {lastScanResult.allowed && lastScanResult.guest && (
                        <div className="mt-4 pt-4 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div className="text-xs text-gray-400 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span>Protokol Karşılama Hazır • </span>
                            <span className="text-emerald-400 font-semibold font-mono">Akreditasyon Kartı Baskıya Hazır</span>
                          </div>
                          <button
                            onClick={() => {
                              setBadgeGuest({
                                fullName: lastScanResult.guest?.fullName || `${lastScanResult.guest?.firstName} ${lastScanResult.guest?.lastName}`,
                                company: lastScanResult.guest?.company || null,
                                title: lastScanResult.guest?.title || null,
                                tag: lastScanResult.guest?.tags?.includes('VIP') ? 'VIP PROTOKOL' : lastScanResult.guest?.tags?.includes('PRESS') ? 'BASIN AKREDİTASYON' : 'ÖZEL DAVETLİ',
                                plusOneApproved: lastScanResult.invitation?.plusOneApproved || 0,
                                plusOneNames: lastScanResult.invitation?.plusOneNames || null,
                                eventTitle: lastScanResult.event?.title || 'Dune: Messiah Türkiye Galası',
                                venue: lastScanResult.event?.venue || 'Zorlu PSM Turkcell Sahnesi',
                              });
                              setBadgeModalOpen(true);
                            }}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                            <span>🪪 VIP / Basın Akreditasyon Yaka Kartı Yazdır (Print Badge)</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Henüz Tarama Yapılmadığında Boş Durum */
              <div className="bg-gray-900/50 border border-gray-800 border-dashed rounded-3xl p-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-gray-800/80 flex items-center justify-center mx-auto text-amber-400">
                  <QrCode className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Kapı Taraması Bekleniyor
                </h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Sol taraftaki kamera vizörünü kullanarak bilet okutunuz, manuel formu doldurunuz veya hızlı test senaryolarından birine tıklayınız.
                </p>
              </div>
            )}

            {/* SON KAPI CHECK-IN GÜVENLİK GÜNLÜĞÜ (TABLO) */}
            <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" />
                    <span>Son Kapı Giriş ve Siber Olay Günlüğü</span>
                  </h3>
                  <p className="text-xs text-gray-400">
                    Gerçek zamanlı CheckInLog tablosu ve güvenlik alarmları
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="ALL">Tüm Olaylar</option>
                    <option value="SUCCESS">Başarılı (SUCCESS)</option>
                    <option value="REPLAY_ATTACK_BLOCKED">Replay Attack Engeli</option>
                    <option value="EXPIRED_QR">Süresi Dolan QR</option>
                    <option value="REVOKED">İptal Edilmiş (Revoked)</option>
                    <option value="ALREADY_CHECKED_IN">Mükerrer Giriş</option>
                  </select>
                </div>
              </div>

              {/* Arama Kutusu */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Davetli adı, bilet ID veya personel ara..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Log Listesi */}
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {filteredLogs.length === 0 ? (
                  <p className="text-center text-xs text-gray-500 py-6">
                    Kayıt bulunamadı.
                  </p>
                ) : (
                  filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-gray-950/70 border border-gray-800/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:border-gray-700 transition text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-black uppercase flex-shrink-0 ${
                            log.scanResult === 'SUCCESS'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : log.scanResult === 'REPLAY_ATTACK_BLOCKED'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : log.scanResult === 'EXPIRED_QR'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}
                        >
                          {log.scanResult}
                        </span>

                        <div>
                          <p className="font-bold text-white">
                            {log.guest?.name || 'Bilinmeyen Misafir'}
                            {log.guestEnteredCount > 1 && (
                              <span className="text-emerald-400 font-mono ml-1.5 font-normal">
                                (+{log.guestEnteredCount - 1} Misafir)
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {log.guest?.company || log.eventTitle} • Cihaz: {log.deviceInfo || 'PWA'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto text-right">
                        <div>
                          <p className="text-[11px] font-mono text-gray-300">
                            {new Date(log.scannedAt).toLocaleTimeString('tr-TR')}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            Görevli: {log.scannedBy.name}
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            setRevokeTicketId(log.ticketId);
                            setRevokeReason('Kapıda şüpheli hareket / ekran görüntüsü sızıntısı');
                            setRevokeModalOpen(true);
                          }}
                          title="Bileti İptal Et (Revoke)"
                          className="px-2 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-[10px] font-bold transition"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BİLET İPTAL (REVOKE) MODALI */}
      {revokeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-rose-600/60 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <Ban className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">
                Bileti Derhal İptal Et (Revoke)
              </h3>
            </div>
            <p className="text-xs text-gray-300">
              Bu bilet iptal edildiğinde (REVOKED), davetli veya üçüncü şahıslar dinamik bilet sayfasını açsa dahi QR kod geçersiz olacak ve kapıdan geçiş reddedilecektir.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase text-gray-400">
                Bilet ID
              </label>
              <input
                type="text"
                value={revokeTicketId}
                onChange={(e) => setRevokeTicketId(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase text-gray-400">
                İptal Gerekçesi (Audit Log)
              </label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={3}
                placeholder="Örn: WhatsApp grubunda ekran görüntüsü sızdırıldı..."
                className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRevokeModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300 transition"
              >
                Vazgeç
              </button>
              <button
                onClick={handleRevokeSubmit}
                disabled={isRevoking || !revokeTicketId || !revokeReason}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition shadow-lg shadow-rose-900/30"
              >
                {isRevoking ? 'İptal Ediliyor...' : 'Bileti İptal Et (Revoke)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIP / BASIN AKREDİTASYON YAKA KARTI ÖNİZLEME & YAZDIRMA MODALI */}
      {badgeModalOpen && badgeGuest && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Akreditasyon Yaka Kartı (Pass Badge)
                </h3>
              </div>
              <button
                onClick={() => setBadgeModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* YAZDIRILABİLİR FİZİKSEL YAKA KARTI TASARIMI */}
            <div
              id="printable-badge"
              className="relative rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-2 border-amber-500/60 p-6 text-center space-y-4 shadow-2xl overflow-hidden"
            >
              {/* Lüks Holografik Şerit */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-600" />

              {/* Kurumsal Logo / Film */}
              <div>
                <p className="text-[10px] font-mono tracking-widest text-amber-400/90 uppercase font-extrabold">
                  {badgeGuest.eventTitle}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{badgeGuest.venue}</p>
              </div>

              {/* Protokol / Basın Rozet Şeridi */}
              <div className="py-1">
                <span
                  className={`inline-block px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase shadow-md ${
                    badgeGuest.tag.includes('VIP')
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-amber-500/30'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-emerald-500/30'
                  }`}
                >
                  {badgeGuest.tag}
                </span>
              </div>

              {/* Davetli İsmi ve Kurumu */}
              <div className="py-2 border-y border-slate-800/80">
                <h2 className="text-xl font-black text-white tracking-wide">
                  {badgeGuest.fullName}
                </h2>
                {badgeGuest.company && (
                  <p className="text-xs font-semibold text-amber-300 mt-1">{badgeGuest.company}</p>
                )}
                {badgeGuest.title && (
                  <p className="text-[11px] text-slate-400">{badgeGuest.title}</p>
                )}
              </div>

              {/* Refakatçi / Kapı Durumu */}
              <div className="flex items-center justify-between text-xs px-2">
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Giriş Kapısı</span>
                  <span className="font-bold text-white font-mono">KAPI A (PROTOKOL)</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Refakatçi</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {badgeGuest.plusOneApproved > 0 ? `+${badgeGuest.plusOneApproved} ONAYLI` : 'TEK KİŞİ'}
                  </span>
                </div>
              </div>

              {/* QR Güvenlik Mührü */}
              <div className="pt-2 flex items-center justify-center gap-3">
                <div className="w-16 h-16 bg-white rounded-lg p-1.5 flex items-center justify-center shadow-inner">
                  <QrCode className="w-full h-full text-slate-950" />
                </div>
                <div className="text-left text-[10px] text-slate-400 font-mono leading-tight">
                  <p className="text-emerald-400 font-bold">✓ TOTP DOĞRULANDI</p>
                  <p>Hologram ID: #GALA-PASS</p>
                  <p>Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
                </div>
              </div>
            </div>

            {/* Butonlar */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setBadgeModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
              >
                Kapat
              </button>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.print();
                  }
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <Printer className="w-4 h-4" />
                <span>🖨️ Yaka Kartını Yazdır (Print)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
