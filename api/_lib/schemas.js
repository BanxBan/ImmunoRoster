import { z } from "zod";
import { sanitizedString, optionalSanitizedString } from "./validation.js";

// Common schemas
export const idSchema = z.string().uuid();
export const optionalIdSchema = z.string().uuid().optional();

// Patient Schema
export const patientSchema = z.object({
  full_name: sanitizedString.min(1, "Full name is required"),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  sex: z.enum(["Male", "Female", "Other"]).optional().nullable(),
  contact_number: optionalSanitizedString,
  barangay: optionalSanitizedString,
  municipality: optionalSanitizedString,
  address: optionalSanitizedString,
}).strict();

export const patientUpdateSchema = patientSchema.partial();

// Provider Schema
export const providerSchema = z.object({
  full_name: sanitizedString.min(1, "Full name is required"),
  role: sanitizedString.min(1, "Role is required"),
  license_number: optionalSanitizedString,
  facility_name: optionalSanitizedString,
  contact_number: optionalSanitizedString,
}).strict();

export const providerUpdateSchema = providerSchema.partial();

// Immunization Schema
export const immunizationSchema = z.object({
  patient_id: idSchema,
  provider_id: optionalIdSchema.nullable(),
  vaccine_name: sanitizedString.min(1, "Vaccine name is required"),
  dose_number: z.number().int().positive().default(1),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  administered_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  booster_interval_days: z.number().int().nonnegative().default(365),
  next_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: z.enum(["pending", "due", "completed"]).default("pending"),
  notes: optionalSanitizedString,
}).strict();

export const immunizationUpdateSchema = immunizationSchema.partial();

// Animal Bite Schema
export const animalBiteSchema = z.object({
  patient_id: idSchema,
  provider_id: optionalIdSchema.nullable(),
  animal_type: sanitizedString.min(1, "Animal type is required"),
  incident_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  registration_no: optionalSanitizedString,
  date_registered: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  place_of_exposure: optionalSanitizedString,
  source_of_exposure: optionalSanitizedString,
  source_other_details: optionalSanitizedString,
  source_vaccination_status: optionalSanitizedString,
  status_of_animal_after_14_days: optionalSanitizedString,
  remarks: optionalSanitizedString,
  severity_category: optionalSanitizedString,
  wound_washing_done: z.boolean().optional().nullable(),
  rig_given: z.boolean().optional().nullable(),
  anti_rabies_vaccine_given: z.boolean().optional().nullable(),
  vaccine_generic_name: optionalSanitizedString,
  vaccine_brand_name: optionalSanitizedString,
  vaccine_route: optionalSanitizedString,
  post_exposure_schedule: optionalSanitizedString,
  schedule_d0: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  schedule_d3: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  schedule_d7: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  schedule_d28: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  is_minor_patient: z.boolean().optional().nullable(),
  guardian_name: optionalSanitizedString,
  guardian_email: z.string().email().optional().nullable(),
  consent_given: z.boolean().optional().nullable(),
  consent_given_by: optionalSanitizedString,
  consent_statement: optionalSanitizedString,
  treatment_protocol: optionalSanitizedString,
  total_required_doses: z.number().int().positive().default(4),
  doses_administered: z.number().int().nonnegative().default(0),
  days_between_doses: z.number().int().nonnegative().default(3),
  last_dose_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  next_visit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  treatment_status: z.enum(["pending", "due", "completed", "missed"]).default("pending"),
  notes: optionalSanitizedString,
}).strict();

export const animalBiteUpdateSchema = animalBiteSchema.partial();

// Query Schemas (for GET requests)
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
});

export const resourceIdQuerySchema = z.object({
  id: idSchema,
});

export const patientSearchQuerySchema = z.object({
  id: optionalIdSchema,
  search: z.string().optional(),
  barangay: z.string().optional(),
  municipality: z.string().optional(),
});

export const patientIdQuerySchema = z.object({
  id: optionalIdSchema,
  patient_id: optionalIdSchema,
  status: z.string().optional(),
});
