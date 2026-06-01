import { differenceInCalendarDays, format, parseISO } from 'date-fns';

export const todayIso = () => format(new Date(), 'yyyy-MM-dd');

export const formatShort = (iso: string) => format(parseISO(iso), 'MMM d');

export const daysUntil = (iso: string) =>
  differenceInCalendarDays(parseISO(iso), new Date());
