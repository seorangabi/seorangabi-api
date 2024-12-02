export const isUndefined = (value: unknown): value is undefined =>
  value === undefined;

export const isArray = (value: unknown): value is [] => Array.isArray(value);
