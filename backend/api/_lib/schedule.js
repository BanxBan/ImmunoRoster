function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateString, days) {
  const date = new Date(dateString);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

function isDateOnOrBeforeToday(dateString) {
  if (!dateString) return false;
  const today = formatDate(new Date());
  return dateString <= today;
}

export function withBoosterStatus(record) {
  const interval = Number(record.booster_interval_days || 0);
  const nextDueDate =
    record.next_due_date ||
    (record.administered_date && interval > 0
      ? addDays(record.administered_date, interval)
      : null);

  const dueBySchedule =
    record.status !== "completed" && isDateOnOrBeforeToday(record.scheduled_date);
  const dueByInterval = isDateOnOrBeforeToday(nextDueDate);

  return {
    ...record,
    next_due_date: nextDueDate,
    is_booster_due: dueBySchedule || dueByInterval
  };
}

export function withRefillStatus(record) {
  const interval = Number(record.refill_interval_days || 0);
  const nextRefillDate =
    record.next_refill_date ||
    (record.last_refill_date && interval > 0
      ? addDays(record.last_refill_date, interval)
      : null);

  return {
    ...record,
    next_refill_date: nextRefillDate,
    is_refill_due: isDateOnOrBeforeToday(nextRefillDate)
  };
}
