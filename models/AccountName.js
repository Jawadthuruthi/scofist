import mongoose from "mongoose";

const AccountNameSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    accountType: {
        type: String,
        required: true,
        enum: ["Org", "College"], // Adjust if other types exist
        default: "Org"
    },
    userId: {
        type: String,
        required: false,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound unique index to prevent duplicate names per accountType and per user
AccountNameSchema.index({ name: 1, accountType: 1, userId: 1 }, { unique: true });

export default mongoose.models.AccountName || mongoose.model("AccountName", AccountNameSchema);
