import { Router } from "express";
import { prisma } from "@multiplayer/db";
import { requireAuth } from "../middleware/auth.js";

const router = Router()

// POST /api/friends/request
router.post("/request", requireAuth, async (req, res) => {
    try {
        const senderId = req.user!.id
        const { receiverId } = req.body

        if (senderId === receiverId) {
            return res.status(400).json({ error: "Cannot send a friend request to yourself" });
        }

        //1. Validate if receiver exists or not
        const receiver = await prisma.user.findUnique({
            where: { id: receiverId }
        })

        if (!receiver) {
            return res.status(404).json({ error: "User not found" });
        }

        // 2. Check if a friendship/request already exists in either direction
        const existingFriendship = await prisma.friendship.findFirst({
            where: {
                OR: [
                    { senderId, receiverId },
                    { senderId: receiverId, receiverId: senderId }
                ]
            }
        })

        if (existingFriendship) {
            return res.status(400).json({ error: "Friendship or pending request already exists" });
        }

        // 3. Create the database record
        const friendship = await prisma.friendship.create({
            data: {
                senderId,
                receiverId,
                status: "PENDING"
            }
        });

        // 4. THE REALTIME HANDOFF
        // Grab the io instance injected in index.ts file in our express 'app' instance
        const io = req.app.get("io");

        // Emit to the receiver's private room. 
        // We include sender details so the UI can say "John sent you a request"
        io.to(`user:${receiverId}`).emit("friendRequestReceived", {
            friendshipId: friendship.id,
            sender: {
                id: req.user!.id,
                username: req.user!.username,
                name: req.user!.name
            },
            status: "PENDING"
        });

        return res.status(200).json({ success: true, friendship });
    } catch (error) {
        console.error("Friend Request Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
})

// GET /api/friends/pending
router.get("/pending", requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id
        // Fetch all pending requests where the current user is the receiver
        const pendingRequests = await prisma.friendship.findMany({
            where: {
                receiverId: userId,
                status: "PENDING"
            },
            include: {
                // we only need specefic fields from the sender
                sender: {
                    select: {
                        id: true,
                        username: true,
                        name: true
                    }
                }
            }
        })

        // Format the data to match your Zustand PendingRequest type exactly
        const formattedRequests = pendingRequests.map(req => ({
            friendshipId: req.id,
            sender: req.sender,
            status: req.status
        }));

        return res.status(200).json(formattedRequests);

    } catch (error) {
        console.error("Fetch Pending Requests Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
})

// GET /api/friends/list
router.get("/list", requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id

        // 1. Fetch all ACCEPTED friendships where you are involved
        const friendships = await prisma.friendship.findMany({
            where: {
                status: "ACCEPTED",
                OR: [
                    {senderId: userId},
                    {receiverId: userId}
                ]
            },
            include: {
                sender: {select: {id: true, username: true, name: true}},
                receiver: {select: {id: true, username: true, name: true}}
            }
        })

        // 2. Map the data to isolate the *other* person
        // If I am the sender, my friend is the receiver. If I am the receiver, my friend is the sender.
        const friendsList = friendships.map((f) => {
            const isSender = f.senderId === userId;
            const friendData = isSender ? f.receiver : f.sender;

            return {
                friendshipId: f.id,
                user: friendData 
            };
        });

        return res.status(200).json(friendsList);
    } catch (error) {
        console.error("Fetch Friends Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
})

// POST /api/friends/accept
router.post("/accept", requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id
        const { friendshipId } = req.body

        // 1. Verify the request exists and the CURRENT user is the receiver
        const friendship = await prisma.friendship.findUnique({
            where: { id: friendshipId }
        })

        if (!friendship) {
            return res.status(404).json({ error: "Friend request not found" });
        }

        if (friendship.receiverId !== userId) {
            return res.status(403).json({ error: "Unauthorized to accept this request" });
        }

        // 2. Update status to ACCEPTED
        const updatedFriendship = await prisma.friendship.update({
            where: { id: friendshipId },
            data: { status: "ACCEPTED" }
        })

        // 3. (Optional Realtime) Notify the sender that their request was accepted!
        const io = req.app.get("io")
        if (io) {
            io.to(`user:${friendship.senderId}`).emit("friendRequestAccepted", {
                friendshipId: updatedFriendship.id,
                receiverId: userId
            })
        }

        return res.status(200).json({ success: true, friendship: updatedFriendship })
    } catch (error) {
        console.error("Accept Request Error:", error)
        return res.status(500).json({ error: "Internal Server Error" })
    }
})

// POST /api/friends/decline
router.post("/decline", requireAuth, async (req, res) => {
    try {
        const userId = req.user!.id
        const { friendshipId } = req.body

        // 1. Verify the request exists and the CURRENT user is the receiver
        const friendship = await prisma.friendship.findUnique({
            where: { id: friendshipId }
        });

        if (!friendship || friendship.receiverId !== userId) {
            return res.status(403).json({ error: "Unauthorized or not found" });
        }

        // 2. Delete the record entirely (cleaner than keeping a "DECLINED" status forever)
        await prisma.friendship.delete({
            where: { id: friendshipId }
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Decline Request Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
})

export default router;