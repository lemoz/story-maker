import { NextRequest } from "next/server";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "redis";
import { z } from "zod";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { Character } from "@/components/story-form/Story-characters/characters-section";

// Add at the top of the file, after imports
const MAX_RETRIES = 3;
const TIMEOUT_MS = 30000; // 30 seconds timeout

// Character schema
const characterSchema = z.object({
  id: z.string(),
  name: z.string(),
  isMain: z.boolean(),
  gender: z.enum(["female", "male", "unspecified"]).default("unspecified"),
  uploadedPhotoUrl: z.string().url().optional().nullable(),
});

// Type for characters stored in Redis
type RedisCharacter = z.infer<typeof characterSchema>;

// Input validation schema
const storyInputSchema = z.object({
  characters: z
    .array(characterSchema)
    .min(1, "At least one character is required"),
  ageRange: z.string({ required_error: "Age range is required" }),
  storyPlotOption: z.enum(["photos", "describe", "starter"]),
  storyDescription: z
    .string()
    .min(1, "Story description is required when using describe mode")
    .optional(),
  storyStyle: z.string().optional().nullable(),
  storyLengthTargetPages: z.number().int().min(3).max(10).optional().default(6),
  email: z.string().email().optional().nullable(),
  uploadedStoryPhotoUrls: z.array(z.string().url()).optional(), // URLs of uploaded story photos
});

type StoryInput = z.infer<typeof storyInputSchema>;

// Story page structure
interface StoryPage {
  text: string;
  imageUrl: string | null;
}

interface StoryData {
  id: string;
  title: string;
  subtitle: string;
  createdAt: string;
  pages: StoryPage[];
  characters: RedisCharacter[]; // Use RedisCharacter type
}

// Helper function to safely close the controller
function safeCloseController(controller: ReadableStreamDefaultController) {
  try {
    if (controller) {
      controller.close();
    }
  } catch (error) {
    console.error("Error closing controller:", error);
  }
}

// Helper function to safely send SSE events
function safeSendEvent(
  controller: ReadableStreamDefaultController,
  eventType: string,
  data: any
) {
  try {
    const event = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    controller.enqueue(new TextEncoder().encode(event));
  } catch (error) {
    console.error("Error sending event:", error);
  }
}

// Helper function to upload Base64 image to Vercel Blob
async function uploadImageToBlobStorage(
  base64Data: string,
  storyId: string,
  pageIndex: number
): Promise<string | null> {
  try {
    console.log(`BEGIN uploadImageToBlobStorage for Page ${pageIndex + 1}`);

    // Check if BLOB_READ_WRITE_TOKEN is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error(
        `Page ${
          pageIndex + 1
        }: Missing BLOB_READ_WRITE_TOKEN environment variable.`
      );
      return null;
    }

    // Extract the actual base64 content (remove the data:image/...;base64, part)
    console.log(
      `Page ${pageIndex + 1}: Extracting base64 content from data URL...`
    );
    const base64String = base64Data.split(",")[1];
    if (!base64String) {
      console.error(
        `Page ${pageIndex + 1}: Invalid base64 data string received.`
      );
      return null;
    }

    // Convert base64 to Buffer
    console.log(`Page ${pageIndex + 1}: Converting base64 to buffer...`);
    const buffer = Buffer.from(base64String, "base64");
    console.log(`Page ${pageIndex + 1}: Buffer size: ${buffer.length} bytes`);

    // Generate a unique filename
    const filename = `stories/${storyId}/page-${
      pageIndex + 1
    }-${randomUUID()}.png`;
    console.log(`Page ${pageIndex + 1}: Generated filename: ${filename}`);

    console.log(`Page ${pageIndex + 1}: Starting Vercel Blob PUT operation...`);
    console.log(
      `Page ${
        pageIndex + 1
      }: PUT parameters - filename: ${filename}, contentType: image/png, access: public`
    );

    // Upload to Vercel Blob
    const blob = await put(filename, buffer, {
      access: "public", // Make the image publicly accessible
      contentType: "image/png", // Explicitly set content type
    });

    console.log(
      `Page ${pageIndex + 1}: Image uploaded successfully. URL: ${blob.url}`
    );
    return blob.url; // Return the public URL
  } catch (error) {
    console.error(
      `ERROR during image upload for Page ${pageIndex + 1}:`,
      error
    );
    console.error(
      `Page ${pageIndex + 1}: Stack trace:`,
      error instanceof Error ? error.stack : "No stack trace available"
    );
    return null;
  }
}

// Helper function to handle timeouts
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Operation timed out")), timeoutMs);
  });
  return Promise.race([promise, timeout]);
}

