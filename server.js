require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Set up Google AI API - // Load Google Gemini API Key from .env

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Set up Multer for file uploads
const storage = multer.diskStorage({
    destination: "./uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Rename file
    },
});

const upload = multer({ storage });

// Ensure the uploads directory exists
if (!fs.existsSync("./uploads/")) {
    fs.mkdirSync("./uploads/");
}

app.get("/", (req, res) => {
    res.send("AI Podcast Generator Backend is running!");
});

app.get("/test", (req, res) => {
    res.json({ message: "Backend is connected to frontend!" });
});

//// API: Upload Audio and Generate Podcast
// app.post("/api/generate-from-transcript", async (req, res) => {
//     try {
//         const { transcript } = req.body;
//         if (!transcript) {
//             return res.status(400).json({ error: "Transcript is required" });
//         }

//         // Mock AI-generated script response
//         const generatedScript = `
//             Speaker 1: Welcome to our AI-powered podcast!
//             Speaker 2: Yes! Today we’re exploring how AI can generate podcasts.
//         `;

//         res.json({
//             success: true,
//             script: generatedScript,
//             segments: [
//                 { speaker: "Speaker 1", text: "Welcome to our AI-powered podcast!" },
//                 { speaker: "Speaker 2", text: "Yes! Today we’re exploring how AI can generate podcasts." }
//             ]
//         });
//     } catch (error) {
//         res.status(500).json({ error: "Failed to generate podcast script" });
//     }
// });



app.post("/api/generate-podcast", upload.single("audio"), async (req, res) => {
    try {
        const transcript = req.body.transcript; // Get transcript from request body

        if (!transcript) {
            return res.status(400).json({ error: "Transcript is required." });
        }

        console.log("Received transcript:", transcript);

        // Generate AI-enhanced podcast script using Gemini API
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                temperature: 0.5,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 5500,
            }
        });

        const prompt = `
        Act as a podcast scriptwriter. Given the transcript:
        "${transcript}"
        Format the output as a structured podcast script, ensuring clear speaker labels and a conversational flow.
        `;

        const response = await model.generateContent(prompt);
        const aiGeneratedScript = response.candidates[0].content.parts[0].text;

        console.log("Generated Script:", aiGeneratedScript);

        // Format script into structured segments
        const segments = aiGeneratedScript.split("\n").map(line => {
            const match = line.match(/^(Speaker \d+): (.*)$/);
            return match ? { speaker: match[1], text: match[2] } : null;
        }).filter(segment => segment !== null);

        res.json({
            success: true,
            script: aiGeneratedScript,
            segments: segments
        });

    } catch (error) {
        console.error("Error generating podcast script:", error);
        res.status(500).json({ error: "Failed to generate podcast script" });
    }
});





//// Start the server
const PORT = process.env.PORT || 9000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
