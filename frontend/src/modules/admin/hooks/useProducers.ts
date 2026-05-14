import { create } from 'zustand';
import { producersMock } from '@/modules/admin/data/producersMock';
import type { Producer, ProducerInput } from '@/modules/admin/types/producer';

type ProducersState = {
  producers: Producer[];
  addProducer: (input: ProducerInput) => Producer;
  updateProducer: (id: string, input: ProducerInput) => void;
  setEstado: (id: string, estado: Producer['estado']) => void;
  removeProducer: (id: string) => void;
};

function generateId(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const useProducers = create<ProducersState>((set) => ({
  producers: producersMock,
  addProducer: (input) => {
    const now = new Date().toISOString();
    const created: Producer = {
      id: generateId(),
      ultimaActividad: input.ultimaActividad ?? now,
      fechaAlta: input.fechaAlta ?? now,
      ...input,
    };
    set((state) => ({ producers: [created, ...state.producers] }));
    return created;
  },
  updateProducer: (id, input) =>
    set((state) => ({
      producers: state.producers.map((p) =>
        p.id === id
          ? {
              ...p,
              ...input,
              fechaAlta: input.fechaAlta ?? p.fechaAlta,
              ultimaActividad: input.ultimaActividad ?? p.ultimaActividad,
            }
          : p,
      ),
    })),
  setEstado: (id, estado) =>
    set((state) => ({
      producers: state.producers.map((p) =>
        p.id === id ? { ...p, estado, ultimaActividad: new Date().toISOString() } : p,
      ),
    })),
  removeProducer: (id) =>
    set((state) => ({ producers: state.producers.filter((p) => p.id !== id) })),
}));
