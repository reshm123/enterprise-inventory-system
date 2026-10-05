import { successResponse } from "../utils/response.js";
import { getAuditLogsService } from "../services/auditLog.service.js";

export const listAuditLogs = async (req, res, next) => {
  try {
    const result = await getAuditLogsService(req.query);
    return successResponse(res, 200, "Audit logs fetched successfully", result);
  } catch (error) {
    next(error);
  }
};