const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("AI Podcast Generator Backend is running!");
});

app.get("/test", (req, res) => {
    res.json({ message: "Backend is connected to frontend!" });
});

app.post("/api/generate-from-transcript", async (req, res) => {
    try {
        const { transcript } = req.body;
        if (!transcript) {
            return res.status(400).json({ error: "Transcript is required" });
        }

        // Mock AI-generated script response
        const generatedScript = `
            Speaker 1: Welcome to our AI-powered podcast!
            Speaker 2: Yes! Today we’re exploring how AI can generate podcasts.
        `;

        res.json({
            success: true,
            script: generatedScript,
            segments: [
                { speaker: "Speaker 1", text: "Welcome to our AI-powered podcast!" },
                { speaker: "Speaker 2", text: "Yes! Today we’re exploring how AI can generate podcasts." }
            ]
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to generate podcast script" });
    }
});


const PORT = process.env.PORT || 9000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
