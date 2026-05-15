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
  brandBlue: '#4974B2',
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

// Department/employee structure
export const DEPARTMENT_EMPLOYEES: Record<string, string[]> = {
  Operation: ['Nishit Patel'],
  QA: ['Vaibhav Desai'],
  QC: ['Vasant Sarla'],
  HR: ['Mohit Goswami', 'Vrunda Thakkar', 'Harshida Pandor'],
  Maintenance: ['Patel Pritesh'],
  Account: ['Parmar Romik'],
  Purchase: ['Ajinkya Bapat'],
  Marketing: ['Mayur Dod', 'RajvinderKaur Hunda'],
};

export const DEPARTMENTS_STAFF: string[] = [
  ...Object.keys(DEPARTMENT_EMPLOYEES),
  'Others',
];

export const DEPARTMENTS_FACTORY: string[] = ['Operation', 'QA', 'QC'];

export const MANAGEMENT_PERSONS: string[] = [
  'RAJKUMAR CHAUDHARY',
  'VINU CHAVDA',
  'PRABHAT SINGH KUMAR',
  'POOJA LOKHANDE',
  'KRATI GUPTA',
  'CHETNA BODKE',
];

export const categoryColors: Record<
  VisitorCategory,
  { bg: string; text: string; border: string; accent: string }
> = {
  factory_visit: { bg: '#FEF9C3', text: '#854D0E', border: '#FDE68A', accent: '#CA8A04' },
  staff_visit: { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE', accent: '#2563EB' },
  management: { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0', accent: '#16A34A' },
};

export const categoryLabel = (c: VisitorCategory): string =>
  CATEGORIES.find((x) => x.value === c)?.label ?? c;
