import { z } from 'zod';

export const adminIdSchema = z.object({
  id: z.string().uuid(),
});
