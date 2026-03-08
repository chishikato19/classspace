export const sortVietnameseNames = (a: string, b: string) => {
  const getParts = (name: string) => {
    const parts = name.trim().split(/\s+/);
    const firstName = parts.pop() || '';
    const lastName = parts.shift() || '';
    const middleName = parts.join(' ');
    return { firstName, lastName, middleName };
  };

  const aParts = getParts(a);
  const bParts = getParts(b);

  const collator = new Intl.Collator('vi', { sensitivity: 'base' });

  const firstCmp = collator.compare(aParts.firstName, bParts.firstName);
  if (firstCmp !== 0) return firstCmp;

  const lastCmp = collator.compare(aParts.lastName, bParts.lastName);
  if (lastCmp !== 0) return lastCmp;

  return collator.compare(aParts.middleName, bParts.middleName);
};
