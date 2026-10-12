const normalizeAllowedRoles = (...roleInputs) => {
  const flattened = [];

  roleInputs.forEach((entry) => {
    if (Array.isArray(entry)) {
      flattened.push(...normalizeAllowedRoles(...entry));
      return;
    }

    if (typeof entry === "string") {
      const trimmedRole = entry.trim();
      if (trimmedRole) {
        flattened.push(trimmedRole);
      }
    }
  });

  return flattened;
};

export const authorizeRoles = (...allowedRoles) => {
  const normalizedAllowedRoles = normalizeAllowedRoles(...allowedRoles);

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        error: {
          code: "AUTH_REQUIRED"
        }
      });
    }

    if (!req.user.role || typeof req.user.role !== "string") {
      return res.status(403).json({
        success: false,
        message: "User role is missing or invalid",
        error: {
          code: "INVALID_USER_ROLE"
        }
      });
    }

    if (req.user.status && req.user.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "Your account is not active and cannot access protected APIs",
        error: {
          code: "ACCOUNT_INACTIVE"
        }
      });
    }

    if (normalizedAllowedRoles.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Authorization configuration error",
        error: {
          code: "ROLE_CONFIG_ERROR"
        }
      });
    }

    if (!normalizedAllowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to perform this operation",
        error: {
          code: "FORBIDDEN"
        }
      });
    }

    return next();
  };
};