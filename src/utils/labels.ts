import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ChatLabel } from '../types';

export const DEFAULT_LABELS: ChatLabel[] = [];

export const LABEL_COLORS: { [key: string]: { bg: string; text: string; border: string; badge: string } } = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    badge: 'bg-blue-500 text-white',
  },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    badge: 'bg-emerald-500 text-white',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    badge: 'bg-amber-500 text-white',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    badge: 'bg-purple-500 text-white',
  },
  teal: {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    badge: 'bg-teal-500 text-white',
  },
  rose: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    badge: 'bg-rose-500 text-white',
  },
};

export const fetchLabels = async (): Promise<ChatLabel[]> => {
  try {
    const snap = await getDocs(collection(db, 'labels'));
    const list: ChatLabel[] = [];
    snap.forEach((d) => {
      list.push(d.data() as ChatLabel);
    });
    return list;
  } catch (err) {
    console.warn('Error fetching labels:', err);
    return [];
  }
};

export const createCustomLabel = async (name: string, color: string, counselorId?: string): Promise<ChatLabel> => {
  const id = `label_${Date.now()}`;
  const label: ChatLabel = { id, name, color, counselorId };
  await setDoc(doc(db, 'labels', id), label);
  return label;
};

export const deleteCustomLabel = async (labelId: string): Promise<void> => {
  await deleteDoc(doc(db, 'labels', labelId));
};
