import { Router } from "express";
import { loginController, logoutController, refreshTokenController, registerController, requestEmailVerificationController, verifyEmailController, forgotPasswordController, resetPasswordController } from "./auth.controller";
import { validateBody, validateRefreshTokenCookie, } from "../../middleware/validation.middleware";
import { authMiddleware } from "../../middleware/auth.middleware";
import { forgotPasswordSchema, loginSchema, registerSchema, requestEmailVerificationSchema, resetPasswordSchema, verifyEmailSchema } from "./auth.validation";

const router = Router();

router.post("/login", validateBody(loginSchema), loginController);
router.post("/refresh", validateRefreshTokenCookie, refreshTokenController);
router.post("/logout", authMiddleware, logoutController);
router.post("/register", validateBody(registerSchema), registerController);
router.post("/verify-email/request", validateBody(requestEmailVerificationSchema), requestEmailVerificationController);
router.post("/verify-email", validateBody(verifyEmailSchema), verifyEmailController);
router.post("/forgot-password", validateBody(forgotPasswordSchema), forgotPasswordController);
router.post("/reset-password", validateBody(resetPasswordSchema), resetPasswordController);


export default router;