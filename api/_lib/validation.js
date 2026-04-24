import { z } from "zod";

/**
 * Validates request data against a schema.
 * @param {Object} req - The request object.
 * @param {Object} schemas - Object containing Zod schemas for body, query, and params.
 * @returns {Object|null} - Validated data or null if validation fails (response already sent).
 */
export function validateRequest(req, res, schemas = {}) {
  const result = {};
  const errors = {};

  try {
    if (schemas.body) {
      const bodyResult = schemas.body.safeParse(req.body);
      if (!bodyResult.success) {
        errors.body = bodyResult.error.format();
      } else {
        result.body = bodyResult.data;
        req.body = bodyResult.data;
      }
    }

    if (schemas.query) {
      const queryResult = schemas.query.safeParse(req.query);
      if (!queryResult.success) {
        errors.query = queryResult.error.format();
      } else {
        result.query = queryResult.data;
        req.query = queryResult.data;
      }
    }

    if (schemas.params) {
      const paramsResult = schemas.params.safeParse(req.params);
      if (!paramsResult.success) {
        errors.params = paramsResult.error.format();
      } else {
        result.params = paramsResult.data;
        req.params = paramsResult.data;
      }
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({
        error: "Validation failed",
        details: errors,
      });
      return null;
    }

    return result;
  } catch (error) {
    res.status(500).json({ error: "Internal validation error" });
    return null;
  }
}

/**
 * Simple HTML escaping utility.
 */
export function escapeHTML(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Zod helper for sanitized strings.
 */
export const sanitizedString = z.string().transform((val) => escapeHTML(val.trim()));
export const optionalSanitizedString = z.string().trim().transform((val) => (val ? escapeHTML(val) : val)).optional();