export async function POST(request: NextRequest) {
  // Create a unique ID early for this story
  const storyId = randomUUID();
  let redisClient: any = undefined;

  // Create a stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial connection established event
        safeSendEvent(controller, "connection", { status: "established" });

        // Parse and validate request body
        const body = await request.json();

        // Validation stage
        safeSendEvent(controller, "progress", {
          step: "validating",
          status: "in_progress",
          message: "Validating input data...",
        });

        console.log("Request body:", JSON.stringify(body));
        const validationResult = storyInputSchema.safeParse(body);

        if (!validationResult.success) {
          console.error(
            "Validation error:",
            JSON.stringify(validationResult.error.format())
          );
          safeSendEvent(controller, "error", {
            message: "Invalid input",
            details: validationResult.error.format(),
          });
          return;
        }

        const storyInput = validationResult.data;

        // Additional validation for story photos when using "photos" option
        if (
          storyInput.storyPlotOption === "photos" &&
          (!storyInput.uploadedStoryPhotoUrls ||
            storyInput.uploadedStoryPhotoUrls.length === 0)
        ) {
          console.error(
            "Validation error: No story photos provided for photos mode"
          );
          safeSendEvent(controller, "error", {
            message: "No story photos provided",
            details:
              "Please upload at least one photo for photo-based story generation",
          });
          return;
        }

        // For describe mode, ensure story description is provided
        if (
          storyInput.storyPlotOption === "describe" &&
          (!storyInput.storyDescription ||
            storyInput.storyDescription.trim() === "")
        ) {
          console.error(
            "Validation error: No story description provided for describe mode"
          );
          safeSendEvent(controller, "error", {
            message: "No story description provided",
            details:
              "Please provide a story description for text-based story generation",
          });
          return;
        }

        safeSendEvent(controller, "progress", {
          step: "validating",
          status: "complete",
          message: "Input validation successful",
        });

        // Initialize OpenAI client
        if (!process.env.OPENAI_API_KEY) {
          safeSendEvent(controller, "error", {
            message: "OpenAI API key is not configured",
          });
          return;
        }

        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        // Initialize Google Generative AI client
        if (!process.env.GOOGLE_API_KEY) {
          safeSendEvent(controller, "error", {
            message: "Google AI configuration failed: Missing API Key.",
          });
          return;
        }

        try {
          // Initialize the Google AI client with the API key
          const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

          // Get the specific Gemini model for image generation
          const generativeModel = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp-image-generation",
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_NONE",
              } as any,
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_NONE",
              } as any,
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_NONE",
              } as any,
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_NONE",
              } as any,
            ],
          });

          // Create Redis client using REDIS_URL
          if (!process.env.REDIS_URL) {
            safeSendEvent(controller, "error", {
              message: "Redis connection failed: Missing configuration.",
            });
            return;
          }

          try {
            safeSendEvent(controller, "progress", {
              step: "setup",
              status: "in_progress",
              message: "Connecting to database...",
            });

            console.log("--- Attempting node-redis Connection ---");
            console.log("Using REDIS_URL:", process.env.REDIS_URL);
            redisClient = createClient({ url: process.env.REDIS_URL });
            redisClient.on("error", (err: Error) =>
              console.error("Redis Client Error", err)
            );
            await redisClient.connect();
            console.log("node-redis client connected.");

            safeSendEvent(controller, "progress", {
              step: "setup",
              status: "complete",
              message: "Database connection established",
            });
          } catch (connectError) {
            console.error("Failed to connect redis client:", connectError);
            safeSendEvent(controller, "error", {
              message: "Redis connection failed.",
            });
            return;
          }

          // --- Begin Story Generation Process ---
          try {
            // 1. Generate story text
            safeSendEvent(controller, "progress", {
              step: "writing",
              status: "in_progress",
              message: "Creating your unique story...",
            });

            let storyPagesText: string[];

            // Choose the appropriate story generation method based on storyPlotOption
            if (
              storyInput.storyPlotOption === "photos" &&
              storyInput.uploadedStoryPhotoUrls
            ) {
              // Generate story from photos using Gemini
              safeSendEvent(controller, "progress", {
                step: "writing",
                status: "in_progress",
                message: "Analyzing photos and crafting your story...",
              });

              storyPagesText = await generateStoryTextFromPhotos(
                generativeModel,
                storyInput
              );
            } else {
              // Generate story from text description using OpenAI
              safeSendEvent(controller, "progress", {
                step: "writing",
                status: "in_progress",
                message: "Creating your story from description...",
              });

              storyPagesText = await generateStoryText(openai, storyInput);
            }

            safeSendEvent(controller, "progress", {
              step: "writing",
              status: "complete",
              message: "Story text generated successfully!",
            });

            // 2. Generate illustrations (passing storyId)
            safeSendEvent(controller, "progress", {
              step: "illustrating",
              status: "in_progress",
              message: "Starting illustration process...",
              illustrationProgress: {
                current: 0,
                total: storyPagesText.length,
              },
            });

            // Generate each illustration and send events for progress
            const imageUrls = await generateIllustrations(
              controller,
              openai,
              storyPagesText,
              storyInput,
              storyId
            );

            // 3. Combine text and image URLs
            safeSendEvent(controller, "progress", {
              step: "saving",
              status: "in_progress",
              message: "Assembling your storybook...",
            });

            const pagesData: StoryPage[] = storyPagesText.map(
              (text, index) => ({
                text,
                imageUrl: imageUrls[index], // This is now a URL or null
              })
            );

            // 4. Assemble story data
            safeSendEvent(controller, "progress", {
              step: "saving",
              status: "in_progress",
              message: "Creating the perfect title for your story...",
            });

            // Get the main character's name
            const mainCharacter =
              storyInput.characters.find((char) => char.isMain) ||
              storyInput.characters[0];
            const mainCharacterName = mainCharacter.name || "the Hero";

            // Generate an AI-powered title based on the story content
            let title;
            try {
              title = await generateTitleFromStory(
                openai,
                storyPagesText,
                storyInput.ageRange,
                mainCharacterName
              );
            } catch (titleError) {
              console.error(
                "Failed to generate AI title, using fallback:",
                titleError
              );
              title = fallbackGenerateStoryTitle(mainCharacterName);
            }

            const subtitle = `A story for ${storyInput.ageRange} year olds`;
            const storyData: StoryData = {
              id: storyId,
              title,
              subtitle,
              createdAt: new Date().toISOString(),
              pages: pagesData,
              characters: storyInput.characters.map((char) => ({
                id: char.id,
                name: char.name,
                isMain: char.isMain,
                gender: char.gender,
                uploadedPhotoUrl: char.uploadedPhotoUrl,
              })), // Map to RedisCharacter type
            };

            // 5. Convert to JSON and store in Redis
            const storyDataJSON = JSON.stringify(storyData);
            const dataSizeInKB = Math.round(storyDataJSON.length / 1024);
            console.log(
              `Story data size (excluding images): ${dataSizeInKB} KB`
            );

            console.log(
              "Illustration loop completed. Attempting to save final data to Redis..."
            );
            console.log(
              `Redis key: story:${storyId}, Data size: ${dataSizeInKB} KB, Expiration: 86400 seconds (24 hours)`
            );

            try {
              await redisClient.set(`story:${storyId}`, storyDataJSON, {
                EX: 86400,
              });
              console.log("Story saved to Redis successfully.");
            } catch (redisError) {
              console.error("ERROR during Redis save operation:", redisError);
              console.error(
                "Redis error stack:",
                redisError instanceof Error
                  ? redisError.stack
                  : "No stack trace available"
              );
              throw redisError; // Rethrow to be caught by the outer try/catch
            }

            // Handle email subscription if provided
            if (storyInput.email) {
              // In a real implementation, you'd save this email for notifications
              console.log(
                `Story completion will be emailed to: ${storyInput.email}`
              );
              // You could add a database entry or call another service here
            }

            // 6. Send success event and close the stream
            safeSendEvent(controller, "progress", {
              step: "saving",
              status: "complete",
              message: "Story saved successfully!",
            });

            safeSendEvent(controller, "complete", {
              storyId,
              title,
              message: "Your story has been created successfully!",
            });
          } catch (error: any) {
            console.error("ERROR during story generation process:", error);
            console.error(
              "Story generation error stack:",
              error instanceof Error ? error.stack : "No stack trace available"
            );

            let errorMessage =
              "An unexpected error occurred during story generation";

            if (error.message?.includes("OOM command not allowed")) {
              console.error("ERROR: Redis OOM (Out of Memory) detected");
              errorMessage =
                "Memory limit exceeded when storing the story. This might be due to large image sizes.";
            } else if (
              error.message?.includes("Failed to generate story text")
            ) {
              console.error("ERROR: Story text generation failure detected");
              errorMessage =
                "Failed to generate the story text. Please try again or modify your description.";
            } else if (error.message?.includes("Redis connection failed")) {
              console.error("ERROR: Redis connection issue detected");
              errorMessage =
                "Database connection error. Please try again later.";
            } else if (error.message?.includes("Failed to upload image")) {
              console.error("ERROR: Image upload failure detected");
              errorMessage =
                "Part of the story generation failed (image upload). The story might be incomplete.";
            }

            console.log("Sending error event to client:", errorMessage);
            safeSendEvent(controller, "error", { message: errorMessage });
          }
        } catch (error) {
          console.error("Error initializing Google Generative AI:", error);
          safeSendEvent(controller, "error", {
            message: "Failed to initialize Google Generative AI services",
          });
        } finally {
          // Close Redis connection if it's open
          try {
            if (redisClient && redisClient.isOpen) {
              await redisClient.disconnect();
              console.log("node-redis client disconnected.");
            }
          } catch (err) {
            console.error("Error disconnecting from Redis:", err);
          }

          // Close the stream only once, at the end
          safeCloseController(controller);
        }
      } catch (error) {
        console.error("Error processing request:", error);
        safeSendEvent(controller, "error", {
          message: "An unexpected error occurred",
        });
      }
    },
  });

  // Return the stream with appropriate headers for SSE
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// Function to generate story text from text description using OpenAI
async function generateStoryText(
  openai: OpenAI,
  storyInput: StoryInput
): Promise<string[]> {
  try {
    console.log("Starting generateStoryText with OpenAI...");

    const {
      characters,
      ageRange,
      storyDescription,
      storyStyle,
      storyLengthTargetPages = 6,
    } = storyInput;

    // Find the main character, or use the first character if none is marked as main
    const mainCharacter =
      characters.find((char) => char.isMain) || characters[0];

    // Get all character names for the story
    const characterNames = characters
      .map((c) => c.name)
      .filter((name) => name.trim() !== "");
    const mainCharacterName = mainCharacter.name || "the main character";

    // Create character details with gender information
    const mainCharacterGender = mainCharacter.gender || "unspecified";
    const mainCharacterGenderText =
      mainCharacterGender !== "unspecified"
        ? `The main character ${mainCharacterName} is ${mainCharacterGender}.`
        : "";

    // Build other characters details
    const otherCharactersDetails = characters
      .filter((c) => !c.isMain && c.name.trim() !== "")
      .map((c) => {
        const genderText = c.gender !== "unspecified" ? ` (${c.gender})` : "";
        return `${c.name}${genderText}`;
      });

    // Create length guidance based on requested page count
    let lengthGuidance = `a story of about ${storyLengthTargetPages} paragraphs`;
    if (storyLengthTargetPages <= 4) {
      lengthGuidance += " (a short story)";
    } else if (storyLengthTargetPages >= 8) {
      lengthGuidance += " (a longer story)";
    } else {
      lengthGuidance += " (a medium-length story)";
    }

    const characterPrompt =
      characterNames.length > 1
        ? `The main character is named ${mainCharacterName}. ${mainCharacterGenderText} Other characters in the story are: ${otherCharactersDetails.join(
            ", "
          )}.`
        : `The story should be about a character named ${mainCharacterName}. ${mainCharacterGenderText}`;

    const systemPrompt = `You are a creative children's story writer. Create ${lengthGuidance} for a ${ageRange} year old child. 
${characterPrompt}
${storyStyle ? `The story should have a ${storyStyle} style and tone.` : ""}
The story should be engaging, age-appropriate, and have a clear beginning, middle, and end. Ensure the story has a clear beginning, middle, and end, prioritizing a complete narrative over hitting an exact paragraph count.
Return ONLY a JSON object with a "storyPages" array containing exactly ${storyLengthTargetPages} strings, each representing one paragraph of the story.
Do not include any explanations, notes, or other text outside the JSON structure.`;

    const userPrompt = `Write a children's story based on this idea: ${storyDescription}`;

    console.log("Making OpenAI API call for story generation...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content returned from OpenAI");
    }

    console.log("Parsing OpenAI response");
    const parsedResponse = JSON.parse(content);

    if (
      !parsedResponse.storyPages ||
      !Array.isArray(parsedResponse.storyPages) ||
      parsedResponse.storyPages.length !== storyInput.storyLengthTargetPages
    ) {
      console.error(
        `Expected ${
          storyInput.storyLengthTargetPages
        } paragraphs but received ${parsedResponse.storyPages?.length || 0}`
      );
      throw new Error("Invalid response format from OpenAI");
    }

    console.log("Successfully generated story text with OpenAI");
    return parsedResponse.storyPages;
  } catch (error) {
    console.error("Error generating story text with OpenAI:", error);
    throw new Error("Failed to generate story text with OpenAI");
  }
}

