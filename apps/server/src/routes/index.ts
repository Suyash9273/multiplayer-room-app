import { Router } from "express";
import roomsRouter from "./rooms.routes.js";
import friendsRouter from "./friends.routes.js"
// Import future routes here...

const router = Router();

// Mount routers
router.use("/rooms", roomsRouter);
router.use("/friends", friendsRouter);
// router.use("/dms", dmsRouter);

export default router;