import { Router } from "express";
import { loginController, logoutController, refreshTokenController } from "./auth.controller";
import { validateBody, validateRefreshTokenCookie, } from "../../middleware/validation.middleware";
import { authMiddleware } from "../../middleware/auth.middleware";
import { loginSchema } from "./auth.validation";
const router = Router();

router.post("/login", validateBody(loginSchema), loginController);
router.post("/refresh", validateRefreshTokenCookie, refreshTokenController);
router.post("/logout", authMiddleware, logoutController);
export default router;