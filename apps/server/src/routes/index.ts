import { Router } from "express";
import roomsRouter from "./rooms.routes.js";
import friendsRouter from "./friends.routes.js"
import guestRouter from "./guest.routes.js"
import profileRouter from "./profile.routes.js"
// Import future routes here...

const router = Router();

// Mount routers
router.use("/rooms", roomsRouter);
router.use("/friends", friendsRouter);
router.use("/guest", guestRouter);
router.use("/profile", profileRouter);

export default router;