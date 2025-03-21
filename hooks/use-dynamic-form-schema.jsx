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
      } = field;

      let fieldSchema;

      // Determine field schema based on field type
      switch (type) {
        case "number":
          fieldSchema = z.coerce.number();

          if (validators.min !== undefined) {
            fieldSchema = fieldSchema.min(
              validators.min,
              validators.minMessage ||
                `${field.label || name} must be at least ${validators.min}`
            );
          }

          if (validators.max !== undefined) {
            fieldSchema = fieldSchema.max(
              validators.max,
              validators.maxMessage ||
                `${field.label || name} cannot exceed ${validators.max}`
            );
          }
          break;

        case "email":
          fieldSchema = z
            .string()
            .email(validators.emailMessage || "Invalid email address");
          break;

        case "url":
          fieldSchema = z.string().url(validators.urlMessage || "Invalid URL");
          break;

        case "date":
          fieldSchema = z.coerce.date();

          if (validators.minDate) {
            fieldSchema = fieldSchema.min(
              validators.minDate,
              validators.minDateMessage || "Date is too early"
            );
          }

          if (validators.maxDate) {
            fieldSchema = fieldSchema.max(
              validators.maxDate,
              validators.maxDateMessage || "Date is too late"
            );
          }
          break;

        default: // text, password, etc.
          // Handle select and multiSelect fields
          if (inputType === "select" && options) {
            fieldSchema = z.string();
          } else if (inputType === "multiSelect" && options) {
            const values = options.map((option) => option.value);
            fieldSchema = z
              .array(z.string())
              .refine((items) => items.every((item) => values.includes(item)), {
                message: `Please select valid options for ${
                  field.label || name
                }`,
              });
            if (validators.min) {
              fieldSchema = fieldSchema.refine(
                (items) => items.length >= validators.min,
                {
                  message: `Select at least ${validators.min} options for ${
                    field.label || name
                  }`,
                }
              );
            }
            if (validators.max) {
              fieldSchema = fieldSchema.refine(
                (items) => items.length <= validators.max,
                {
                  message: `Select at most ${validators.max} options for ${
                    field.label || name
                  }`,
                }
              );
            }
          } else {
            // Regular text input
            fieldSchema = z.string();

            if (validators.minLength !== undefined) {
              fieldSchema = fieldSchema.min(
                validators.minLength,
                validators.minLengthMessage ||
                  `${field.label || name} must be at least ${
                    validators.minLength
                  } characters`
              );
            }

            if (validators.maxLength !== undefined) {
              fieldSchema = fieldSchema.max(
                validators.maxLength,
                validators.maxLengthMessage ||
                  `${field.label || name} cannot exceed ${
                    validators.maxLength
                  } characters`
              );
            }

            if (validators.pattern) {
              fieldSchema = fieldSchema.regex(
                new RegExp(validators.pattern),
                validators.patternMessage || "Invalid format"
              );
            }

            fieldSchema = fieldSchema.trim();
          }
      }

      // Handle required fields
      if (!required) {
        fieldSchema = fieldSchema.optional();
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

          // Skip validation if either value is undefined
          if (value1 === undefined || value2 === undefined) {
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
