import type { PublicHoliday, Region } from '../types';

const W: Region = 'west';
const E: Region = 'east';
const N: Region = 'north';
const S: Region = 'south';
const SC: Region = 'south_chennai';
const ALL: Region[] = [W, E, N, S, SC];

export const DEFAULT_HOLIDAYS: PublicHoliday[] = [
  // ── 2026  (from company holiday screenshot) ──────────────
  { id: 'h26-0101', date: '2026-01-01', name: 'New Year',                 regions: ALL },
  { id: 'h26-0114', date: '2026-01-14', name: 'Makar Sankranti / Pongal', regions: [N, S] },
  { id: 'h26-0115', date: '2026-01-15', name: 'Makar Sankranti / Pongal', regions: [SC] },
  { id: 'h26-0126', date: '2026-01-26', name: 'Republic Day',             regions: ALL },
  { id: 'h26-0303', date: '2026-03-03', name: 'Holi',                     regions: [W, E, N] },
  { id: 'h26-0319', date: '2026-03-19', name: 'Gudhi Padva / Ugadi',      regions: [W, S] },
  { id: 'h26-0403', date: '2026-04-03', name: 'Good Friday',              regions: ALL },
  { id: 'h26-0414', date: '2026-04-14', name: 'Tamil New Year',           regions: [SC] },
  { id: 'h26-0415', date: '2026-04-15', name: 'Bengali New Year',         regions: [E] },
  { id: 'h26-0501', date: '2026-05-01', name: 'Labour Day',               regions: ALL },
  { id: 'h26-0527', date: '2026-05-27', name: 'Bakari Eid',               regions: ALL },
  { id: 'h26-0914', date: '2026-09-14', name: 'Ganesh Chaturthi',         regions: [W, N, S, SC] },
  { id: 'h26-1002', date: '2026-10-02', name: 'Gandhi Jayanti',           regions: ALL },
  { id: 'h26-1019', date: '2026-10-19', name: 'Dussehra Durgapuja',       regions: [E] },
  { id: 'h26-1020', date: '2026-10-20', name: 'Dussehra',                 regions: ALL },
  { id: 'h26-1110', date: '2026-11-10', name: 'Diwali',                   regions: ALL },
  { id: 'h26-1225', date: '2026-12-25', name: 'Christmas Day',            regions: ALL },

  // ── 2025  (common national holidays) ────────────────────
  { id: 'h25-0101', date: '2025-01-01', name: 'New Year',                 regions: ALL },
  { id: 'h25-0114', date: '2025-01-14', name: 'Makar Sankranti / Pongal', regions: [N, S, SC] },
  { id: 'h25-0126', date: '2025-01-26', name: 'Republic Day',             regions: ALL },
  { id: 'h25-0314', date: '2025-03-14', name: 'Holi',                     regions: [W, E, N] },
  { id: 'h25-0418', date: '2025-04-18', name: 'Good Friday',              regions: ALL },
  { id: 'h25-0501', date: '2025-05-01', name: 'Labour Day',               regions: ALL },
  { id: 'h25-0815', date: '2025-08-15', name: 'Independence Day',         regions: ALL },
  { id: 'h25-1002', date: '2025-10-02', name: 'Gandhi Jayanti',           regions: ALL },
  { id: 'h25-1020', date: '2025-10-20', name: 'Diwali',                   regions: [W, E, N] },
  { id: 'h25-1225', date: '2025-12-25', name: 'Christmas Day',            regions: ALL },

  // ── 2027  (fixed national holidays – update religious dates when announced) ──
  { id: 'h27-0101', date: '2027-01-01', name: 'New Year',                 regions: ALL },
  { id: 'h27-0126', date: '2027-01-26', name: 'Republic Day',             regions: ALL },
  { id: 'h27-0501', date: '2027-05-01', name: 'Labour Day',               regions: ALL },
  { id: 'h27-1002', date: '2027-10-02', name: 'Gandhi Jayanti',           regions: ALL },
  { id: 'h27-1225', date: '2027-12-25', name: 'Christmas Day',            regions: ALL },
];