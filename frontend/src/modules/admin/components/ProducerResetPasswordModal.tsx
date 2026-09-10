import { EntityResetPasswordModal } from '@/shared/components/EntityResetPasswordModal';
import type { ResetProducerPasswordPayload } from '@/modules/admin/types/adminProducer';
import type { Producer } from '@/modules/admin/types/producer';
import { producerNombreCompleto } from '@/modules/admin/types/producer';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  producer: Producer | null;
  submitting?: boolean;
  submitError?: string | null;
  onSubmit: (payload: ResetProducerPasswordPayload) => Promise<void>;
};

export function ProducerResetPasswordModal({
  isOpen,
  onClose,
  producer,
  submitting = false,
  submitError,
  onSubmit,
}: Props) {
  return (
    <EntityResetPasswordModal
      isOpen={isOpen}
      onClose={onClose}
      entityKey={producer?.id ?? null}
      entityLabel={producer ? producerNombreCompleto(producer) : ''}
      submitting={submitting}
      submitError={submitError}
      onSubmit={onSubmit}
    />
  );
}
