export const colors = {
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  elevated: '#F1F5F9',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  primaryBg: '#0F172A',
  primaryText: '#FFFFFF',
  primaryHover: '#1E293B',
  border: '#E2E8F0',
  borderFocus: '#94A3B8',
  pendingBg: '#FEF3C7',
  pendingText: '#B45309',
  pendingBorder: '#FDE68A',
  approvedBg: '#ECFDF5',
  approvedText: '#047857',
  approvedBorder: '#A7F3D0',
  rejectedBg: '#FEF2F2',
  rejectedText: '#B91C1C',
  rejectedBorder: '#FECACA',
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export type VisitorCategory = 'factory_visit' | 'staff_visit' | 'management';

export const CATEGORIES: { value: VisitorCategory; label: string }[] = [
  { value: 'factory_visit', label: 'Factory Visit' },
  { value: 'staff_visit', label: 'Staff Visit' },
  { value: 'management', label: 'Management' },
];

export const categoryColors: Record<
  VisitorCategory,
  { bg: string; text: string; border: string; accent: string }
> = {
  factory_visit: {
    bg: '#FEF9C3', // yellow-100
    text: '#854D0E', // yellow-800
    border: '#FDE68A', // yellow-300
    accent: '#CA8A04', // yellow-600
  },
  staff_visit: {
    bg: '#DBEAFE', // blue-100
    text: '#1E40AF', // blue-800
    border: '#BFDBFE', // blue-300
    accent: '#2563EB', // blue-600
  },
  management: {
    bg: '#DCFCE7', // green-100
    text: '#166534', // green-800
    border: '#BBF7D0', // green-300
    accent: '#16A34A', // green-600
  },
};

export const categoryLabel = (c: VisitorCategory): string =>
  CATEGORIES.find((x) => x.value === c)?.label ?? c;
