import { useMemo, useCallback } from "react";
import { z } from "zod";

/**
 * Custom hook that provides functionality to dynamically generate Zod validation schemas
 * based on form field configurations.
 *
 * @param {Array} formFields - Optional array of form field configurations to immediately memoize
 * @returns {Object} An object containing the createFormSchema function and memoized schema if formFields were provided
 */
export function useDynamicFormSchema(formFields = null) {
  /**
   * Creates a Zod schema based on form field configurations
   *
   * @param {Array} fields - Array of form field configuration objects
   * @returns {Object} - Compiled Zod schema object
   */
  const createFormSchema = useCallback((fields) => {
    // Initialize schema object
    const schemaObj = {};
    const fieldRelationships = [];

    // First pass: Create base schema for each field
    fields.forEach((field) => {
      const {
        name,
        type,
        inputType,
        options,
        required = false,
        validators = {},
        label,
      } = field;

      let fieldSchema;
      const displayName = label || name;

      // Determine field schema based on field type
      switch (type) {
        case "number":
          // Start with either required or optional base schema
          fieldSchema = required
            ? z.coerce.number({
                required_error: `${displayName} is required`,
                invalid_type_error: `${displayName} must be a number`,
              })
            : z.coerce.number().optional();

          if (validators.min !== undefined) {
            fieldSchema = fieldSchema.min(
              validators.min,
              validators.minMessage ||
                `${displayName} must be at least ${validators.min}`
            );
          }

          if (validators.max !== undefined) {
            fieldSchema = fieldSchema.max(
              validators.max,
              validators.maxMessage ||
                `${displayName} cannot exceed ${validators.max}`
            );
          }
          break;

        case "email":
          fieldSchema = required
            ? z
                .string({
                  required_error: `${displayName} is required`,
                })
                .min(1, `${displayName} is required`)
                .email(validators.emailMessage || "Invalid email address")
            : z
                .string()
                .email(validators.emailMessage || "Invalid email address")
                .optional();
          break;

        case "url":
          fieldSchema = required
            ? z
                .string({
                  required_error: `${displayName} is required`,
                })
                .min(1, `${displayName} is required`)
                .url(validators.urlMessage || "Invalid URL")
            : z
                .string()
                .url(validators.urlMessage || "Invalid URL")
                .optional();
          break;

        case "date":
          fieldSchema = required
            ? z.coerce.date({
                required_error: `${displayName} is required`,
                invalid_type_error: `${displayName} must be a valid date`,
              })
            : z.coerce.date().optional();

          if (validators.minDate) {
            fieldSchema = fieldSchema.min(
              new Date(validators.minDate),
              validators.minDateMessage || "Date is too early"
            );
          }

          if (validators.maxDate) {
            fieldSchema = fieldSchema.max(
              new Date(validators.maxDate),
              validators.maxDateMessage || "Date is too late"
            );
          }
          break;

        case "object":
          // Handle object type for nested forms
          if (field.properties && Array.isArray(field.properties)) {
            // Recursively create schema for nested fields
            const nestedSchema = createFormSchema(field.properties);
            fieldSchema = required ? nestedSchema : nestedSchema.optional();
          } else {
            // Default to empty object if no properties defined
            fieldSchema = required
              ? z.object({}, { required_error: `${displayName} is required` })
              : z.object({}).optional();
          }
          break;

        default: // text, password, etc.
          // Handle select and multiSelect fields
          if (inputType === "select" && options) {
            const values = options.map((option) => option.value);
            fieldSchema = required
              ? z
                  .string({
                    required_error: `${displayName} is required`,
                  })
                  .min(1, `${displayName} is required`)
                  .refine((value) => values.includes(value), {
                    message: `Please select a valid option for ${displayName}`,
                  })
              : z
                  .string()
                  .optional()
                  .refine((value) => !value || values.includes(value), {
                    message: `Please select a valid option for ${displayName}`,
                  });
          } else if (inputType === "multiSelect" && options) {
            const values = options.map((option) => option.value);

            // Create base array schema with selection validation
            let arraySchema = z.array(z.string());

            // Add required validation using refinement instead of min
            if (required) {
              arraySchema = arraySchema.refine((items) => items.length > 0, {
                message: `${displayName} is required`,
              });
            }

            // Add validation for valid options
            arraySchema = arraySchema.refine(
              (items) => items.every((item) => values.includes(item)),
              {
                message: `Please select valid options for ${displayName}`,
              }
            );

            // Add min/max validations
            if (validators.min) {
              arraySchema = arraySchema.refine(
                (items) => items.length === 0 || items.length >= validators.min,
                {
                  message: `Select at least ${validators.min} options for ${displayName}`,
                }
              );
            }

            if (validators.max) {
              arraySchema = arraySchema.refine(
                (items) => items.length <= validators.max,
                {
                  message: `Select at most ${validators.max} options for ${displayName}`,
                }
              );
            }

            fieldSchema = required
              ? arraySchema
              : z.array(z.string()).optional().or(arraySchema);
          } else {
            // Regular text input - start with appropriate base schema
            fieldSchema = required
              ? z
                  .string({
                    required_error: `${displayName} is required`,
                  })
                  .min(1, `${displayName} is required`)
              : z.string().optional();

            if (validators.minLength !== undefined) {
              fieldSchema = fieldSchema.refine(
                (val) => !val || val.length >= validators.minLength,
                {
                  message:
                    validators.minLengthMessage ||
                    `${displayName} must be at least ${validators.minLength} characters`,
                }
              );
            }

            if (validators.maxLength !== undefined) {
              fieldSchema = fieldSchema.refine(
                (val) => !val || val.length <= validators.maxLength,
                {
                  message:
                    validators.maxLengthMessage ||
                    `${displayName} cannot exceed ${validators.maxLength} characters`,
                }
              );
            }

            if (validators.pattern) {
              fieldSchema = fieldSchema.refine(
                (val) => !val || new RegExp(validators.pattern).test(val),
                {
                  message: validators.patternMessage || "Invalid format",
                }
              );
            }

            // Apply trim to string fields
            if (typeof fieldSchema.trim === "function") {
              fieldSchema = fieldSchema.trim();
            }
          }
      }

      // Apply custom validators if provided
      if (validators.custom) {
        fieldSchema = fieldSchema.refine(validators.custom.validation, {
          message: validators.custom.message || `Invalid ${displayName}`,
        });
      }

      // Handle default values
      if (field.defaultValue !== undefined) {
        fieldSchema = fieldSchema.default(field.defaultValue);
      }

      // Add schema to object
      schemaObj[name] = fieldSchema;

      // Store field relationships for refinement
      if (validators.compareWith) {
        validators.compareWith.forEach((comparison) => {
          fieldRelationships.push({
            field1: name,
            field2: comparison.field,
            operator: comparison.operator,
            message: comparison.message,
            errorPath: comparison.errorPath || name,
          });
        });
      }
    });

    // Create base schema
    let schema = z.object(schemaObj);

    // Add refinements for field relationships
    fieldRelationships.forEach((relation) => {
      schema = schema.refine(
        (data) => {
          const value1 = data[relation.field1];
          const value2 = data[relation.field2];

          // Skip validation if either value is undefined, null, or empty
          // Only if both fields have values, we apply the comparison
          if (
            value1 === undefined ||
            value1 === null ||
            value1 === "" ||
            (Array.isArray(value1) && value1.length === 0) ||
            value2 === undefined ||
            value2 === null ||
            value2 === "" ||
            (Array.isArray(value2) && value2.length === 0)
          ) {
            return true;
          }

          switch (relation.operator) {
            case "<":
              return value1 < value2;
            case "<=":
              return value1 <= value2;
            case ">":
              return value1 > value2;
            case ">=":
              return value1 >= value2;
            case "==":
              return value1 === value2;
            case "!=":
              return value1 !== value2;
            default:
              return true;
          }
        },
        {
          message:
            relation.message ||
            `Field ${relation.field1} must be ${relation.operator} field ${relation.field2}`,
          path: [relation.errorPath],
        }
      );
    });

    return schema;
  }, []);

  // Memoize the schema if formFields are provided
  const schema = useMemo(() => {
    return formFields ? createFormSchema(formFields) : null;
  }, [formFields, createFormSchema]);

  return {
    createFormSchema,
    schema, // Return the memoized schema if available
  };
}