// Function to generate story text from photos using Gemini
async function generateStoryTextFromPhotos(
  generativeModel: any,
  storyInput: StoryInput
): Promise<string[]> {
  try {
    console.log("Starting generateStoryTextFromPhotos with Gemini...");

    if (
      !storyInput.uploadedStoryPhotoUrls ||
      storyInput.uploadedStoryPhotoUrls.length === 0
    ) {
      throw new Error("No photo URLs provided for story generation");
    }

    const {
      characters,
      ageRange,
      storyStyle,
      uploadedStoryPhotoUrls,
      storyLengthTargetPages = 6,
    } = storyInput;

    // Find the main character, or use the first character if none is marked as main
    const mainCharacter =
      characters.find((char) => char.isMain) || characters[0];

    // Get all character names for the story
    const characterNames = characters
      .map((c) => c.name)
      .filter((name) => name.trim() !== "");
    const mainCharacterName = mainCharacter.name || "the main character";

    // Create character details with gender information
    const mainCharacterGender = mainCharacter.gender || "unspecified";
    const mainCharacterGenderText =
      mainCharacterGender !== "unspecified"
        ? `The main character ${mainCharacterName} is ${mainCharacterGender}.`
        : "";

    // Build other characters details
    const otherCharactersDetails = characters
      .filter((c) => !c.isMain && c.name.trim() !== "")
      .map((c) => {
        const genderText = c.gender !== "unspecified" ? ` (${c.gender})` : "";
        return `${c.name}${genderText}`;
      });

    // Create length guidance based on requested page count
    let lengthGuidance = `a story of about ${storyLengthTargetPages} paragraphs`;
    if (storyLengthTargetPages <= 4) {
      lengthGuidance += " (a short story)";
    } else if (storyLengthTargetPages >= 8) {
      lengthGuidance += " (a longer story)";
    } else {
      lengthGuidance += " (a medium-length story)";
    }

    const characterPrompt =
      characterNames.length > 1
        ? `The main character is named ${mainCharacterName}. ${mainCharacterGenderText} Other characters in the story are: ${otherCharactersDetails.join(
            ", "
          )}.`
        : `The story should be about a character named ${mainCharacterName}. ${mainCharacterGenderText}`;

    console.log(
      `Processing ${uploadedStoryPhotoUrls.length} photos for story generation...`
    );

    // Fetch and process each photo
    const imagePartsPromises = uploadedStoryPhotoUrls.map(
      async (photoUrl, index) => {
        try {
          console.log(`Fetching story photo ${index + 1} from: ${photoUrl}`);

          // Fetch the image
          const response = await fetch(photoUrl);

          if (!response.ok) {
            throw new Error(
              `Failed to fetch image: ${response.status} ${response.statusText}`
            );
          }

          // Get image data as ArrayBuffer
          const arrayBuffer = await response.arrayBuffer();

          // Convert to base64
          const base64String = Buffer.from(arrayBuffer).toString("base64");

          // Determine MIME type from Content-Type header or extension
          let mimeType = response.headers.get("Content-Type");

          // If we couldn't get MIME type from headers, try to infer from URL
          if (!mimeType || mimeType === "application/octet-stream") {
            // Extract extension from URL, if any
            const extension = photoUrl.split(".").pop()?.toLowerCase();
            if (extension) {
              switch (extension) {
                case "jpg":
                case "jpeg":
                  mimeType = "image/jpeg";
                  break;
                case "png":
                  mimeType = "image/png";
                  break;
                case "gif":
                  mimeType = "image/gif";
                  break;
                case "webp":
                  mimeType = "image/webp";
                  break;
                case "svg":
                  mimeType = "image/svg+xml";
                  break;
                default:
                  // Default fallback
                  mimeType = "image/jpeg";
              }
            } else {
              // Default fallback if no extension found
              mimeType = "image/jpeg";
            }
          }

          console.log(
            `Successfully processed story photo ${
              index + 1
            }, MIME type: ${mimeType}, Size: ${arrayBuffer.byteLength} bytes`
          );

          // Return in the format expected by the Gemini API
          return {
            inlineData: {
              data: base64String,
              mimeType: mimeType,
            },
          };
        } catch (error) {
          console.error(`Error processing story photo ${index + 1}:`, error);
          throw error; // Re-throw to be caught by the outer try/catch
        }
      }
    );

    // Wait for all photos to be processed
    const imageParts = await Promise.all(imagePartsPromises);

    console.log(
      `Successfully processed ${imageParts.length} photos for story generation`
    );

    // Create the text prompt for Gemini
    const textPrompt = `You are a creative children's story writer. Create ${lengthGuidance} for a ${ageRange} year old child.
${characterPrompt}
${storyStyle ? `The story should have a ${storyStyle} style and tone.` : ""}

I've provided a sequence of photos. Create a story that incorporates these images in order, as if they represent scenes or moments in the story's progression.

The story should be engaging, age-appropriate, and have a clear beginning, middle, and end. Ensure the story has a clear beginning, middle, and end, prioritizing a complete narrative over hitting an exact paragraph count.

IMPORTANT: You MUST return ONLY a valid JSON object with this exact structure:
{
  "storyPages": [
    "paragraph 1",
    "paragraph 2",
    ... (exactly ${storyLengthTargetPages} paragraphs total)
  ]
}

Each paragraph should be a string with approximately 3-4 sentences.
Do not include any explanations, notes, or other text outside the JSON structure.`;

    // Construct the complete parts array for the API call
    const promptParts = [{ text: textPrompt }, ...imageParts];

    console.log(
      "Creating Gemini model instance for photo-based story generation..."
    );

    // Use Gemini 1.5 Flash for multimodal generation with fast response
    const model = generativeModel.getGenerativeModel({
      model: "gemini-1.5-flash",
      // Configure safety settings to avoid content filtering issues
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE",
        } as any,
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE",
        } as any,
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE",
        } as any,
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
        } as any,
      ],
    });

    console.log("Making Gemini API call for photo-based story generation...");

    // Make the API call to Gemini with our prompt parts
    const result = await model.generateContent({
      contents: [{ role: "user", parts: promptParts }],
      generationConfig: {
        responseMimeType: "application/json", // Request JSON response
        temperature: 0.7, // Add some creativity
        maxOutputTokens: 2048, // Enough for 5 paragraphs
      },
    });

    const response = await result.response;
    const content = response.text();

    console.log("Received response from Gemini API for photo-based story");

    if (!content) {
      throw new Error("No content returned from Gemini API");
    }

    console.log("Parsing JSON response from Gemini");

    try {
      // Parse JSON response
      const parsedResponse = JSON.parse(content);

      // Validate response structure
      if (
        !parsedResponse.storyPages ||
        !Array.isArray(parsedResponse.storyPages) ||
        parsedResponse.storyPages.length !== storyLengthTargetPages
      ) {
        console.error(
          `Invalid response format from Gemini: Expected ${storyLengthTargetPages} paragraphs but received ${
            parsedResponse.storyPages?.length || 0
          }`,
          content
        );
        throw new Error(
          "Invalid response format from Gemini (missing storyPages array or wrong length)"
        );
      }

      console.log("Successfully parsed Gemini response into story pages");
      return parsedResponse.storyPages;
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      console.error("Raw response:", content);
      throw new Error("Failed to parse Gemini response as JSON");
    }
  } catch (error: any) {
    console.error("Error generating story text from photos:", error);
    throw new Error(`Failed to generate story from photos: ${error.message}`);
  }
}

