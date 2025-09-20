// Color presets (from Tailwind CSS)
export const COLOR_PRESETS = [
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#ffffff' },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' }
];

// Text alignment options
export const TEXT_ALIGN_OPTIONS = [
  { name: 'Left', value: 'left' as const },
  { name: 'Center', value: 'center' as const },
  { name: 'Right', value: 'right' as const }
] as const;