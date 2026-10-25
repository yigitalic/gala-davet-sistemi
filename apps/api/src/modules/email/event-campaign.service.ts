import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SecurityService } from '../security/security.service';
import { CreateEventDto, UpdateEventDto } from './dto/email-campaign.dto';
import { EventStatus, RsvpStatus } from '@prisma/client';

export interface EventOccupancyStats {
  id: string;
  title: string;
  movieTitle: string;
  venue: string;
  startsAt: Date;
  doorsOpenAt: Date;
  capacity: number;
  status: EventStatus;
  totalGuests: number;
  confirmedCount: number;
  declinedCount: number;
  uncertainCount: number;
  pendingCount: number;
  waitlistCount: number;
  plusOneRequestedTotal: number;
  plusOneApprovedTotal: number;
  totalAttendeesExpected: number;
  occupancyRate: number; // Yüzde örn: 74.5
  remainingCapacity: number;
}

@Injectable()
export class EventCampaignService {
  private readonly logger = new Logger(EventCampaignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly securityService: SecurityService
  ) {}

  /**
   * Yeni bir Gala veya Özel Gösterim Etkinliği oluşturur
   */
  async createEvent(dto: CreateEventDto) {
    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        movieTitle: dto.movieTitle,
        description: dto.description || null,
        venue: dto.venue,
        startsAt: new Date(dto.startsAt),
        doorsOpenAt: new Date(dto.doorsOpenAt),
        capacity: dto.capacity,
        status: dto.status || EventStatus.PUBLISHED,
      },
    });

    this.logger.log(`Yeni etkinlik oluşturuldu: ${event.title} (Kapasite: ${event.capacity})`);
    return event;
  }

  /**
   * Etkinlik bilgilerini, kapasitesini veya durumunu günceller
   */
  async updateEvent(eventId: string, dto: UpdateEventDto) {
    const existing = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!existing) {
      throw new NotFoundException('Etkinlik bulunamadı.');
    }

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.movieTitle !== undefined ? { movieTitle: dto.movieTitle } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.venue !== undefined ? { venue: dto.venue } : {}),
        ...(dto.startsAt !== undefined ? { startsAt: new Date(dto.startsAt) } : {}),
        ...(dto.doorsOpenAt !== undefined ? { doorsOpenAt: new Date(dto.doorsOpenAt) } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });

    this.logger.log(`Etkinlik güncellendi: ${updated.title} (Durum: ${updated.status}, Kapasite: ${updated.capacity})`);
    return updated;
  }

  /**
   * Tüm etkinlikleri ve detaylı LCV doluluk hunisi istatistiklerini listeler
   */
  async findAllEvents(): Promise<EventOccupancyStats[]> {
    const events = await this.prisma.event.findMany({
      include: {
        invitations: {
          select: {
            rsvpStatus: true,
            plusOneRequested: true,
            plusOneApproved: true,
          },
        },
      },
      orderBy: { startsAt: 'desc' },
    });

    return events.map((event) => {
      const totalGuests = event.invitations.length;
      let confirmedCount = 0;
      let declinedCount = 0;
      let uncertainCount = 0;
      let pendingCount = 0;
      let waitlistCount = 0;
      let plusOneRequestedTotal = 0;
      let plusOneApprovedTotal = 0;

      for (const inv of event.invitations) {
        if (inv.rsvpStatus === RsvpStatus.CONFIRMED) confirmedCount++;
        else if (inv.rsvpStatus === RsvpStatus.DECLINED) declinedCount++;
        else if (inv.rsvpStatus === RsvpStatus.UNCERTAIN) uncertainCount++;
        else if (inv.rsvpStatus === RsvpStatus.WAITLIST) waitlistCount++;
        else pendingCount++;

        plusOneRequestedTotal += inv.plusOneRequested || 0;
        plusOneApprovedTotal += inv.plusOneApproved || 0;
      }

      const totalAttendeesExpected = confirmedCount + plusOneApprovedTotal;
      const rawRate = event.capacity > 0 ? (totalAttendeesExpected / event.capacity) * 100 : 0;
      const occupancyRate = Math.round(rawRate * 10) / 10;
      const remainingCapacity = Math.max(0, event.capacity - totalAttendeesExpected);

      return {
        id: event.id,
        title: event.title,
        movieTitle: event.movieTitle,
        venue: event.venue,
        startsAt: event.startsAt,
        doorsOpenAt: event.doorsOpenAt,
        capacity: event.capacity,
        status: event.status,
        totalGuests,
        confirmedCount,
        declinedCount,
        uncertainCount,
        pendingCount,
        waitlistCount,
        plusOneRequestedTotal,
        plusOneApprovedTotal,
        totalAttendeesExpected,
        occupancyRate,
        remainingCapacity,
      };
    });
  }

  /**
   * Tekil etkinlik detayı ve davetiye listesini KVKK maskeli döner
   */
  async findOneEvent(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        invitations: {
          include: {
            guest: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                company: true,
                title: true,
                emailEncrypted: true,
                phoneEncrypted: true,
                tags: true,
                loyaltyScore: true,
                isBlacklisted: true,
              },
            },
            ticket: {
              select: {
                id: true,
                isRevoked: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Etkinlik bulunamadı: ${id}`);
    }

    // İstatistik hesaplama
    let confirmedCount = 0;
    let declinedCount = 0;
    let uncertainCount = 0;
    let pendingCount = 0;
    let waitlistCount = 0;
    let plusOneApprovedTotal = 0;
    let plusOneRequestedTotal = 0;

    const invitationsList = event.invitations.map((inv) => {
      if (inv.rsvpStatus === RsvpStatus.CONFIRMED) confirmedCount++;
      else if (inv.rsvpStatus === RsvpStatus.DECLINED) declinedCount++;
      else if (inv.rsvpStatus === RsvpStatus.UNCERTAIN) uncertainCount++;
      else if (inv.rsvpStatus === RsvpStatus.WAITLIST) waitlistCount++;
      else pendingCount++;

      plusOneApprovedTotal += inv.plusOneApproved || 0;
      plusOneRequestedTotal += inv.plusOneRequested || 0;

      // KVKK Maskeleme: E-posta ve telefon liste görünümünde çözülmez, maskelenir
      let maskedEmail = '***@***.com';
      let maskedPhone: string | null = null;
      try {
        const plainEmail = this.securityService.decrypt(inv.guest.emailEncrypted);
        maskedEmail = this.securityService.maskEmail(plainEmail);
        if (inv.guest.phoneEncrypted) {
          const plainPhone = this.securityService.decrypt(inv.guest.phoneEncrypted);
          maskedPhone = this.securityService.maskPhone(plainPhone);
        }
      } catch {
        // şifre çözülemezse varsayılan maskeyi koru
      }

      return {
        id: inv.id,
        rsvpStatus: inv.rsvpStatus,
        plusOneRequested: inv.plusOneRequested,
        plusOneApproved: inv.plusOneApproved,
        plusOneNames: inv.plusOneNames,
        sentAt: inv.sentAt,
        respondedAt: inv.respondedAt,
        responseChannel: inv.responseChannel,
        hasTicket: !!inv.ticket,
        ticketRevoked: inv.ticket?.isRevoked || false,
        guest: {
          id: inv.guest.id,
          firstName: inv.guest.firstName,
          lastName: inv.guest.lastName,
          company: inv.guest.company,
          title: inv.guest.title,
          maskedEmail,
          maskedPhone,
          tags: inv.guest.tags,
          loyaltyScore: inv.guest.loyaltyScore,
          isBlacklisted: inv.guest.isBlacklisted,
        },
      };
    });

    const totalAttendeesExpected = confirmedCount + plusOneApprovedTotal;
    const occupancyRate =
      event.capacity > 0
        ? Math.round(((totalAttendeesExpected / event.capacity) * 100) * 10) / 10
        : 0;

    return {
      event: {
        id: event.id,
        title: event.title,
        movieTitle: event.movieTitle,
        description: event.description,
        venue: event.venue,
        startsAt: event.startsAt,
        doorsOpenAt: event.doorsOpenAt,
        capacity: event.capacity,
        status: event.status,
        createdAt: event.createdAt,
      },
      stats: {
        totalInvitations: event.invitations.length,
        confirmedCount,
        declinedCount,
        uncertainCount,
        pendingCount,
        waitlistCount,
        plusOneRequestedTotal,
        plusOneApprovedTotal,
        totalAttendeesExpected,
        occupancyRate,
        remainingCapacity: Math.max(0, event.capacity - totalAttendeesExpected),
      },
      invitations: invitationsList,
    };
  }
}
