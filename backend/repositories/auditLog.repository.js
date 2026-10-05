import AuditLog from "../models/auditLog.model.js";

const auditLogQuery = (filter) => AuditLog.find(filter)
  .populate("performedBy", "name email role");

export const listAuditLogRecords = async ({ action, entityType, from, to, page, limit }) => {
  const filter = {};
  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    auditLogQuery(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter)
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit))
  };
};