import "dotenv/config";
import { dbClient } from "@db/client.js";
import { todoTable } from "@db/schema.js";
import cors from "cors";
import Debug from "debug";
import { eq } from "drizzle-orm";
import type { ErrorRequestHandler } from "express";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { ownerTable } from "@db/schema.js"; //เพิ่มขึ้นมาใหม่
import multer from "multer";
import path from "path";
import fs from "fs";

const debug = Debug("pf-backend");

//Intializing the express app
const app = express();

// 1) สร้างโฟลเดอร์อัปโหลดทุกครั้งตอนสตาร์ต (กันพลาด)
fs.mkdirSync("uploads", { recursive: true });

// 2) เสิร์ฟไฟล์แบบ static
app.use("/uploads", express.static("uploads"));

// กำหนด path เก็บรูป
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // สร้างโฟลเดอร์นี้ไว้
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

//Middleware
app.use(morgan("dev", { immediate: false }));

app.use(helmet());

// 👇 แทนที่ app.use(helmet());
// app.use(
//   helmet({
//     crossOriginResourcePolicy: { policy: "cross-origin" }, // ✅ เปลี่ยน
//   })
// );

// app.use(
//   helmet({
//     crossOriginResourcePolicy: { policy: "cross-origin" }, // สำคัญ!
//     crossOriginEmbedderPolicy: false,
//     contentSecurityPolicy: false,
//   })
// );

