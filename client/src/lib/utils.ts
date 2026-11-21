export const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');
export const formatDate = (value: string | Date) => new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
