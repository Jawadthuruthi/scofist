import { useMemo, useCallback } from "react";
import { z } from "zod";

export function useDynamicFormSchema(formFields = null) {
  const createFormSchema = useCallback((fields) => {
    const schemaObj = {};
    const fieldRelationships = [];

    fields.forEach((field) => {
      const {
        name,
        type,
        inputType,
        options,
        required = false,
        validators = {},
        label,
        defaultValue,
        freeSolo = false,
      } = field;

      let fieldSchema;
      const displayName = label || name;

      // Determine field schema based on field type
      switch (type) {
        case "number":
          fieldSchema = required
            ? z.coerce.number({
                required_error: `${displayName} is required`,
                invalid_type_error: `${displayName} must be a number`,
              })
            : z.coerce.number().optional();

          // Apply min validation
          if (validators.min !== undefined) {
            fieldSchema = fieldSchema.refine(
              (val) => val === undefined || val >= validators.min,
              {
                message:
                  validators.minMessage ||
                  `${displayName} must be at least ${validators.min}`,
              }
            );
          }

          // Apply max validation
          if (validators.max !== undefined) {
            fieldSchema = fieldSchema.refine(
              (val) => val === undefined || val <= validators.max,
              {
                message:
                  validators.maxMessage ||
                  `${displayName} cannot exceed ${validators.max}`,
              }
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

        case "boolean":
          fieldSchema = required
            ? z
                .boolean({
                  required_error: `${displayName} is required`,
                })
                .refine((val) => typeof val === "boolean", {
                  message: `${displayName} must be a boolean value`,
                })
            : z
                .boolean()
                .refine((val) => typeof val === "boolean", {
                  message: `${displayName} must be a boolean value`,
                })
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
            ? z.union([z.date(), z.string()], {
                required_error: `${displayName} is required`,
                invalid_type_error: `${displayName} must be a valid date`,
              })
            : z.union([z.date(), z.string()]).optional();

          if (validators.minDate) {
            fieldSchema = fieldSchema.refine(
              (val) =>
                val !== "" && new Date(val) >= new Date(validators.minDate),
              {
                message: validators.minDateMessage || "Date is too early",
              }
            );
          }

          if (validators.maxDate) {
            fieldSchema = fieldSchema.refine(
              (val) =>
                val !== ""
                  ? new Date(val) <= new Date(validators.maxDate)
                  : true,
              {
                message: validators.maxDateMessage || "Date is too late",
              }
            );
          }
          break;

        case "object":
          if (field.properties && Array.isArray(field.properties)) {
            const nestedSchema = createFormSchema(field.properties);
            fieldSchema = required ? nestedSchema : nestedSchema.optional();
          } else {
            fieldSchema = required
              ? z.object({}, { required_error: `${displayName} is required` })
              : z.object({}).optional();
          }
          break;

        default:
          // Handle select and multiSelect
          if (inputType === "select" && options) {
            const values = options.map((option) => option.value);
            fieldSchema = required
              ? z
                  .string({
                    required_error: `${displayName} is required`,
                  })
                  .min(1, `${displayName} is required`)
                  .refine((value) => freeSolo || values.includes(value), {
                    message: `Please select a valid option for ${displayName}`,
                  })
              : z
                  .string()
                  .optional()
                  .refine(
                    (value) => !value || freeSolo || values.includes(value),
                    {
                      message: `Please select a valid option for ${displayName}`,
                    }
                  );
          } else if (inputType === "multiSelect" && options) {
            const values = options.map((option) => option.value);
            let arraySchema = z.array(z.string());

            if (required) {
              arraySchema = arraySchema.refine((items) => items.length > 0, {
                message: `${displayName} is required`,
              });
            }

            arraySchema = arraySchema.refine(
              (items) => items.every((item) => values.includes(item)),
              {
                message: `Please select valid options for ${displayName}`,
              }
            );

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

            fieldSchema = required ? arraySchema : arraySchema.optional();
          } else {
            // Regular text input
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
          }
      }

      // Apply custom validators
      if (validators.custom) {
        fieldSchema = fieldSchema.refine(validators.custom.validation, {
          message: validators.custom.message || `Invalid ${displayName}`,
        });
      }

      // Handle default values with more robust checking
      if (defaultValue !== undefined) {
        try {
          fieldSchema = fieldSchema.default(() => defaultValue);
        } catch (error) {
          console.warn(
            `Could not set default value for ${name}: ${error.message}`
          );
        }
      }

      schemaObj[name] = fieldSchema;

      // Rest of the function remains the same...
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

    // Remaining code for schema generation is the same as before
    let schema = z.object(schemaObj);

    // Comparison relationships refinement
    fieldRelationships.forEach((relation) => {
      schema = schema.refine(
        (data) => {
          const value1 = data[relation.field1];
          const value2 = data[relation.field2];

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

  const schema = useMemo(() => {
    return formFields ? createFormSchema(formFields) : null;
  }, [formFields, createFormSchema]);

  return {
    createFormSchema,
    schema,
  };
}
