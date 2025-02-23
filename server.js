require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { pipeline } = require("stream");
const { promisify } = require("util");
const streamPipeline = promisify(pipeline);

const { GoogleGenerativeAI } = require("@google/generative-ai");


// Check if API Key is being read
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY is missing! Please check .env file.");
    process.exit(1); // Stop the server if key is missing
} else {
    console.log("✅ GEMINI_API_KEY is loaded successfully!");

}

// Set up Google AI API - // Load Google Gemini API Key from .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();
app.use(cors());
app.use(express.json());
app.use("/generated", express.static("generated"));

app.use("/uploads", express.static("uploads"));



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

app.post("/api/generate-podcast", upload.single("audio"), async (req, res) => {
    try {
        let transcript = req.body.transcript;

        if (req.file) {
            console.log("Processing uploaded audio file:", req.file.path);
            
            // Simulate audio-to-text processing (replace with actual logic)
            transcript = "This is a test transcription from the audio.";  
        }
        
        if (!transcript && !req.file) {
            return res.status(400).json({ error: "Transcript or audio file is required." });
        }

        console.log("Received transcript:", transcript);
        console.log("Received file:", req.file);

        // If audio file is uploaded, process it
        if (req.file) {
            // TODO: Add logic to process audio file and extract text
            return res.json({ success: true, script: "Extracted text from audio" });
        }

        // If transcript is provided, return it
        return res.json({ success: true, script: transcript });

    } catch (error) {
        console.error("Error processing podcast:", error);
        res.status(500).json({ error: "Failed to generate podcast." });
    }
});

app.post("/api/text-to-speech", async (req, res) => {
    try {
        const { script } = req.body;

        if (!script) {
            return res.status(400).json({ error: "Script text is required." });
        }

        console.log("Received script for TTS:", script);
        console.log("Using ElevenLabs API Key:", process.env.ELEVENLABS_API_KEY ? "✅ Loaded" : "❌ MISSING");
        console.log("Using ElevenLabs Voice ID:", process.env.ELEVENLABS_VOICE_ID ? process.env.ELEVENLABS_VOICE_ID : "❌ MISSING");

        // Call ElevenLabs API for speech synthesis
        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}/stream`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "xi-api-key": process.env.ELEVENLABS_API_KEY,
                },
                body: JSON.stringify({
                    text: script,
                    model_id: "eleven_multilingual_v2",
                    voice_settings: { stability: 0.5, similarity_boost: 0.8 },
                }),
            }
        );

        if (!response.ok) {
            const errorResponse = await response.text();
            console.error("TTS API Error Response:", errorResponse);
            throw new Error(`TTS API Error: ${response.statusText} - ${errorResponse}`);
        }

        // Ensure "generated" directory exists
        const generatedDir = "./generated/";
        if (!fs.existsSync(generatedDir)) {
            fs.mkdirSync(generatedDir);
        }

        // Generate unique filename for the audio file
        const filePath = `./generated/audio_${Date.now()}.mp3`;
        const fileStream = fs.createWriteStream(filePath);

        // Stream the audio response into a file
        await streamPipeline(response.body, fileStream);

        res.json({ success: true, audioUrl: `/generated/${path.basename(filePath)}` });

        // res.json({ success: true, audioUrl: filePath });

    } catch (error) {
        console.error("Error generating speech:", error);
        res.status(500).json({ error: "Failed to generate speech from text." });
    }
});

//// Start the server
const PORT = process.env.PORT || 9000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