// Helper function to fetch a character photo and convert to base64
async function fetchCharacterPhoto(
  photoUrl: string
): Promise<{ data: string; mimeType: string } | null> {
  try {
    console.log(`Fetching character photo from: ${photoUrl}`);

    // Fetch the image
    const response = await fetch(photoUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch image: ${response.status} ${response.statusText}`
      );
    }

    // Get image data as ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();

    // Convert to base64
    const base64String = Buffer.from(arrayBuffer).toString("base64");

    // Determine MIME type from Content-Type header or extension
    let mimeType = response.headers.get("Content-Type");

    // If we couldn't get MIME type from headers, try to infer from URL
    if (!mimeType || mimeType === "application/octet-stream") {
      // Extract extension from URL, if any
      const extension = photoUrl.split(".").pop()?.toLowerCase();
      if (extension) {
        switch (extension) {
          case "jpg":
          case "jpeg":
            mimeType = "image/jpeg";
            break;
          case "png":
            mimeType = "image/png";
            break;
          case "gif":
            mimeType = "image/gif";
            break;
          case "webp":
            mimeType = "image/webp";
            break;
          case "svg":
            mimeType = "image/svg+xml";
            break;
          default:
            // Default fallback
            mimeType = "image/jpeg";
        }
      } else {
        // Default fallback if no extension found
        mimeType = "image/jpeg";
      }
    }

    console.log(
      `Successfully fetched and processed character photo, MIME type: ${mimeType}, Size: ${arrayBuffer.byteLength} bytes`
    );

    return {
      data: base64String, // Return just the base64 string without data URL prefix, required for Gemini API
      mimeType: mimeType,
    };
  } catch (error) {
    console.error("Error fetching character photo:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace available"
    );
    return null;
  }
}

// Modified generateIllustrations function
async function generateIllustrations(
  controller: ReadableStreamDefaultController,
  openai: OpenAI,
  storyPages: string[],
  storyInput: StoryInput,
  storyId: string
): Promise<(string | null)[]> {
  const imageResults: (string | null)[] = Array(storyPages.length).fill(null);
  const indicesToIllustrate = Array.from(
    { length: storyPages.length },
    (_, i) => i
  );

  for (const index of indicesToIllustrate) {
    let retries = 0;
    let success = false;

    while (retries < MAX_RETRIES && !success) {
      try {
        const pageText = storyPages[index];
        const { characters, storyStyle } = storyInput;

        // Send event for illustration progress
        safeSendEvent(controller, "progress", {
          step: "illustrating",
          status: "in_progress",
          message: `Generating illustration ${index + 1} of ${
            storyPages.length
          }...`,
          illustrationProgress: {
            current: index + 1,
            total: storyPages.length,
            detail:
              index === 0
                ? "Creating title page illustration"
                : `Creating illustration for page ${index}`,
          },
        });

        // Find the main character, or use the first character if none is marked as main
        const mainCharacter =
          characters.find((char) => char.isMain) || characters[0];
        const mainCharacterName = mainCharacter.name || "the main character";

        // Get all character names for the illustration
        const otherCharacterNames = characters
          .filter((c) => !c.isMain && c.name.trim() !== "")
          .map((c) => c.name);

        // Create richer character descriptions with gender-specific language
        const mainCharacterGenderDescription = (() => {
          if (mainCharacter.gender === "female") {
            return `a girl named ${mainCharacterName}`;
          } else if (mainCharacter.gender === "male") {
            return `a boy named ${mainCharacterName}`;
          } else {
            return `a child named ${mainCharacterName}`;
          }
        })();

        // Build other characters details with gender
        const otherCharactersDetails = characters
          .filter((c) => !c.isMain && c.name.trim() !== "")
          .map((c) => {
            if (c.gender === "female") {
              return `a girl named ${c.name}`;
            } else if (c.gender === "male") {
              return `a boy named ${c.name}`;
            } else {
              return c.name;
            }
          });

        // Create a comprehensive character description to guide the illustration
        const characterDescription =
          otherCharactersDetails.length > 0
            ? `The main character is ${mainCharacterGenderDescription}. Other characters that may appear: ${otherCharactersDetails.join(
                ", "
              )}.`
            : `The main character is ${mainCharacterGenderDescription}.`;

        // Create enhanced prompt for DALL-E 3 image generation
        const promptText = `
⚠️ CRITICAL INSTRUCTION - STRICT NO TEXT POLICY ⚠️
This is a children's book illustration. TEXT IS COMPLETELY FORBIDDEN IN ANY FORM.

CREATE A CHILDREN'S BOOK ILLUSTRATION showing this scene:
${pageText.replace(/\b[A-Z]{2,}\b/g, (word) => word.toLowerCase())} 

CHARACTER DETAILS:
${characterDescription}
${
  mainCharacter.gender !== "unspecified"
    ? `Ensure the main character clearly appears as ${
        mainCharacter.gender === "female" ? "a girl/female" : "a boy/male"
      } in the illustration.`
    : ""
}

STYLE GUIDANCE:
${
  storyStyle
    ? `Primary style: ${storyStyle}`
    : "Primary style: balanced and appealing for children"
}
Age-appropriate visuals for ${storyInput.ageRange || "5-7"} year old audience
Professional children's book quality, colorful with clear focal points
${
  index === 0
    ? "Create an establishing scene that introduces the character and setting"
    : ""
}
${
  index === storyPages.length - 1
    ? "Create a satisfying resolution scene with positive emotional tone"
    : ""
}

MANDATORY RULES - NO EXCEPTIONS:
1. ZERO TEXT POLICY: The image must be completely free of any text, letters, numbers, or symbols
2. NO TEXT ON OBJECTS: Books, papers, signs, clothing, or any other objects must be completely blank
3. NO TEXT IN BACKGROUND: No text in any part of the background or environment
4. NO TEXT IN FOREGROUND: No text in any part of the foreground or main elements
5. NO TEXT IN DECORATIONS: No text in any decorative elements or patterns
6. NO TEXT IN ANY FORM: No text in any language, style, or format
7. NO TEXT IN ANY SHAPE: No text disguised as shapes, patterns, or other elements
8. NO TEXT IN ANY CONTEXT: No text in any context or situation

OBJECT HANDLING - TEXT-FREE REQUIREMENTS:
- Books and papers: Show only blank pages or abstract patterns
- Signs and displays: Use only blank surfaces or abstract shapes
- Clothing and accessories: Remove all text and use solid colors or patterns
- Buildings and structures: Remove all text from walls, windows, or surfaces
- Natural elements: Ensure no text is present in any natural elements
- Artificial elements: Ensure no text is present in any man-made elements

SAFETY MEASURES:
- Double-check every element for potential text
- Remove any element that might contain text
- Replace text-containing elements with text-free alternatives
- Verify the entire image is text-free before finalizing

STYLE GUIDELINES:
- Create a clean, well-composed illustration
- Use vibrant, harmonious colors
- Maintain consistent artistic style
- Focus on expressive character faces
- Keep backgrounds detailed but not overwhelming
- Ensure clear storytelling through visuals only

FINAL VERIFICATION:
This image MUST be completely free of any text, letters, numbers, writing, or readable elements. The illustration should tell the story through pure visuals only. If there is ANY doubt about an element containing text, remove it or replace it with a text-free alternative.`;

        console.log(
          `Generating image for page ${index + 1} using DALL-E 3 (attempt ${
            retries + 1
          })...`
        );

        // Call DALL-E 3 API with timeout
        const response = await withTimeout(
          openai.images.generate({
            model: "dall-e-3",
            prompt: promptText,
            n: 1,
            size: "1024x1024",
            quality: "standard",
            style: "vivid",
            response_format: "b64_json",
          }),
          TIMEOUT_MS
        );

        console.log(`Got response from DALL-E 3 for page ${index + 1}`);

        // Extract base64 image data
        const base64ImageData = response.data[0]?.b64_json;

        if (base64ImageData) {
          // Send a preview event with the base64 data
          safeSendEvent(controller, "image_preview", {
            pageIndex: index,
            previewUrl: `data:image/png;base64,${base64ImageData}`,
          });

          // Upload the image to blob storage
          const imageUrl = await uploadImageToBlobStorage(
            `data:image/png;base64,${base64ImageData}`,
            storyId,
            index
          );

          if (imageUrl) {
            imageResults[index] = imageUrl;
            console.log(
              `Successfully uploaded image and stored URL for page ${index + 1}`
            );
            success = true;
          } else {
            console.error(
              `Failed to upload image for page ${index + 1}. URL will be null.`
            );
            retries++;
          }
        } else {
          console.warn(
            `No image data received from DALL-E 3 for page ${index + 1}`
          );
          retries++;
        }
      } catch (error) {
        console.error(
          `Error generating illustration for page ${index} (attempt ${
            retries + 1
          }):`,
          error instanceof Error ? error.message : "Unknown error"
        );

        if (error instanceof Error && error.message === "Operation timed out") {
          console.log(`Timeout occurred for page ${index + 1}, retrying...`);
        }

        retries++;

        if (retries >= MAX_RETRIES) {
          console.error(
            `Failed to generate illustration for page ${
              index + 1
            } after ${MAX_RETRIES} attempts`
          );
          // Send error event but continue with other illustrations
          safeSendEvent(controller, "progress", {
            step: "illustrating",
            status: "in_progress",
            message: `Failed to generate illustration ${
              index + 1
            }, continuing with others...`,
            illustrationProgress: {
              current: index + 1,
              total: storyPages.length,
              detail: "Generation failed, continuing...",
            },
          });
        } else {
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 2000 * retries));
        }
      }
    }
  }

  // Send completion event
  safeSendEvent(controller, "progress", {
    step: "illustrating",
    status: "complete",
    message: "All illustrations generated successfully!",
    illustrationProgress: {
      current: storyPages.length,
      total: storyPages.length,
      detail: "All illustrations complete!",
    },
  });

  console.log(
    `Returning array of ${imageResults.length} image URLs. Null count: ${
      imageResults.filter((url) => url === null).length
    }`
  );
  return imageResults;
}

// AI-powered title generation function
async function generateTitleFromStory(
  openai: OpenAI,
  storyPagesText: string[],
  ageRange: string,
  mainCharacterName: string
): Promise<string> {
  try {
    console.log("Generating AI title for story...");

    // Combine story text into a single string (use first 2-3 paragraphs to keep prompt size reasonable)
    const combinedStoryText = storyPagesText.slice(0, 3).join("\n\n");

    // Create prompts for the OpenAI API
    const systemPrompt = `You are an expert at creating engaging and age-appropriate titles for children's stories. 
Given the following story text, generate a short, creative, and catchy title suitable for a child in the ${ageRange} age range. 
The main character is named ${mainCharacterName}. 
The title should be memorable, reflect the story's theme, and appeal to children.
Output ONLY the title text, nothing else. Do not use quotes around the title.`;

    const userPrompt = `Story Text:\n${combinedStoryText}\n\nGenerate a title:`;

    // Make API call to OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 30,
      temperature: 0.8,
    });

    // Extract and clean the title from the response
    let title = response.choices[0]?.message?.content?.trim() || "";

    // Remove any quotes that might have been added
    title = title.replace(/^["'](.*)["']$/, "$1");

    console.log(`AI generated title: "${title}"`);
    return title;
  } catch (error) {
    console.error("Error generating AI title:", error);

    // Fallback to a default title pattern if AI generation fails
    console.log("Using fallback title generation method");
    return fallbackGenerateStoryTitle(mainCharacterName);
  }
}

// Fallback title generation in case the AI title generation fails
function fallbackGenerateStoryTitle(mainCharacterName: string): string {
  const titlePrefixes = [
    "The Adventure of",
    "The Magical Journey of",
    "The Incredible Tale of",
    "The Fantastic Quest of",
    "The Amazing Day with",
  ];

  const randomPrefix =
    titlePrefixes[Math.floor(Math.random() * titlePrefixes.length)];
  return `${randomPrefix} ${mainCharacterName}`;
}
