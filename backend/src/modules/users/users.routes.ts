import { updateMyProfileController } from "./user.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { validateBody } from "../../middleware/validation.middleware";
import { updateProfileSchema } from "./user.validation";
import { Router } from "express";

const router = Router();
router.patch(
    "/me",
    authMiddleware,
    validateBody(updateProfileSchema),
    updateMyProfileController
);

export default router;


