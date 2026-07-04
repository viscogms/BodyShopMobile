import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const APP_DIMENSIONS = { width, height };

export const SIDEBAR_WIDTH = width * 0.65;

export const GRID_LAYOUT = {
  PADDING: 8,
  GAP: 6,
  getCardWidth: () => (width - 8 * 2 - 6 * 2) / 3,
};

// ── Status options ────────────────────────────────────────────────
export const STATUS_OPTIONS = [
  'Inspection', 'Quote', 'Approval', 'Parts', 'WIP',
  'Wheel Alignment', 'Road Test', 'Final Check', 'Cleaning', 'Ready',
  'Delivered', 'Test Job',
];

// Statuses that make a card inactive/dimmed
export const INACTIVE_STATUSES = ['Delivered', 'Test Job'];

// NOTE: Parts catalog is DB-driven (fetched from /api/parts).
// No static catalog needed here — managed via Admin → Manage Parts screen.