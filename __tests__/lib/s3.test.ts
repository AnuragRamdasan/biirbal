import { uploadToS3 } from "@/lib/s3";
import AWS from "aws-sdk";

jest.mock("aws-sdk");

describe("s3", () => {
  const mockS3 = {
    putObject: jest.fn().mockReturnThis(),
    promise: jest.fn(),
  };

  beforeEach(() => {
    (AWS.S3 as jest.Mock).mockImplementation(() => mockS3);
    process.env.AWS_S3_BUCKET = "test-bucket";
    process.env.AWS_REGION = "us-east-1";
  });

  it("should upload buffer to S3", async () => {
    const buffer = Buffer.from("test");
    mockS3.promise.mockResolvedValue({});

    const result = await uploadToS3(buffer, "test.mp3");

    expect(mockS3.putObject).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: "test.mp3",
      Body: buffer,
      ContentType: "audio/mpeg",
      ACL: "public-read",
    });

    expect(result).toBe(
      "https://test-bucket.s3.us-east-1.amazonaws.com/test.mp3",
    );
  });

  it("should handle upload errors", async () => {
    mockS3.promise.mockRejectedValue(new Error("Upload failed"));

    await expect(uploadToS3(Buffer.from("test"), "test.mp3")).rejects.toThrow(
      "Failed to upload audio to S3",
    );
  });
});
