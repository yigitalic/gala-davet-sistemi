import fs from 'fs';
import path from 'path';

export interface RsvpInvitationRecord {
  token: string;
  ticketCode: string;
  guestId: string;
  guestName: string;
  email: string;
  company: string;
  title: string;
  category: 'PR' | 'PRESS';
  eventTitle: string;
  movieTitle: string;
  venue: string;
  eventDateText: string;
  doorsOpenAt: string;
  startsAt: string;
  plusOneAllowed: number;
  currentRsvpStatus: 'PENDING' | 'CONFIRMED' | 'DECLINED';
  plusOneRequested: number;
  plusOneNames: string;
  guestNote: string;
  respondedAt?: string;
  createdAt: string;
}

// Bellek içi önbellek
const memoryStore = new Map<string, RsvpInvitationRecord>();

// Dosya yolu belirleme (proje içi scripts veya root)
function getStorageFilePath(): string {
  const possiblePaths = [
    path.join(process.cwd(), 'packages', 'database', 'scripts', 'rsvp-store.json'),
    path.join(process.cwd(), '..', '..', 'packages', 'database', 'scripts', 'rsvp-store.json'),
    path.join(process.cwd(), 'rsvp-store.json'),
  ];

  for (const p of possiblePaths) {
    const dir = path.dirname(p);
    if (fs.existsSync(dir)) {
      return p;
    }
  }
  return path.join(process.cwd(), 'rsvp-store.json');
}

function loadFromFile(): void {
  try {
    const filePath = getStorageFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const list: RsvpInvitationRecord[] = JSON.parse(data);
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item && item.token) {
            memoryStore.set(item.token, item);
          }
        }
      }
    }
  } catch (err) {
    // Okuma hatası durumunda in-memory verisi ile devam edilir
  }
}

function persistToFile(): void {
  try {
    const filePath = getStorageFilePath();
    const list = Array.from(memoryStore.values());
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    // Yazma hatasında sessizce devam
  }
}

// Başlangıçta dosyadan yükle
loadFromFile();

export function upsertInvitation(
  data: Partial<RsvpInvitationRecord> & { token: string }
): RsvpInvitationRecord {
  loadFromFile(); // taze veriyi çek
  const existing = memoryStore.get(data.token);

  const merged: RsvpInvitationRecord = {
    token: data.token,
    ticketCode:
      data.ticketCode ||
      existing?.ticketCode ||
      `#DISNEY-MOANA2-${Math.floor(1000 + Math.random() * 9000)}`,
    guestId: data.guestId || existing?.guestId || `guest-${data.token.slice(0, 8)}`,
    guestName: data.guestName || existing?.guestName || 'VIP Davetli',
    email: data.email || existing?.email || '',
    company: data.company || existing?.company || 'Disney Studios Türkiye Protokol',
    title: data.title || existing?.title || 'Özel Davetli',
    category: data.category || existing?.category || 'PR',
    eventTitle: data.eventTitle || existing?.eventTitle || 'Moana 2 Türkiye Özel Galası',
    movieTitle: data.movieTitle || existing?.movieTitle || 'Moana 2',
    venue: data.venue || existing?.venue || 'Zorlu PSM',
    eventDateText: data.eventDateText || existing?.eventDateText || '28 Kasım 2026, 19:00',
    doorsOpenAt: data.doorsOpenAt || existing?.doorsOpenAt || '19:00',
    startsAt: data.startsAt || existing?.startsAt || '20:30',
    plusOneAllowed: typeof data.plusOneAllowed === 'number' ? data.plusOneAllowed : existing?.plusOneAllowed ?? 1,
    currentRsvpStatus: data.currentRsvpStatus || existing?.currentRsvpStatus || 'PENDING',
    plusOneRequested: typeof data.plusOneRequested === 'number' ? data.plusOneRequested : existing?.plusOneRequested ?? 0,
    plusOneNames: data.plusOneNames ?? existing?.plusOneNames ?? '',
    guestNote: data.guestNote ?? existing?.guestNote ?? '',
    respondedAt: data.respondedAt ?? existing?.respondedAt,
    createdAt: existing?.createdAt || data.createdAt || new Date().toISOString(),
  };

  memoryStore.set(data.token, merged);
  persistToFile();
  return merged;
}

export function getInvitationByToken(token: string): RsvpInvitationRecord | null {
  loadFromFile();
  return memoryStore.get(token) || null;
}

export function getAllInvitations(): RsvpInvitationRecord[] {
  loadFromFile();
  return Array.from(memoryStore.values());
}

export function updateRsvpStatus(
  token: string,
  update: Partial<RsvpInvitationRecord>
): RsvpInvitationRecord | null {
  loadFromFile();
  const existing = memoryStore.get(token);
  if (!existing) {
    return null;
  }

  const updated: RsvpInvitationRecord = {
    ...existing,
    ...update,
    respondedAt: update.respondedAt || new Date().toISOString(),
  };

  memoryStore.set(token, updated);
  persistToFile();
  return updated;
}
