import { browserIdGenerator, systemClock } from "@/lib/forms/ids";
import { QuikFormerDatabase } from "@/lib/storage/database";
import { DexieFormRepository } from "@/lib/storage/formRepository";

export const formDatabase = new QuikFormerDatabase();
export const formRepository = new DexieFormRepository(formDatabase, {
  ids: browserIdGenerator,
  clock: systemClock,
});
