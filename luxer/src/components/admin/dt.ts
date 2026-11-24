/** Date → valor de input datetime-local no horário de Brasília */
export const dtLocal = (d: Date | null | undefined) => (d ? new Date(d.getTime() - 3 * 3600_000).toISOString().slice(0, 16) : "");
