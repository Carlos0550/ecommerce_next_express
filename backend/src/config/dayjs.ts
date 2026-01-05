import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/es';


dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);


export const DEFAULT_TZ = process.env.APP_TZ || 'America/Argentina/Buenos_Aires';
const zone = (dayjs.tz as any).zone?.(DEFAULT_TZ);
if (!zone) {
  console.warn(`[time] Zona inválida "${DEFAULT_TZ}", fallback America/Argentina/Buenos_Aires`);
  dayjs.tz.setDefault('America/Argentina/Buenos_Aires');
} else {
  dayjs.tz.setDefault(DEFAULT_TZ);
}
dayjs.locale('es');


export const nowTz = () => dayjs.tz();
export const toTz = (date?: string | number | Date) => dayjs.tz(date);

export default dayjs;