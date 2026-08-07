export function normalizePhoneDigits(phone) {
  return String(phone || '').replace(/[^\d]/g, '');
}

/**
 * Берилган телефон рақами турли форматларда (плюс билан/сиз,
 * мамлакат коди билан/сиз) сақланган бўлиши мумкинлигини
 * ҳисобга олиб, барча мумкин бўлган вариантларни қайтаради.
 */
export function phoneVariants(phone) {
  const digits = normalizePhoneDigits(phone);
  const variants = new Set([digits, `+${digits}`]);

  if (digits.startsWith('998') && digits.length > 9) {
    const local = digits.slice(3);
    variants.add(local);
    variants.add(`+998${local}`);
    variants.add(`998${local}`);
  } else if (digits.length === 9) {
    variants.add(`998${digits}`);
    variants.add(`+998${digits}`);
  }

  return [...variants];
}
