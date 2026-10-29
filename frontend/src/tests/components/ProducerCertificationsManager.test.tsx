import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProducerCertificationsManager } from '@/shared/components/profile/ProducerCertificationsManager';
import type { ProducerCertificacion } from '@/shared/types/producerProfile';

const EXISTING_CERTIFICATION: ProducerCertificacion = {
  id: 1,
  nombre: 'Certificación existente',
  archivoUrl: '/certificacion-existente.pdf',
  tamanoBytes: 1024,
  mimeType: 'application/pdf',
};

function makePdf() {
  return new File(['%PDF-1.4'], 'certificacion.pdf', { type: 'application/pdf' });
}

function renderManager(
  onUpload = vi.fn().mockResolvedValue(undefined),
  certificaciones: ProducerCertificacion[] = [],
  onDelete = vi.fn().mockResolvedValue(undefined),
) {
  render(
    <ProducerCertificationsManager
      certificaciones={certificaciones}
      onUpload={onUpload}
      onDelete={onDelete}
    />,
  );
  return { onUpload, onDelete };
}

describe('ProducerCertificationsManager', () => {
  it('muestra un estado claro cuando no hay certificaciones', () => {
    renderManager();
    expect(screen.getByText('Sin certificaciones cargadas.')).toBeInTheDocument();
  });

  it('rechaza una imagen con un mensaje humano y conserva el nombre', async () => {
    const user = userEvent.setup();
    const { onUpload } = renderManager();
    const nameInput = screen.getByLabelText(/nombre del documento/i);
    const fileInput = screen.getByLabelText(/archivo pdf/i);

    await user.type(nameInput, 'Matrícula');
    fireEvent.change(fileInput, {
      target: { files: [new File(['imagen'], 'foto.png', { type: 'image/png' })] },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'La certificación debe ser un archivo PDF.',
    );
    expect(nameInput).toHaveValue('Matrícula');
    expect(fileInput).toHaveValue('');
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('informa el límite real de 10 MB antes de subir', () => {
    const { onUpload } = renderManager();
    const bigPdf = makePdf();
    Object.defineProperty(bigPdf, 'size', { value: 11 * 1024 * 1024 });

    fireEvent.change(screen.getByLabelText(/archivo pdf/i), {
      target: { files: [bigPdf] },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('tamaño máximo de 10 MB');
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('oculta errores técnicos, conserva lista y campos, y permite reintentar', async () => {
    const user = userEvent.setup();
    let resolveRetry!: () => void;
    const retry = new Promise<void>((resolve) => {
      resolveRetry = resolve;
    });
    const onUpload = vi
      .fn()
      .mockRejectedValueOnce({
        isAxiosError: true,
        message: 'Request failed with status code 400',
        response: { status: 400, data: {} },
      })
      .mockReturnValueOnce(retry);
    renderManager(onUpload, [EXISTING_CERTIFICATION]);

    const nameInput = screen.getByLabelText(/nombre del documento/i);
    const fileInput = screen.getByLabelText(/archivo pdf/i);
    await user.type(nameInput, 'Documento nuevo');
    await user.upload(fileInput, makePdf());
    await user.click(screen.getByRole('button', { name: 'Subir PDF' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no se pudo subir la certificación/i,
    );
    expect(screen.queryByText(/status code 400/i)).not.toBeInTheDocument();
    expect(screen.getByText(EXISTING_CERTIFICATION.nombre)).toBeInTheDocument();
    expect(nameInput).toHaveValue('Documento nuevo');

    await user.click(screen.getByRole('button', { name: 'Subir PDF' }));
    expect(screen.getByRole('button', { name: 'Subiendo…' })).toBeDisabled();
    expect(nameInput).toBeDisabled();
    expect(fileInput).toBeDisabled();

    resolveRetry();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Certificación cargada correctamente.',
    );
    expect(screen.getByRole('button', { name: 'Subir PDF' })).toBeDisabled();
    expect(onUpload).toHaveBeenCalledTimes(2);
  });

  it('solicita confirmación antes de eliminar una certificación', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    renderManager(undefined, [EXISTING_CERTIFICATION], onDelete);

    await user.click(screen.getByRole('button', { name: /eliminar/i }));

    expect(
      screen.getByRole('dialog', { name: 'Eliminar certificación' }),
    ).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Cancelar/ }));
    expect(screen.queryByRole('dialog', { name: 'Eliminar certificación' })).not.toBeInTheDocument();
  });
});
