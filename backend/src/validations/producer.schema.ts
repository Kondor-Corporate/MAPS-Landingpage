import { z } from 'zod';

export const producerIdSchema = z.object({
  id: z.string().uuid(),
});
