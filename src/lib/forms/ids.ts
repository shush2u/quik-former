export interface IdGenerator {
  generate(): string;
}

export interface Clock {
  now(): string;
}

export const browserIdGenerator: IdGenerator = {
  generate: () => crypto.randomUUID(),
};

export const systemClock: Clock = {
  now: () => new Date().toISOString(),
};
