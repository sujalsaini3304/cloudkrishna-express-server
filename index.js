import express from "express";
import router from "./routes/routes.js";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

const app = express();
dotenv.config({
  path: ".env",
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express server status
app.get("/", (req, res) => {
  res.status(200).json({
    "message": "Express server is running."
  })
})

app.use("/api", router);

const startServer = async () => {
  try {
    await connectDB();
    app.listen(process.env.PORT, () => {
      console.log(`Express server is running on port: ${process.env.PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
};

startServer();


