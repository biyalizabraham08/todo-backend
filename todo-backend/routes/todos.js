const router = require("express").Router();
const controller =
    require("../controllers/todoController");

const auth =
    require("../middleware/auth");

router.get("/", auth, controller.getTodos);
router.get("/:id", auth, controller.getTodoById);

const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinary");
const path = require("path");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "todo_attachments",
    resource_type: "auto", // Allows uploading non-image files (like PDFs) as raw
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return file.fieldname + '-' + uniqueSuffix;
    }
  },
});
const upload = multer({ storage: storage });

router.post("/", auth, controller.createTodo);

router.put("/:id", auth, controller.updateTodo);

router.delete("/:id", auth, controller.deleteTodo);

// Attachment routes
router.post("/:id/attachments", auth, upload.single('attachment'), controller.uploadAttachment);
router.delete("/:id/attachments/*filename", auth, controller.deleteAttachment);

module.exports = router;
