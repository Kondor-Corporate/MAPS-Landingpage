import { api } from '@/lib/axios';
import type { ChangeMyPasswordBody } from '@/modules/auth/types';

export async function changeMyPassword(body: ChangeMyPasswordBody): Promise<void> {
  await api.patch('/auth/me/password', body);
}
