// backend/routes/user.js
const express = require('express');

const router = express.Router();
const zod = require("zod");
const { User, Account } = require("../db");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");
const  { authMiddleware } = require("../middleware");
const bcrypt = require('bcrypt');

const signupBody = zod.object({
    username: zod.string().email(),
	firstName: zod.string(),
	lastName: zod.string(),
	password: zod.string()
})

// This is signup route
router.post("/signup", async (req, res) => {
    const { success } = signupBody.safeParse(req.body)
    if (!success) {
        return res.status(411).json({
            message: "Email already taken / Incorrect inputs"
        })
    }

    // Check if username already exists
    const existingUser = await User.findOne({
        username: req.body.username
    })

    if (existingUser) {
        return res.status(411).json({
            message: "Email already taken/Incorrect inputs"
        })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // Create new user
    const user = await User.create({
        username: req.body.username,
        password: hashedPassword,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
    })
    const userId = user._id;

    // Create account with random balance
    await Account.create({
        userId,
        balance: 1 + Math.random() * 10000
    })

    // Generate JWT token
    const token = jwt.sign({
        userId
    }, JWT_SECRET);

    res.json({
        message: "User created successfully",
        token: token
    })
})


const signinBody = zod.object({
    username: zod.string().email(),
	password: zod.string()
})

// This is signin route
router.post("/signin", async (req, res) => {
    const { success } = signinBody.safeParse(req.body)
    if (!success) {
        return res.status(411).json({
            message: "Email already taken / Incorrect inputs"
        })
    }

    const user = await User.findOne({
        username: req.body.username
    });

    const userId = user._id;

    if(user == null) {
        return res.status(400).json({
            message: "User not found.",
        });
    } else {
        const token = jwt.sign({
            userId
        }, JWT_SECRET);
        
        // Validating hashed password
        if(await user.validatePassword(req.body.password)) {
            return res.status(200).json({
                message: "Successfully signed in",
                token: token
            });
        } else {
            return res.status(411).json({
                message: "Error while logging"
            });
        }  
    }
})

const updateBody = zod.object({
	password: zod.string().optional(),
    firstName: zod.string().optional(),
    lastName: zod.string().optional(),
})

// For updating firstName lastName and password
router.put('/', authMiddleware, async (req, res) => {
    try {
        const body = req.body;
        const { success, error } = updateBody.safeParse(body);

        if (!success) {
            return res.status(400).json({
                message: "Validation error",
                details: error.errors,
            });
        }

        if (body.password) {
            const hashedPassword = await bcrypt.hash(body.password, 10);
            body.password = hashedPassword;
        }

        if (!req.userId) {
            return res.status(400).json({
                message: "User ID not provided",
            });
        }

        const result = await User.updateOne({ id: req.userId }, body);

        res.json({
            message: "Updated Successfully",
            result,
        });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({
            message: "Internal Server Error",
        });
    }
});

// for filtering or searching user in database like someone searched "som" 
// then all the users whose firstName lastName and username starts with "som" gets filtered
router.get("/bulk", async (req, res) => {
    const filter = req.query.filter || "";

    const users = await User.find({
        $or: [{
            firstName: {
                "$regex": filter
            }
        }, {
            lastName: {
                "$regex": filter
            }
        }]
    })

    res.json({
        user: users.map(user => ({
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            _id: user._id
        }))
    })
})

module.exports = router;