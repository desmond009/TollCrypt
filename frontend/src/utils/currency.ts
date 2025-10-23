/**
 * Currency formatting utilities for the Toll Crypt application
 */

/**
 * Format amount in ETH with appropriate precision
 * @param amount - Amount in ETH (as number or string)
 * @param precision - Number of decimal places (default: 4)
 * @returns Formatted string with ETH symbol
 */
export const formatETH = (amount: number | string, precision: number = 4): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '0.0000 ETH';
  }
  
  return `${numAmount.toFixed(precision)} ETH`;
};

/**
 * Format amount in ETH for display in cards/dashboards
 * @param amount - Amount in ETH (as number or string)
 * @returns Formatted string with ETH symbol, optimized for display
 */
export const formatETHDisplay = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '0.0000 ETH';
  }
  
  // For display purposes, use 2 decimal places for cleaner look
  return `${numAmount.toFixed(2)} ETH`;
};

/**
 * Format amount in ETH for small values (like wallet balance)
 * @param amount - Amount in ETH (as number or string)
 * @returns Formatted string with ETH symbol, showing more precision
 */
export const formatETHSmall = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '0.0000 ETH';
  }
  
  return `${numAmount.toFixed(6)} ETH`;
};

/**
 * Convert Wei to ETH and format
 * @param weiAmount - Amount in Wei (as string or BigInt)
 * @param precision - Number of decimal places (default: 4)
 * @returns Formatted string with ETH symbol
 */
export const formatWeiToETH = (weiAmount: string | bigint, precision: number = 4): string => {
  const wei = typeof weiAmount === 'string' ? BigInt(weiAmount) : weiAmount;
  const eth = Number(wei) / 1e18;
  return formatETH(eth, precision);
};
