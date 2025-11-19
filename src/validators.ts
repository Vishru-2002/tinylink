const CODE_REGEX = /^[A-Za-z0-9]{6,8}$/;

const isValidCode = (s: string): boolean => CODE_REGEX.test(s);

const isValidUrl = (url: string): boolean => {
  try {
    const u = new URL(url);
    return ['http:', 'https:'].includes(u.protocol);
  } catch {
    return false;
  }
};

export { isValidCode, isValidUrl };
