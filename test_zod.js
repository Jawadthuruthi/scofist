const { z } = require('zod');

const schema = z.object({
    bookId: z.coerce.string().min(1, "Book ID required"),
    studentId: z.coerce.string().min(1, "Student ID required"),
    rentedDate: z.union([z.date(), z.string()]),
    receivedDate: z.union([z.date(), z.string()]).optional()
});

try {
    schema.parse({
        bookId: "",
        studentId: "",
        rentedDate: "2026-02-25",
        receivedDate: ""
    });
    console.log("Success");
} catch (e) {
    console.error("Errors:", e.errors);
}
