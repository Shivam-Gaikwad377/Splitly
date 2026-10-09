import { Router } from "express";
import { loginController, logoutController, refreshTokenController, registerController } from "./auth.controller";
import { validateBody, validateRefreshTokenCookie, } from "../../middleware/validation.middleware";
import { authMiddleware } from "../../middleware/auth.middleware";
import { loginSchema, registerSchema } from "./auth.validation";

const router = Router();

router.post("/login", validateBody(loginSchema), loginController);
router.post("/refresh", validateRefreshTokenCookie, refreshTokenController);
router.post("/logout", authMiddleware, logoutController);
router.post("/register", validateBody(registerSchema), registerController);


export default router;