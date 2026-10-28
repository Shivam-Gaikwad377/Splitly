import { updateMyProfileController } from "./users.controller";
import { authMiddleware } from "../../middleware/auth.middleware";
import { validateBody } from "../../middleware/validation.middleware";
import { updateProfileSchema } from "./users.validation";
import { Router } from "express";

const router = Router();
router.patch(
    "/me",
    authMiddleware,
    validateBody(updateProfileSchema),
    updateMyProfileController
);

export default router;


