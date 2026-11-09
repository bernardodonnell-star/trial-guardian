import { decideConfirmation } from '@/lib/confirmation';
import { SOURCE_MAP } from '@/lib/sources';
import type { Alert, Trip } from '@/lib/types';

// SAMPLE data: the Frankfurt → Geneva → Dubai → Sydney trip used in the
// traveller overview. Replaced by the user's own bookings once the backend is connected.

export const sampleTrip: Trip = {
  id: 'trip-fra-gva-syd',
  title: 'Frankfurt, Geneva and Sydney',
  passport: 'IE',
  stops: [
    {
      id: 'fra',
      city: 'Frankfurt',
      countryCode: 'DE',
      arrive: '2026-11-23T10:05:00+01:00',
      depart: '2026-11-25T17:40:00+01:00',
      timeZone: 'Europe/Berlin',
      bookings: [
        {
          id: 'b-mainblick',
          kind: 'hotel',
          title: 'Hotel Mainblick',
          start: '2026-11-23T15:00:00+01:00',
          end: '2026-11-25T11:00:00+01:00',
          place: 'Schaumainkai 12, 60596 Frankfurt am Main',
          reference: 'MB-77120',
          details: [
            { label: 'Times', value: 'In from 15:00 · out by 11:00' },
            { label: 'Cancel', value: 'Free until Sun 22 Nov 18:00' },
          ],
          contacts: [{ label: 'Reception', phone: '+49 69 900 1234', hours: '24 h' }],
        },
      ],
    },
    {
      id: 'gva',
      city: 'Geneva',
      countryCode: 'CH',
      arrive: '2026-11-25T18:55:00+01:00',
      depart: '2026-11-27T14:30:00+01:00',
      timeZone: 'Europe/Zurich',
      bookings: [
        {
          id: 'b-lx1073',
          kind: 'flight',
          title: 'LX 1073 FRA to GVA',
          start: '2026-11-25T17:40:00+01:00',
          end: '2026-11-25T18:55:00+01:00',
          place: 'Frankfurt Terminal 1',
          reference: 'K7QX2M',
          details: [
            { label: 'E-ticket', value: '724 2219 0083' },
            { label: 'Seat', value: '7A · 23 kg bag' },
          ],
          contacts: [{ label: 'Swiss help line', phone: '+41 61 900 10 10', hours: '24 h' }],
        },
        {
          id: 'b-rivedroite',
          kind: 'hotel',
          title: 'Hôtel Rive Droite',
          start: '2026-11-25T15:00:00+01:00',
          end: '2026-11-27T11:00:00+01:00',
          place: 'Rue de Berne 12, 1201 Genève',
          reference: '48213-GV',
          details: [{ label: 'Cancel', value: 'Free until Tue 24 Nov 18:00' }],
          contacts: [{ label: 'Reception', phone: '+41 22 900 14 70' }],
        },
        {
          id: 'b-cafedulac',
          kind: 'restaurant',
          title: 'Dinner, Café du Lac',
          start: '2026-11-26T19:30:00+01:00',
          reference: 'TB-6612',
          details: [{ label: 'Table', value: '3 people' }],
          contacts: [{ label: 'Restaurant', phone: '+41 22 900 22 85' }],
        },
      ],
    },
    {
      id: 'syd',
      city: 'Sydney',
      countryCode: 'AU',
      arrive: '2026-11-28T23:10:00+11:00',
      depart: '2026-12-12T21:00:00+11:00',
      timeZone: 'Australia/Sydney',
      bookings: [
        {
          id: 'b-ek84',
          kind: 'flight',
          title: 'EK 84 GVA to DXB',
          start: '2026-11-27T14:30:00+01:00',
          end: '2026-11-27T23:40:00+04:00',
          place: 'Geneva Airport',
          reference: 'EKR9TT',
          contacts: [{ label: 'Emirates', phone: '+971 600 555555', hours: '24 h' }],
        },
        {
          id: 'b-ek414',
          kind: 'flight',
          title: 'EK 414 DXB to SYD',
          start: '2026-11-28T02:15:00+04:00',
          end: '2026-11-28T23:10:00+11:00',
          place: 'Dubai Terminal 3',
          reference: 'EKR9TT',
          details: [{ label: 'Connection', value: '2 h 35 min in Dubai, same terminal' }],
          contacts: [{ label: 'Emirates', phone: '+971 600 555555', hours: '24 h' }],
        },
        {
          id: 'b-harbourside',
          kind: 'hotel',
          title: 'Harbourside Apartments',
          start: '2026-11-28T23:30:00+11:00',
          end: '2026-12-12T10:00:00+11:00',
          place: 'Milsons Point NSW 2061',
          reference: 'HA-30418',
          contacts: [{ label: 'Late check-in', phone: '+61 2 9000 1234' }],
          needsCheck: ['Late arrival after 23:00: confirm key collection'],
        },
      ],
    },
  ],
};

