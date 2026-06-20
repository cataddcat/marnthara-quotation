// src/lib/room-accents.ts
//
// Deterministic per-room accent palette — gives each room a stable colour identity for
// visual scanning (RoomCard, All Rooms Summary). Per-room accents are a sanctioned colour
// use under DESIGN.md / §1.7 (they carry meaning = room identity).
// All class strings are static so Tailwind JIT picks them up.

export interface RoomAccent {
  stripe: string;
  avatar: string;
  avatarText: string;
  tag: string;
  ring: string;
}

const ROOM_ACCENTS: readonly RoomAccent[] = [
  {
    stripe: 'bg-violet-500',
    avatar: 'bg-violet-500/15',
    avatarText: 'text-violet-700 dark:text-violet-300 eeert:text-violet-800',
    tag: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 eeert:text-violet-800',
    ring: 'ring-violet-500',
  },
  {
    // indigo (เดิม sky) — sky สงวนให้หมวดอุปกรณ์ + ห้ามเฉียดโทนมิติ (DESIGN.md §2.1)
    stripe: 'bg-indigo-500',
    avatar: 'bg-indigo-500/15',
    avatarText: 'text-indigo-700 dark:text-indigo-300 eeert:text-indigo-800',
    tag: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 eeert:text-indigo-800',
    ring: 'ring-indigo-500',
  },
  {
    stripe: 'bg-teal-500',
    avatar: 'bg-teal-500/15',
    avatarText: 'text-teal-700 dark:text-teal-300 eeert:text-teal-800',
    tag: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 eeert:text-teal-800',
    ring: 'ring-teal-500',
  },
  {
    stripe: 'bg-emerald-500',
    avatar: 'bg-emerald-500/15',
    avatarText: 'text-emerald-700 dark:text-emerald-300 eeert:text-emerald-800',
    tag: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 eeert:text-emerald-800',
    ring: 'ring-emerald-500',
  },
  {
    stripe: 'bg-amber-500',
    avatar: 'bg-amber-500/15',
    avatarText: 'text-amber-700 dark:text-amber-300 eeert:text-amber-900',
    tag: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 eeert:text-amber-900',
    ring: 'ring-amber-500',
  },
  {
    stripe: 'bg-orange-500',
    avatar: 'bg-orange-500/15',
    avatarText: 'text-orange-700 dark:text-orange-300 eeert:text-orange-900',
    tag: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 eeert:text-orange-900',
    ring: 'ring-orange-500',
  },
  {
    stripe: 'bg-rose-500',
    avatar: 'bg-rose-500/15',
    avatarText: 'text-rose-700 dark:text-rose-300 eeert:text-rose-800',
    tag: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 eeert:text-rose-800',
    ring: 'ring-rose-500',
  },
  {
    stripe: 'bg-pink-500',
    avatar: 'bg-pink-500/15',
    avatarText: 'text-pink-700 dark:text-pink-300 eeert:text-pink-800',
    tag: 'bg-pink-500/10 text-pink-700 dark:text-pink-300 eeert:text-pink-800',
    ring: 'ring-pink-500',
  },
] as const;

/** Stable accent for a room id (deterministic hash → palette index). */
export function getRoomAccent(id: string): RoomAccent {
  const idx = [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % ROOM_ACCENTS.length;
  return ROOM_ACCENTS[idx];
}