app.use(
  "/uploads",
  express.static("uploads", {
    setHeaders(res) {
      // อนุญาต cross-origin เฉพาะไฟล์รูป
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

// app.use(
//   "/uploads",
//   express.static(path.join(process.cwd(), "uploads"), {
//     setHeaders: (res) => {
//       res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
//       res.setHeader("Access-Control-Allow-Origin", "*"); // เสริมได้
//     },
//   })
// );

app.use(
  cors({
    origin: false, // Disable CORS
    // origin: "*", // Allow all origins
  })
);
// Extracts the entire body portion of an incoming request stream and exposes it on req.body.
app.use(express.json());

// app.post("/todo/upload", upload.single("image"), async (req, res) => {
//   const { todoText } = req.body;
//   const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

//   // ✅ เพิ่ม isDone: false ไปด้วย
//   const newTodo = await dbClient
//     .insert(todoTable)
//     .values({
//       todoText,
//       imageUrl,
//       isDone: false, // 👈 สำคัญ!
//     })
//     .returning();

//   res.status(201).json(newTodo);
// });

// หลัง (เก็บ URL เต็ม)
// app.post("/todo/upload", upload.single("image"), async (req, res) => {
//   const { todoText } = req.body;

//   // ① กำหนด base URL (อ่านจาก env ถ้ามี, ไม่งั้นใช้ host ที่ request เข้ามา)
//   const base =
//     process.env.APP_BASE_URL ||
//     `http://${req.headers.host ?? "localhost:3769"}`;

//   // ② สร้าง imageUrl เต็ม
//   const imageUrl = req.file ? `${base}/uploads/${req.file.filename}` : null;

//   await dbClient
//     .insert(todoTable)
//     .values({ todoText, imageUrl })
//     .returning({ id: todoTable.id }); // ตามที่คุณใช้งาน

//   res.status(201).json({ ok: true });
// });

app.post("/todo/upload", upload.single("image"), async (req, res) => {
  const { todoText } = req.body;
  const base =
    process.env.APP_BASE_URL ||
    `http://${req.headers.host ?? "localhost:3769"}`;
  const imageUrl = req.file
    ? `${base}/uploads/${req.file.filename}` // ✅ URL เต็ม
    : null;

  await dbClient.insert(todoTable).values({ todoText, imageUrl }).returning();

  res.status(201).json({ ok: true });
});

app.get("/ping", (req, res) => {
  res.send("pong");
});

app.get("/owner", async (req, res, next) => {
  console.log("🔥 /owner route hit");
  res.send("✅ /owner works!");
});

// ✅ ใส่ log ตรงนี้ เพื่อยืนยันว่า route ถูกประกาศแล้วตอนเริ่มต้น
console.log("✅ Route /ping is now active");

// Query
app.get("/todo", async (req, res, next) => {
  try {
    const results = await dbClient.query.todoTable.findMany();
    res.json(results);
  } catch (err) {
    next(err);
  }
});
// ✅ ใส่ log ตรงนี้ เพื่อยืนยันว่า route ถูกประกาศแล้วตอนเริ่มต้น
console.log("✅ Route /todo is now active");

//my_owner-----------------------------------------------------
app.get("/todo/owner", async (req, res, next) => {
  try {
    console.log("✅ /todo/owner route hit");
    const results = await dbClient.select().from(ownerTable);
    res.json(results);
  } catch (err) {
    console.error("❌ Error in /todo/owner:", err);
    next(err);
  }
});
// ✅ ใส่ log ตรงนี้ เพื่อยืนยันว่า route ถูกประกาศแล้วตอนเริ่มต้น
console.log("✅ Route /todo/owner is now active");

//my_owner-----------------------------------------------------

// Insert
app.put("/todo", async (req, res, next) => {
  try {
    const todoText = req.body.todoText ?? "";
    if (!todoText) throw new Error("Empty todoText");
    const result = await dbClient
      .insert(todoTable)
      .values({
        todoText,
      })
      .returning({ id: todoTable.id, todoText: todoTable.todoText });
    res.json({ msg: `Insert successfully`, data: result[0] });
  } catch (err) {
    next(err);
  }
});

// Update
app.patch("/todo", async (req, res, next) => {
  try {
    const id = req.body.id ?? "";
    const todoText = req.body.todoText ?? "";
    if (!todoText || !id) throw new Error("Empty todoText or id");

    // Check for existence if data
    const results = await dbClient.query.todoTable.findMany({
      where: eq(todoTable.id, id),
    });
    if (results.length === 0) throw new Error("Invalid id");

    const result = await dbClient
      .update(todoTable)
      .set({ todoText })
      .where(eq(todoTable.id, id))
      .returning({ id: todoTable.id, todoText: todoTable.todoText });
    res.json({ msg: `Update successfully`, data: result });
  } catch (err) {
    next(err);
  }
});

// Delete
app.delete("/todo", async (req, res, next) => {
  try {
    const id = req.body.id ?? "";
    if (!id) throw new Error("Empty id");

    // Check for existence if data
    const results = await dbClient.query.todoTable.findMany({
      where: eq(todoTable.id, id),
    });
    if (results.length === 0) throw new Error("Invalid id");

    await dbClient.delete(todoTable).where(eq(todoTable.id, id));
    res.json({
      msg: `Delete successfully`,
      data: { id },
    });
  } catch (err) {
    next(err);
  }
});

//my_owner-----------------------------------------------------------------
app.put("/todo/owner", async (req, res, next) => {
  try {
    const { id, name, courseId, section } = req.body;

    if (!id || !name || !courseId || !section) {
      throw new Error("Missing required fields");
    }

    const result = await dbClient
      .insert(ownerTable)
      .values({
        id,
        name,
        courseId,
        section,
      })
      .returning();

    res.json({ msg: "Insert owner success", data: result[0] });
  } catch (err) {
    next(err);
  }
});
//my_owner-----------------------------------------------------------------

app.post("/todo/all", async (req, res, next) => {
  try {
    await dbClient.delete(todoTable);
    res.json({
      msg: `Delete all rows successfully`,
      data: {},
    });
  } catch (err) {
    next(err);
  }
});

// JSON Error Middleware
const jsonErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  debug(err.message);
  const errorResponse = {
    message: err.message || "Internal Server Error",
    type: err.name || "Error",
    stack: err.stack,
  };
  res.status(500).send(errorResponse);
};
app.use(jsonErrorHandler);

// Running app
const PORT = process.env.PORT || 3769;
// * Running app
app.listen(PORT, async () => {
  debug(`Listening on port ${PORT}: http://localhost:${PORT}`);
});
