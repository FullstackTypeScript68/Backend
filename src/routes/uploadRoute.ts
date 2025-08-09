// import { Router } from "express";
// import multer from "multer";
// import path from "path";
// import { dbClient } from "@db/client.js";
// import { todoTable } from "@db/schema.js";

// console.log("🚀 uploadRoute.ts loaded");

// const router = Router();

// const storage = multer.diskStorage({
//   destination: "uploads/",
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname);
//     cb(null, `${Date.now()}${ext}`);
//   },
// });
// const upload = multer({ storage });

// router.post("/todo", upload.single("image"), async (req, res, next) => {
//   console.log("📦 req.body:", req.body);
//   console.log("🖼️ req.file:", req.file);

//   const { todoText } = req.body;
//   if (!todoText) throw new Error("Missing todoText");

//   const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

//   const [created] = await dbClient
//     .insert(todoTable)
//     .values({ todoText, imageUrl })
//     .returning();

//   res.json({ message: "OK", data: created });
// });

// export default router;

import { Router } from "express";
import multer from "multer";
import path from "path";

const router = Router();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    // now we include the extension explicitly:
    cb(null, `${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

router.post("/api/todo", upload.single("image"), (req, res) => {
  const { todoText } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  res.json({ message: "OK", todoText, imageUrl });
});

export default router;
