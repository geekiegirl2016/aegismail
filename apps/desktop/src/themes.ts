export interface Theme {
  key: ThemeKey;
  name: string;
  bg: string;
  panel: string;
  panelAlt: string;
  border: string;
  text: string;
  textDim: string;
  accent: string;
  accentContrast: string;
}

export type ThemeKey = 'graphite' | 'midnight' | 'forest' | 'sunset' | 'paper';

export const THEMES: Record<ThemeKey, Theme> = {
  graphite: {
    key: 'graphite',
    name: 'Graphite',
    bg: '#0B0D10',
    panel: '#13161B',
    panelAlt: '#191D23',
    border: '#242A32',
    text: '#E8EAED',
    textDim: '#8B93A0',
    accent: '#6366F1',
    accentContrast: '#FFFFFF',
  },
  midnight: {
    key: 'midnight',
    name: 'Midnight',
    bg: '#0A0E1A',
    panel: '#111827',
    panelAlt: '#1F2937',
    border: '#374151',
    text: '#F3F4F6',
    textDim: '#9CA3AF',
    accent: '#3B82F6',
    accentContrast: '#FFFFFF',
  },
  forest: {
    key: 'forest',
    name: 'Forest',
    bg: '#0C1410',
    panel: '#121C16',
    panelAlt: '#1A2620',
    border: '#2A3830',
    text: '#E8F0EA',
    textDim: '#8FA294',
    accent: '#10B981',
    accentContrast: '#FFFFFF',
  },
  sunset: {
    key: 'sunset',
    name: 'Sunset',
    bg: '#1A0E10',
    panel: '#231518',
    panelAlt: '#2E1C20',
    border: '#3D272C',
    text: '#FBEAE8',
    textDim: '#B99A94',
    accent: '#F97316',
    accentContrast: '#FFFFFF',
  },
  paper: {
    key: 'paper',
    name: 'Paper',
    bg: '#FAFAF7',
    panel: '#FFFFFF',
    panelAlt: '#F3F3EE',
    border: '#E2E2DB',
    text: '#1A1A1A',
    textDim: '#6B6B63',
    accent: '#4F46E5',
    accentContrast: '#FFFFFF',
  },
};

export const ACCOUNT_COLORS: Record<string, string> = {
  icloud: '#8E8E93',
  gmail: '#EA4335',
  outlook: '#0078D4',
};

export const ACCOUNT_INITIALS: Record<string, string> = {
  icloud: '',
  gmail: 'G',
  outlook: 'O',
};

export const MAILBOX_COLORS: Record<string, string> = {
  inbox: '#3B82F6',
  sent: '#8B5CF6',
  drafts: '#6B7280',
  archive: '#10B981',
  trash: '#9CA3AF',
  spam: '#EF4444',
  other: '#64748B',
};

export type Density = 'compact' | 'comfortable' | 'spacious';
