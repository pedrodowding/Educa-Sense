export const getLocalDateISOString = (): string => {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  // Subtrai o offset para ajustar o tempo UTC para corresponder ao horário local
  // Nota: getTimezoneOffset retorna positivo para zonas atrás de UTC (ex: Brasil é 180)
  // UTC = Local + Offset => Local = UTC - Offset
  const localDate = new Date(d.getTime() - offset);
  return localDate.toISOString().slice(0, 10);
};

export const getDayLabel = (dateStr: string): string => {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  // Precisamos garantir que a data seja interpretada corretamente no timezone local
  // Se passarmos "2024-01-28" para new Date(), ele assume UTC (dia 28 00:00 UTC)
  // O getDay() retorna o dia da semana dessa data.
  // Como 00:00 UTC é 21:00 do dia anterior no Brasil, isso daria erro.
  // Solução: Adicionar "T12:00:00" para garantir meio-dia e evitar virada de dia por fuso
  const d = new Date(`${dateStr}T12:00:00`);
  return days[d.getDay()];
};

export const getIsoWeekKey = (dateStr?: string): string => {
  const base = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();
  const utcDate = new Date(Date.UTC(base.getFullYear(), base.getMonth(), base.getDate()));
  const dayNr = (utcDate.getUTCDay() + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);
  const weekNo = 1 + Math.round((utcDate.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const year = utcDate.getUTCFullYear();
  return `${year}-W${String(weekNo).padStart(2, '0')}`;
};
