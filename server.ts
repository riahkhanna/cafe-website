import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import admin from "firebase-admin";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

// Load firebase config
const firebaseConfig = JSON.parse(await fs.readFile(path.join(__dirname, "firebase-applet-config.json"), "utf-8"));

admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const db = admin.firestore(firebaseConfig.firestoreDatabaseId);
const JWT_SECRET = process.env.JWT_SECRET || "cafe-chaos-secret-key-123";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Seed initial menu if empty
  const menuSnap = await db.collection("menu").limit(1).get();
  if (menuSnap.empty) {
    const initialMenu = [
      { name: "Chaos Espresso", price: 4.5, category: "Coffee", image: "https://picsum.photos/seed/coffee1/400/300", description: "A dark, intense shot of pure energy." },
      { name: "Midnight Latte", price: 5.5, category: "Coffee", image: "https://picsum.photos/seed/coffee2/400/300", description: "Smooth steamed milk with a hint of mystery." },
      { name: "Anarchy Avocado Toast", price: 12.0, category: "Food", image: "https://picsum.photos/seed/food1/400/300", description: "Smashed avocado on sourdough with chili flakes." },
      { name: "Rebel Croissant", price: 3.5, category: "Pastry", image: "https://picsum.photos/seed/pastry1/400/300", description: "Flaky, buttery, and slightly defiant." }
    ];
    for (const item of initialMenu) {
      await db.collection("menu").add(item);
    }
  }

  // Middleware
  const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ message: "Invalid token" });
    }
  };

  const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== "admin") return res.status(403).json({ message: "Forbidden" });
    next();
  };

  // Auth Routes
  app.post("/api/auth/signup", async (req, res) => {
    const { name, email, password } = req.body;
    try {
      const userSnap = await db.collection("users").where("email", "==", email).get();
      if (!userSnap.empty) {
        return res.status(400).json({ message: "User already exists" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const role = email.includes("admin") ? "admin" : "user";
      const userRef = await db.collection("users").add({
        name,
        email,
        password: hashedPassword,
        role
      });
      const token = jwt.sign({ id: userRef.id, role }, JWT_SECRET);
      res.json({ token, user: { id: userRef.id, name, email, role } });
    } catch (err) {
      res.status(500).json({ message: "Signup failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const userSnap = await db.collection("users").where("email", "==", email).get();
      if (userSnap.empty) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const user = userSnap.docs[0].data();
      const userId = userSnap.docs[0].id;
      if (!(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const token = jwt.sign({ id: userId, role: user.role }, JWT_SECRET);
      res.json({ token, user: { id: userId, name: user.name, email, role: user.role } });
    } catch (err) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Menu Routes
  app.get("/api/menu", async (req, res) => {
    try {
      const snap = await db.collection("menu").get();
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(items);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch menu" });
    }
  });

  app.post("/api/menu", authenticate, isAdmin, async (req, res) => {
    try {
      const docRef = await db.collection("menu").add(req.body);
      res.json({ id: docRef.id, ...req.body });
    } catch (err) {
      res.status(500).json({ message: "Failed to add item" });
    }
  });

  app.put("/api/menu/:id", authenticate, isAdmin, async (req, res) => {
    try {
      await db.collection("menu").doc(req.params.id).update(req.body);
      res.json({ id: req.params.id, ...req.body });
    } catch (err) {
      res.status(500).json({ message: "Failed to update item" });
    }
  });

  app.delete("/api/menu/:id", authenticate, isAdmin, async (req, res) => {
    try {
      await db.collection("menu").doc(req.params.id).delete();
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete item" });
    }
  });

  // Order Routes
  app.post("/api/order", authenticate as any, async (req: AuthRequest, res: Response) => {
    try {
      const order = {
        ...req.body,
        userId: req.user?.id,
        status: "pending",
        createdAt: new Date().toISOString()
      };
      const docRef = await db.collection("orders").add(order);
      res.json({ id: docRef.id, ...order });
    } catch (err) {
      res.status(500).json({ message: "Failed to place order" });
    }
  });

  app.get("/api/orders", authenticate, isAdmin, async (req, res) => {
    try {
      const snap = await db.collection("orders").get();
      const orders = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(orders);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Contact Routes
  app.post("/api/contact", async (req, res) => {
    const contact = { ...req.body, createdAt: new Date().toISOString() };
    await db.collection("contacts").add(contact);
    res.json({ message: "Message sent" });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
