import { listAuditLogRecords } from "../repositories/auditLog.repository.js";

const fail = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = "INVALID_AUDIT_FILTER";
  throw error;
};

const parseDate = (value, field, endOfDay = false) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) fail(`${field} must be a valid date`);
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setUTCHours(23, 59, 59, 999);
  }
  return date;
};

export const getAuditLogsService = async (query = {}) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);
  const from = parseDate(query.from, "From date");
  const to = parseDate(query.to, "To date", true);

  if (from && to && from > to) fail("From date must be before the to date");

  return listAuditLogRecords({
    action: query.action?.trim(),
    entityType: query.entityType?.trim(),
    from,
    to,
    page,
    limit
  });
};