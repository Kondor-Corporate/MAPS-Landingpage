import { z } from 'zod';

export const newsIdSchema = z.object({
  id: z.string().uuid(),
});
