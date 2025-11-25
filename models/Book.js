import mongoose from "mongoose";

const bookSchema = new mongoose.Schema({
  course: {
    type: String,
    required: true,
  },
  year: {
    type: String,
    required: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
});

const Book =
  mongoose.models.Book || mongoose.model("Book", bookSchema);

export default Book;