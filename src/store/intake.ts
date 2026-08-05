import { create } from 'zustand';
import type { Severity } from '@/lib/screening';

export interface IntakeState {
  consent: { cb1: boolean; cb2: boolean; cb3: boolean };
  reporter: {
    type: 'self' | 'other';
    name: string;
    address: string;
    email: string;
    phone: string;
  };
  victim: { name: string; contact: string };
  profile: {
    branch: string;
    kp: string;
    gender: string;
    dob: string;
    age: string;
    nationality: string;
    incidentPlace: string;
    initialViolationTypes: string[];
  };
  qIndex: number;
  answers: { question: string; cat: string; frame: string; transcript: string }[];
  staffObs: string[];
  hasViolation: boolean | null;
  violationDetails: string[];
  severity: Severity | null;
  specialTests: string[];
  extraFacts: string;
  aiResult: AIResult | null;
  extraAnswers: Record<string, string>;
  referrals: string[];
  referralNote: string;
  signatureStaff: string;
  signatureStaffName: string;
  signatureClient: string;
  caseCode: string | null;
  caseId: string | null;
  audioBlobs: (Blob | null)[];
  photos: { blob: Blob; previewUrl: string; name: string }[];
}

export interface AIResult {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
  violationTags: { type: string; label: string }[];
  recommendations: string[];
  followUpQuestions: { category: string; question: string }[];
}

const INIT: IntakeState = {
  consent: { cb1: false, cb2: false, cb3: true },
  reporter: { type: 'self', name: '', address: '', email: '', phone: '' },
  victim: { name: '', contact: '' },
  profile: {
    branch: 'สีลม (Silom)', kp: 'FSW', gender: 'หญิง',
    dob: '', age: '', nationality: 'ไทย', incidentPlace: '',
    initialViolationTypes: [],
  },
  qIndex: 0,
  answers: [],
  staffObs: [],
  hasViolation: null,
  violationDetails: [],
  severity: null,
  specialTests: [],
  extraFacts: '',
  aiResult: null,
  extraAnswers: {},
  referrals: [],
  referralNote: '',
  signatureStaff: '',
  signatureStaffName: '',
  signatureClient: '',
  caseCode: null,
  caseId: null,
  audioBlobs: [],
  photos: [],
};

interface Store extends IntakeState {
  set: <K extends keyof IntakeState>(k: K, v: IntakeState[K]) => void;
  patch: (p: Partial<IntakeState>) => void;
  reset: () => void;
}

export const useIntake = create<Store>((set) => ({
  ...INIT,
  set: (k, v) => set({ [k]: v } as Partial<IntakeState>),
  patch: (p) => set(p),
  reset: () => set(INIT),
}));
