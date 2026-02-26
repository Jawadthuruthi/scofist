import mongoose from "mongoose";

const MarkSchema = new mongoose.Schema(
    {
        examName: { type: String, required: true },
        classId: { type: String, ref: "Class", required: true }, // String, matches User/Class _id type
        subjects: [{ type: String }],
        students: [
            {
                studentId: { type: String, ref: "User" }, // String, matches User _id type
                marks: { type: Map, of: Number },
            },
        ],
    },
    { timestamps: true }
);

export default mongoose.models.Mark || mongoose.model("Mark", MarkSchema);
