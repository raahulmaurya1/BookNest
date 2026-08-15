export const BOOK_STATUSES = {
  WANT_TO_READ: 'Want to Read',
  READING: 'Reading',
  FINISHED: 'Finished',
};

export const SHELF_ROLES = {
  OWNER: 'owner',
  EDITOR: 'editor',
  VIEWER: 'viewer',
};

export const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: false,
  requireLowercase: false,
  requireNumber: false,
  requireSpecial: false,
};

export const getPasswordRuleMessage = () => {
  return 'Password must be at least 8 characters long';
};