import { ITEM_TYPES } from '@/config/enums';

type ThemeStyle = {
  container: string;
  iconWrapper: string;
  title: string;
  icon: string;
  hover: string;
  badge: string;
  text: string;
  bgSoft: string;
  border: string;
  ring: string; // Added ring support
};

// Helper to construct dynamic Tailwind classes using CSS Variables
const createSemanticTheme = (brandVar: string): ThemeStyle => ({
  // Container: Light mode uses 5% opacity, Dark mode needs more visibility (e.g. 10%)
  // Using 'bg-[hsl(var(--name)/0.05)]' syntax for Tailwind arbitrary values with opacity
  container: `bg-[hsl(var(${brandVar})_/_0.05)] dark:bg-[hsl(var(${brandVar})_/_0.1)] border-[hsl(var(${brandVar})_/_0.2)]`,

  // Icon Wrapper: Clean separation
  iconWrapper: `bg-white dark:bg-[hsl(var(${brandVar})_/_0.15)] text-[hsl(var(${brandVar}))] shadow-sm`,

  title: `text-foreground font-semibold`,

  icon: `text-[hsl(var(${brandVar}))]`,

  // Hover: Gentle glow effect
  hover: `hover:border-[hsl(var(${brandVar})_/_0.5)] hover:bg-[hsl(var(${brandVar})_/_0.08)] dark:hover:bg-[hsl(var(${brandVar})_/_0.15)]`,

  badge: `bg-[hsl(var(${brandVar})_/_0.1)] text-[hsl(var(${brandVar}))]`,

  text: `text-[hsl(var(${brandVar}))]`,

  bgSoft: `bg-[hsl(var(${brandVar})_/_0.1)]`,

  border: `border-[hsl(var(${brandVar}))]`,

  ring: `focus:ring-[hsl(var(${brandVar}))]`,
});

const SEMANTIC_THEMES: Record<string, ThemeStyle> = {
  [ITEM_TYPES.CURTAIN]: createSemanticTheme('--brand-curtain'),
  [ITEM_TYPES.WALLPAPER]: createSemanticTheme('--brand-wallpaper'),
  [ITEM_TYPES.ROLLER_BLIND]: createSemanticTheme('--brand-roller'),
  [ITEM_TYPES.WOODEN_BLIND]: createSemanticTheme('--brand-wood'),
  [ITEM_TYPES.VERTICAL_BLIND]: createSemanticTheme('--brand-vertical'),
  [ITEM_TYPES.ALUMINUM_BLIND]: createSemanticTheme('--brand-alum'),
  [ITEM_TYPES.PARTITION]: createSemanticTheme('--brand-partition'),
  [ITEM_TYPES.PLEATED_SCREEN]: createSemanticTheme('--brand-screen'),
  [ITEM_TYPES.REMOVAL]: createSemanticTheme('--brand-removal'),
};

export const getItemTheme = (type: string): ThemeStyle => {
  return SEMANTIC_THEMES[type] || createSemanticTheme('--foreground');
};
