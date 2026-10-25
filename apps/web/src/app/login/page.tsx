'use client';

import React, { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [isTwoFactorStep, setIsTwoFactorStep] = useState(false);
  const [tempAuthToken, setTempAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFirstStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol ediniz.');
      }

      if (data.requiresTwoFactor) {
        setTempAuthToken(data.tempAuthToken);
        setIsTwoFactorStep(true);
      } else if (data.accessToken) {
        localStorage.setItem('gala_token', data.accessToken);
        setSuccessMessage('Giriş başarılı! Yönlendiriliyorsunuz...');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Bağlantı hatası oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecondStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tempAuthToken ? { Authorization: `Bearer ${tempAuthToken}` } : {}),
        },
        body: JSON.stringify({ email, password, totpCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '2FA kodu geçersiz veya süresi dolmuş.');
      }

      if (data.accessToken) {
        localStorage.setItem('gala_token', data.accessToken);
        setSuccessMessage('2FA doğrulandı! Yönetim paneline aktarılıyorsunuz...');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Doğrulama başarısız.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-black px-4 py-12 relative overflow-hidden">
      {/* Sinematik Arka Plan Efektleri */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-900/90 border border-amber-500/30 rounded-2xl shadow-2xl p-8 backdrop-blur-xl relative z-10">
        {/* Logo ve Başlık */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-400 mb-3 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            GALA & PR <span className="text-amber-400">OPERASYON</span>
          </h1>
          <p className="text-xs uppercase tracking-widest text-zinc-400 mt-1">
            Yetkili Personel Giriş Kapısı
          </p>
        </div>

        {/* Durum Bildirimleri */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-lg bg-red-950/80 border border-red-500/40 text-red-200 text-sm flex items-start gap-2.5">
            <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-3.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-sm flex items-start gap-2.5">
            <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Adım 1: E-posta ve Şifre */}
        {!isTwoFactorStep ? (
          <form onSubmit={handleFirstStep} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-2">
                Kurumsal E-Posta
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="personel@gala.local"
                className="w-full px-4 py-3 rounded-lg bg-zinc-950/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition text-sm"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider">
                  Şifre
                </label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 rounded-lg bg-zinc-950/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-semibold rounded-lg shadow-lg shadow-amber-500/20 transition-all duration-200 transform active:scale-[0.98] disabled:opacity-50 text-sm tracking-wide"
            >
              {isLoading ? 'Doğrulanıyor...' : 'Giriş Yap'}
            </button>
          </form>
        ) : (
          /* Adım 2: 2FA TOTP Kodu */
          <form onSubmit={handleSecondStep} className="space-y-5">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 leading-relaxed">
              Hesabınız iki faktörlü koruma (2FA) altındadır. Lütfen Authenticator uygulamanızdaki 6 haneli kodu giriniz.
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-2 text-center">
                6 Haneli Güvenlik Kodu
              </label>
              <input
                type="text"
                required
                maxLength={6}
                autoFocus
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center text-3xl font-mono tracking-[0.5em] px-4 py-3.5 rounded-lg bg-zinc-950/90 border border-amber-500/40 text-amber-400 placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsTwoFactorStep(false);
                  setTotpCode('');
                }}
                className="w-1/3 py-3 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition"
              >
                Geri
              </button>

              <button
                type="submit"
                disabled={isLoading || totpCode.length !== 6}
                className="w-2/3 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-semibold rounded-lg shadow-lg shadow-amber-500/20 transition disabled:opacity-50 text-sm"
              >
                {isLoading ? 'Onaylanıyor...' : 'Kodu Onayla'}
              </button>
            </div>
          </form>
        )}

        {/* Kurumsal Güvenlik Alt Bilgisi */}
        <div className="mt-8 pt-6 border-t border-zinc-800/80 text-center text-[11px] text-zinc-500 flex items-center justify-center gap-2">
          <svg className="w-3.5 h-3.5 text-amber-500/80" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v4a1 1 0 102 0V7z" clipRule="evenodd" />
          </svg>
          <span>AES-256-GCM & KVKK / GDPR Uyumlu Kriptografik Koruma</span>
        </div>
      </div>
    </div>
  );
}
