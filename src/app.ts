import express from "express";
import {
  errorMiddleware,
  notFoundMiddleware,
} from "./middleware/error.middleware";
import routes from "./routes";
import cookieParser from "cookie-parser";
const app = express();
app.set("trust proxy", false);
app.use(express.json());
app.use(cookieParser());
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Splitly backend is running",
  });
});




app.use("/api/v1", routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;