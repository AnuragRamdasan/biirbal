import { generateAudio } from "@/lib/audioGenerator";
import OpenAI from "openai";

jest.mock("openai");

describe("audioGenerator", () => {
  const mockOpenAI = {
    audio: {
      speech: {
        create: jest.fn(),
      },
    },
  };

  beforeEach(() => {
    (OpenAI as jest.Mock).mockImplementation(() => mockOpenAI);
  });

  it("should generate audio from text", async () => {
    const mockArrayBuffer = new ArrayBuffer(8);
    const mockResponse = {
      arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
    };

    mockOpenAI.audio.speech.create.mockResolvedValue(mockResponse);

    const result = await generateAudio("Test text");
    expect(result).toBeInstanceOf(Buffer);
    expect(mockOpenAI.audio.speech.create).toHaveBeenCalledWith({
      model: "tts-1",
      voice: "alloy",
      input: "Test text",
    });
  });

  it("should handle errors", async () => {
    mockOpenAI.audio.speech.create.mockRejectedValue(new Error("API error"));

    await expect(generateAudio("Test text")).rejects.toThrow(
      "Failed to generate audio",
    );
  });
});
