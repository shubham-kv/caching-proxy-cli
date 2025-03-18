export const isIntegerString = (value: string): boolean =>
  typeof value === "string" &&
  !Number.isNaN(value) &&
  !Number.isNaN(Number.parseInt(value, 10)) &&
  !Number.isNaN(Number.parseFloat(value)) &&
  /^([-])?\d+$/g.test(value);
