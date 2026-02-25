const { z } = require('zod');

// Copying necessary parts from useDynamicFormSchema to test it standalone
function createFormSchema(fields) {
    const schemaObj = {};
    const fieldRelationships = [];
    const conditionalChecks = [];

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

        switch (type) {
            case "date":
                fieldSchema = required
                    ? z.union([z.date(), z.string()], {
                        required_error: `${displayName} is required`,
                        invalid_type_error: `${displayName} must be a valid date`,
                    })
                    : z.union([z.date(), z.string()]).optional();
                break;
            default:
                if (inputType === "select" && options) {
                    const values = options.map((option) => option.value);
                    fieldSchema = required
                        ? z.string({ required_error: `${displayName} is required` })
                            .min(1, `${displayName} is required`)
                            .refine((value) => freeSolo || values.includes(value), {
                                message: `Please select a valid option for ${displayName}`,
                            })
                        : z.string().optional().refine((value) => !value || freeSolo || values.includes(value), {
                            message: `Please select a valid option for ${displayName}`,
                        });
                } else {
                    fieldSchema = required
                        ? z.coerce.string({ required_error: `${displayName} is required` }).min(1, `${displayName} is required`)
                        : z.coerce.string().optional();
                }
        }

        if (defaultValue !== undefined) {
            try {
                fieldSchema = fieldSchema.default(() => defaultValue);
            } catch (error) { }
        }

        schemaObj[name] = fieldSchema;
    });

    return z.object(schemaObj);
}

const rentalFields = [
    {
        name: "bookId",
        label: "Book ID",
        inputType: "select",
        resource: "library/books",
        labelKey: ["number", "name"],
        valueKey: "_id",
        required: true,
    },
    {
        name: "studentId",
        label: "Student ID",
        inputType: "async-text",
        asyncProps: {
            endpoint: "/api/users",
            queryKey: "_id",
            displayKey: "name",
            responseKey: "users"
        },
        required: true,
    },
    {
        name: "rentedDate",
        label: "Rented Date",
        inputType: "date",
        type: "date",
        required: true,
        defaultValue: "2026-02-25",
    },
    {
        name: "receivedDate",
        label: "Received Date",
        inputType: "date",
        type: "date",
    },
];

const schema = createFormSchema(rentalFields);

const result = schema.safeParse({
    bookId: "", // empty
    studentId: "user123",
    rentedDate: "2026-02-25",
    receivedDate: ""
});

if (!result.success) {
    console.log("Validation Failed:", JSON.stringify(result.error.errors, null, 2));
} else {
    console.log("Validation Passed:", result.data);
}
