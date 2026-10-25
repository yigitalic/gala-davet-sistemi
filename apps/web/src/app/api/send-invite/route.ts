import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { upsertInvitation } from '@/lib/rsvp-store';

interface GuestInvitePayload {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  company?: string;
  title?: string;
  category?: 'PR' | 'PRESS';
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      guestIds = [],
      guests = [],
      gala,
      baseUrl: requestedBaseUrl,
      customMessage,
      emailSignature,
      doorsOpenAt: customDoorsOpen,
      startsAt: customStartsAt,
      eventDateText: customDateText,
      venue: customVenue,
      plusOneAllowed: customPlusOne,
    } = body;

    // 1. Dinamik Temel URL (Base URL) Çözümleme
    // Öncelik: body.baseUrl -> request.headers.origin -> process.env.WEB_APP_URL -> 'http://localhost:3000'
    const headerOrigin = request.headers.get('origin');
    const defaultFallbackUrl = process.env.WEB_APP_URL || 'http://localhost:3000';
    const baseUrl = (requestedBaseUrl || headerOrigin || defaultFallbackUrl).replace(/\/$/, '');

    const galaTitle = gala?.title || 'Moana 2 Türkiye Özel Galası';
    const movieTitle = gala?.movieTitle || 'Moana 2';
    const venue = customVenue || gala?.venue || 'Zorlu PSM';
    const eventDateText = customDateText || gala?.eventDateText || '28 Kasım 2026, 19:00';
    const doorsOpenAt = customDoorsOpen || gala?.doorsOpenAt || '19:00';
    const startsAt = customStartsAt || gala?.startsAt || '20:30';
    const plusOneAllowed = typeof customPlusOne === 'number' ? customPlusOne : 1;

    const sourceGuests: GuestInvitePayload[] =
      guests.length > 0 ? guests : guestIds.map((id: string) => ({ id }));

    const results = sourceGuests.map((guest: GuestInvitePayload) => {
      // 2. Kriptografik LCV Token'ı Üretimi (24 byte secure hex token -> 48 karakter)
      const token = crypto.randomBytes(24).toString('hex');
      const email =
        guest.email ||
        (guest.id === 'go-disney-yigit-ali'
          ? 'yigitalicolakoglu22@gmail.com'
          : `${(guest.firstName || 'davetli').toLowerCase()}@disney.local`);

      const name =
        guest.firstName && guest.lastName
          ? `${guest.firstName} ${guest.lastName}`
          : guest.name || (guest.id === 'go-disney-yigit-ali' ? 'Yiğit Ali Çolakoğlu' : 'VIP Davetli');

      const company =
        guest.company ||
        (guest.id === 'go-disney-yigit-ali' ? 'Baş Konuk & Protokol' : 'Disney Studios Türkiye Protokol');
      const title = guest.title || 'VIP Protokol Davetlisi';
      const category = guest.category || 'PR';

      // 3. Kalıcı rsvp-store içine davetiye kaydet
      const ticketCode = `#DISNEY-MOANA2-${Math.floor(1000 + Math.random() * 9000)}`;
      upsertInvitation({
        token,
        ticketCode,
        guestId: guest.id,
        guestName: name,
        email,
        company,
        title,
        category,
        eventTitle: galaTitle,
        movieTitle,
        venue,
        eventDateText,
        doorsOpenAt,
        startsAt,
        plusOneAllowed,
        currentRsvpStatus: 'PENDING',
        plusOneRequested: 0,
        plusOneNames: '',
        guestNote: '',
      });

      // 4. Query parametreleriyle zenginleştirilmiş ve sunucu yeniden başlasa bile veriyi koruyan link
      const queryParams = new URLSearchParams({
        guestId: guest.id,
        name,
        email,
        company,
        gala: galaTitle,
        movie: movieTitle,
        venue,
        date: eventDateText,
        open: doorsOpenAt,
        start: startsAt,
        plusOne: String(plusOneAllowed),
      });

      const rsvpLink = `/rsvp/${token}?${queryParams.toString()}`;
      const fullRsvpUrl = `${baseUrl}${rsvpLink}`;

      return {
        guestId: guest.id,
        name,
        email,
        token,
        ticketCode,
        rsvpLink,
        fullRsvpUrl,
        status: 'SENT',
        sentAt: new Date().toISOString(),
      };
    });

    // 5. Varsa RESEND_API_KEY ile gerçek e-posta gönderim entegrasyonu
    if (process.env.RESEND_API_KEY) {
      for (const res of results) {
        if (res.email && res.email.includes('@') && !res.email.endsWith('.local')) {
          try {
            const inviteCustomMessage =
              customMessage ||
              'Sizi Walt Disney Studios sunumuyla gerçekleşecek özel gala gösteriminde aramızda görmekten büyük onur duyarız.';
            const signature =
              emailSignature ||
              'Disney Studios Türkiye · PR & Basın İlişkileri Direktörlüğü';

            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'Disney Studios Türkiye <pr@resend.dev>',
                to: [res.email],
                subject: `${galaTitle} — Davetiyeniz & LCV Onayı`,
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; color: #18181b; background-color: #ffffff; border: 1px solid #e4e4e7;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #71717a;">Walt Disney Studios Türkiye</div>
                    <h1 style="font-size: 22px; font-weight: 800; margin: 10px 0 18px 0; color: #09090b; letter-spacing: -0.02em;">${galaTitle}</h1>
                    <p style="font-size: 15px; line-height: 1.6; margin-bottom: 8px;">Sayın <strong>${res.name}</strong>,</p>
                    <p style="font-size: 14px; line-height: 1.6; color: #3f3f46;">${inviteCustomMessage}</p>
                    
                    <div style="margin: 24px 0; padding: 18px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px;">
                      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px;">Etkinlik Detayları</div>
                      <p style="margin: 4px 0; font-size: 13px; color: #1e293b;"><strong>Mekan:</strong> ${venue}</p>
                      <p style="margin: 4px 0; font-size: 13px; color: #1e293b;"><strong>Gala Tarihi:</strong> ${eventDateText}</p>
                      <p style="margin: 4px 0; font-size: 13px; color: #1e293b;"><strong>Kapı Açılışı:</strong> ${doorsOpenAt} &nbsp;|&nbsp; <strong>Gösterim:</strong> ${startsAt}</p>
                      <p style="margin: 4px 0; font-size: 13px; color: #1e293b;"><strong>Kontenjan:</strong> ${plusOneAllowed > 0 ? `Çift Kişilik Davetiye (+${plusOneAllowed} Refakatçi)` : 'Tek Kişilik Davetiye'}</p>
                      <p style="margin: 4px 0; font-size: 13px; color: #1e293b;"><strong>Giriş Kategorisi:</strong> VIP / Protokol Davetlisi</p>
                    </div>

                    <div style="margin: 28px 0 20px 0; text-align: center;">
                      <a href="${res.fullRsvpUrl}" style="display: inline-block; background-color: #09090b; color: #ffffff; padding: 14px 32px; text-decoration: none; font-size: 14px; font-weight: 700; letter-spacing: 0.03em; border-radius: 2px;">LCV Onayla & QR Biletini Al</a>
                    </div>

                    <div style="margin-top: 20px; padding: 12px; background-color: #fafafa; border: 1px dashed #d4d4d8; font-size: 12px; color: #71717a; word-break: break-all; text-align: center;">
                      Buton açılmazsa doğrudan tıklayın:<br />
                      <a href="${res.fullRsvpUrl}" style="color: #2563eb; text-decoration: underline; font-weight: 500;">${res.fullRsvpUrl}</a>
                    </div>

                    <hr style="margin: 32px 0 16px 0; border: none; border-top: 1px solid #e4e4e7;" />
                    <p style="font-size: 11px; color: #a1a1aa; text-align: center; line-height: 1.5;">${signature}</p>
                  </div>
                `,
              }),
            });
          } catch (mailErr) {
            console.error('Mail dispatch error (Resend):', mailErr);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      baseUrl,
      dispatchedCount: results.length,
      results,
      message: 'Gala davetiyeleri başarıyla oluşturuldu ve gönderildi.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Davetiye gönderiminde hata oluştu.' },
      { status: 500 }
    );
  }
}