const policeGeneva = SOURCE_MAP.get('ch-police-ge')!;

export const sampleAlerts: Alert[] = [
  {
    id: 'a-fra-strike',
    title: 'Security staff strike at Frankfurt Airport, 04:00 to 24:00 Wed 25 Nov',
    severity: 'warning',
    confirmation: decideConfirmation(
      [
        { sourceId: 'fraport', url: 'https://www.frankfurt-airport.com', publishedAt: '2026-11-24T16:05:00+01:00', stance: 'confirms' },
        { sourceId: 'dw', url: 'https://www.dw.com', publishedAt: '2026-11-24T15:40:00+01:00', stance: 'reports' },
      ],
      SOURCE_MAP,
    ),
    why: 'You fly LX 1073 from Terminal 1 at 17:40 on Wed 25 Nov, during the strike.',
    advice: 'Allow at least 90 extra minutes. Swiss says flights operate; check-in closes as normal.',
    createdAt: '2026-11-24T16:10:00+01:00',
    updatedAt: '2026-11-24T16:10:00+01:00',
    bookingIds: ['b-lx1073'],
  },
  {
    id: 'a-gva-demo',
    title: 'Reports of a demonstration closing streets near Cornavin station',
    severity: 'advisory',
    confirmation: decideConfirmation(
      [
        { sourceId: 'srf', url: 'https://www.srf.ch', publishedAt: '2026-11-26T08:12:00+01:00', stance: 'reports' },
        { sourceId: 'reuters', url: 'https://www.reuters.com', publishedAt: '2026-11-26T08:20:00+01:00', stance: 'reports' },
        { sourceId: 'bbc', url: 'https://www.bbc.com', publishedAt: '2026-11-26T08:25:00+01:00', stance: 'reports', syndicatedFrom: 'reuters' },
      ],
      SOURCE_MAP,
      [policeGeneva],
    ),
    why: 'Your hotel on Rue de Berne is 300 m from the reported area.',
    advice: 'Walk via Rue des Alpes if you go out this morning. We will update you when the police comment.',
    createdAt: '2026-11-26T08:22:00+01:00',
    updatedAt: '2026-11-26T08:26:00+01:00',
    bookingIds: ['b-rivedroite'],
  },
];

/**
 * Emergency contacts per country. In production these come from the checked database with a
 * last-verified date, never from AI. SAMPLE values: verify every number before any release.
 */
export const emergency: Record<string, { label: string; phone: string; note?: string }[]> = {
  DE: [
    { label: 'Emergency (police, fire, ambulance)', phone: '112' },
    { label: 'Police', phone: '110' },
    { label: 'Embassy of Ireland, Berlin', phone: '+49 30 220 720', note: 'Out of hours: follow the recorded message' },
  ],
  CH: [
    { label: 'Emergency (all services)', phone: '112' },
    { label: 'Police', phone: '117' },
    { label: 'Ambulance', phone: '144' },
    { label: 'Embassy of Ireland, Bern', phone: '+41 31 350 03 80' },
  ],
  AU: [
    { label: 'Emergency (police, fire, ambulance)', phone: '000' },
    { label: 'Embassy of Ireland, Canberra', phone: '+61 2 6214 0000' },
  ],
};
