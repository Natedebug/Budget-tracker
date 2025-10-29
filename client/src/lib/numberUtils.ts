/**
 * Sanitizes a numeric string by removing common formatting characters
 * (commas, dollar signs, spaces) before parsing.
 * 
 * Examples:
 * - "1,200.50" -> 1200.50
 * - "$1,000" -> 1000
 * - "1 000.25" -> 1000.25
 * - "1000" -> 1000
 * 
 * @param value - The string value to sanitize and parse
 * @returns The parsed number, or NaN if invalid
 */
export function parseNumericInput(value: string | number): number {
  if (typeof value === 'number') {
    return value;
  }
  
  // Remove common formatting characters: commas, dollar signs, spaces
  const sanitized = value.replace(/[$,\s]/g, '');
  
  return parseFloat(sanitized);
}

/**
 * Validates that a sanitized numeric input is a positive number
 * Used for currency and other positive-only fields
 */
export function isPositiveNumber(value: string | number): boolean {
  const num = parseNumericInput(value);
  return !isNaN(num) && num > 0;
}

/**
 * Validates that a sanitized numeric input is a non-negative number
 * Used for fields that allow zero
 */
export function isNonNegativeNumber(value: string | number): boolean {
  const num = parseNumericInput(value);
  return !isNaN(num) && num >= 0;
}
