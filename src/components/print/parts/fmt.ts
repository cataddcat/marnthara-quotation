// Shared 2-decimal Thai number format for the print parts (was local to PrintDocument).
export const fmtNum = (num: number): string =>
  num.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
