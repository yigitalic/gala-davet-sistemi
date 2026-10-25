import { NextResponse } from 'next/server';
import {
  getInvitationByToken,
  getAllInvitations,
  upsertInvitation,
  updateRsvpStatus,
} from '@/lib/rsvp-store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const all = searchParams.get('all');

    if (all === 'true') {
      const invitations = getAllInvitations();
      return NextResponse.json({
        success: true,
        count: invitations.length,
        invitations,
      });
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token veya all parametresi gereklidir.' },
        { status: 400 }
      );
    }

    const invitation = getInvitationByToken(token);
    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Belirtilen belirteçle davetiye bulunamadı.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'LCV sorgulanırken hata oluştu.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      token,
      action, // 'CONFIRMED' | 'DECLINED'
      plusOneRequested = 0,
      plusOneNames = '',
      guestNote = '',
      guestId,
      name,
      email,
      company,
      title,
      gala,
      movie,
      venue,
      date,
      open,
      start,
      plusOne,
      baseUrl: requestedBaseUrl,
    } = body;

    if (!token || !action) {
      return NextResponse.json(
        { success: false, error: 'token ve action (CONFIRMED/DECLINED) zorunludur.' },
        { status: 400 }
      );
    }

    // 1. Kaydı bul veya URL fallback'leri ile oluştur (upsert)
    let invitation = getInvitationByToken(token);
    if (!invitation) {
      invitation = upsertInvitation({
        token,
        guestId: guestId || `guest-${token.slice(0, 8)}`,
        guestName: name || 'VIP Davetli',
        email: email || '',
        company: company || 'Disney Studios Protokol',
        title: title || 'Özel Davetli',
        eventTitle: gala || 'Moana 2 Türkiye Özel Galası',
        movieTitle: movie || 'Moana 2',
        venue: venue || 'Zorlu PSM',
        eventDateText: date || '28 Kasım 2026, 19:00',
        doorsOpenAt: open || '19:00',
        startsAt: start || '20:30',
        plusOneAllowed: typeof plusOne === 'number' ? plusOne : Number(plusOne) || 1,
        currentRsvpStatus: 'PENDING',
      });
    }

    // 2. Yanıtı güncelle
    const updated = updateRsvpStatus(token, {
      currentRsvpStatus: action,
      plusOneRequested: action === 'CONFIRMED' ? Number(plusOneRequested) || 0 : 0,
      plusOneNames: action === 'CONFIRMED' ? (plusOneNames || '') : '',
      guestNote: guestNote || '',
      respondedAt: new Date().toISOString(),
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'LCV durumu güncellenemedi.' },
        { status: 500 }
      );
    }

    // 3. CONFIRMED ise ve RESEND_API_KEY varsa gerçek Bilet & Onay E-postası gönder
    const headerOrigin = request.headers.get('origin');
    const defaultFallbackUrl = process.env.WEB_APP_URL || 'http://localhost:3000';
    const baseUrl = (requestedBaseUrl || headerOrigin || defaultFallbackUrl).replace(/\/$/, '');
    const ticketUrl = `${baseUrl}/rsvp/${token}`;

    if (action === 'CONFIRMED' && process.env.RESEND_API_KEY && updated.email && updated.email.includes('@')) {
      try {
        const plusOneText =
          updated.plusOneRequested > 0
            ? `2 Kişi (1 Davetli + ${updated.plusOneRequested} Refakatçi${updated.plusOneNames ? `: ${updated.plusOneNames}` : ''})`
            : 'Tek Kişilik Protokol Girişi';

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Disney Studios Türkiye <pr@resend.dev>',
            to: [updated.email],
            subject: `LCV Onayınız Alındı — VIP Giriş Biletiniz (${updated.ticketCode})`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; color: #18181b; background-color: #ffffff; border: 1px solid #e4e4e7;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a;">Walt Disney Studios Türkiye</div>
                <h1 style="font-size: 22px; font-weight: 800; margin: 10px 0 6px 0; color: #09090b;">LCV Onayınız Teyit Edildi</h1>
                <p style="font-size: 13px; color: #059669; font-weight: 600; margin-bottom: 20px;">✓ VIP Giriş Biletiniz Hazırlandı ve Sisteme İşlendi</p>
                
                <p style="font-size: 14px; line-height: 1.6;">Sayın <strong>${updated.guestName}</strong>,</p>
                <p style="font-size: 14px; line-height: 1.6; color: #3f3f46;">
                  <strong>${updated.eventTitle}</strong> için katılım teyidiniz alınmıştır. Kırmızı halı ve resepsiyon alanında sizleri ağırlamaktan mutluluk duyacağız.
                </p>

                <!-- BİLET ÖZET KARTI -->
                <div style="margin: 24px 0; border: 2px solid #09090b; padding: 20px; background-color: #fafafa; border-radius: 4px;">
                  <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e4e4e7; padding-bottom: 10px; margin-bottom: 14px;">
                    <div>
                      <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #71717a; display: block;">Giriş Türü</span>
                      <strong style="font-size: 13px; color: #09090b;">VIP Protokol Giriş Bileti</strong>
                    </div>
                    <div style="text-align: right;">
                      <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #71717a; display: block;">Bilet Kodu</span>
                      <strong style="font-size: 13px; font-family: monospace; color: #09090b;">${updated.ticketCode}</strong>
                    </div>
                  </div>

                  <p style="margin: 6px 0; font-size: 13px; color: #1e293b;"><strong>Etkinlik:</strong> ${updated.eventTitle}</p>
                  <p style="margin: 6px 0; font-size: 13px; color: #1e293b;"><strong>Mekan:</strong> ${updated.venue}</p>
                  <p style="margin: 6px 0; font-size: 13px; color: #1e293b;"><strong>Tarih:</strong> ${updated.eventDateText}</p>
                  <p style="margin: 6px 0; font-size: 13px; color: #1e293b;"><strong>Kapı Açılışı:</strong> ${updated.doorsOpenAt} &nbsp;|&nbsp; <strong>Gösterim:</strong> ${updated.startsAt}</p>
                  <p style="margin: 6px 0; font-size: 13px; color: #1e293b;"><strong>Kontenjan:</strong> ${plusOneText}</p>
                  <p style="margin: 6px 0; font-size: 13px; color: #1e293b;"><strong>Giriş Kategorisi:</strong> VIP / Protokol Davetlisi</p>
                  ${updated.guestNote ? `<p style="margin: 6px 0; font-size: 13px; color: #475569;"><strong>İlettiğiniz Not:</strong> "${updated.guestNote}"</p>` : ''}
                </div>

                <!-- DİNAMİK BİLET BUTONU -->
                <div style="margin: 28px 0 20px 0; text-align: center;">
                  <a href="${ticketUrl}" style="display: inline-block; background-color: #09090b; color: #ffffff; padding: 14px 32px; text-decoration: none; font-size: 14px; font-weight: 700; letter-spacing: 0.03em; border-radius: 2px;">Dinamik QR Giriş Biletini Aç</a>
                </div>

                <div style="padding: 12px; background-color: #f1f5f9; border-radius: 4px; font-size: 11px; color: #475569; line-height: 1.5; text-align: center;">
                  Bu bilet RFC 6238 TOTP korumalı dinamik QR kod içerir. Galaya girişte turnikeler ve görevli tabletlerine yukarıdaki bağlantıdan açılan ekranı göstermeniz yeterlidir.
                </div>

                <hr style="margin: 28px 0 16px 0; border: none; border-top: 1px solid #e4e4e7;" />
                <p style="font-size: 11px; color: #a1a1aa; text-align: center;">Disney Studios Türkiye · PR & Protokol Direktörlüğü</p>
              </div>
            `,
          }),
        });
      } catch (mailErr) {
        console.error('Bilet onay maili gönderim hatası (Resend):', mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      invitation: updated,
      message:
        action === 'CONFIRMED'
          ? 'LCV onaylandı ve dijital bilet hazırlandı.'
          : 'LCV yanıtı (katılamıyor) kaydedildi.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'LCV yanıtı işlenirken hata oluştu.' },
      { status: 500 }
    );
  }
}
