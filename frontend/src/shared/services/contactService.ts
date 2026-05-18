const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export interface ContactFormData {
  nombre: string;
  email: string;
  telefono?: string;
  asunto: string;
  mensaje: string;
}

export interface ContactResponse {
  data: {
    id: number;
    nombre: string;
    email: string;
    asunto: string;
    creadoEn: string;
  };
  message: string;
  error: null;
}

export const contactService = {
  /**
   * Envía un formulario de contacto
   */
  async submitForm(data: ContactFormData): Promise<ContactResponse['data']> {
    try {
      const response = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const json = (await response.json()) as ContactResponse;

      if (!response.ok) {
        throw new Error(json.message || 'Error al enviar formulario');
      }

      return json.data;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Error desconocido al enviar formulario');
    }
  },

  /**
   * Obtiene todos los mensajes de contacto (solo admin)
   */
  async getMessages(pagina: number = 1, limite: number = 20) {
    const response = await fetch(
      `${API_BASE}/contact?pagina=${pagina}&limite=${limite}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('maps_access_token') || sessionStorage.getItem('maps_access_token')}`,
        },
        credentials: 'include',
      },
    );

    if (!response.ok) {
      throw new Error('Error al obtener mensajes');
    }

    return response.json();
  },

  /**
   * Obtiene un mensaje específico (solo admin)
   */
  async getMessageById(id: number) {
    const response = await fetch(
      `${API_BASE}/contact/${id}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('maps_access_token') || sessionStorage.getItem('maps_access_token')}`,
        },
        credentials: 'include',
      },
    );

    if (!response.ok) {
      throw new Error('Error al obtener mensaje');
    }

    return response.json();
  },

  /**
   * Marca un mensaje como leído (solo admin)
   */
  async markAsRead(id: number) {
    const response = await fetch(
      `${API_BASE}/contact/${id}/read`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('maps_access_token') || sessionStorage.getItem('maps_access_token')}`,
        },
        credentials: 'include',
      },
    );

    if (!response.ok) {
      throw new Error('Error al marcar como leído');
    }

    return response.json();
  },

  /**
   * Marca un mensaje como respondido (solo admin)
   */
  async markAsResponded(id: number) {
    const response = await fetch(
      `${API_BASE}/contact/${id}/responded`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('maps_access_token') || sessionStorage.getItem('maps_access_token')}`,
        },
        credentials: 'include',
      },
    );

    if (!response.ok) {
      throw new Error('Error al marcar como respondido');
    }

    return response.json();
  },

  /**
   * Elimina un mensaje (solo admin)
   */
  async deleteMessage(id: number) {
    const response = await fetch(
      `${API_BASE}/contact/${id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('maps_access_token') || sessionStorage.getItem('maps_access_token')}`,
        },
        credentials: 'include',
      },
    );

    if (!response.ok) {
      throw new Error('Error al eliminar mensaje');
    }

    return response.json();
  },
};
