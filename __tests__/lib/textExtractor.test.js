const { extractTextFromUrl } = require("@/lib/textExtractor");
const axios = require("axios");

jest.mock("axios");

describe("textExtractor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should extract text from article content", async () => {
    const mockHtml = `
      <html>
        <body>
          <article>Test article content</article>
          <div>Other content</div>
        </body>
      </html>
    `;

    axios.get.mockResolvedValueOnce({ data: mockHtml });

    const result = await extractTextFromUrl("https://test.com/article");
    expect(result).toBe("Test article content");
  });

  it("should fall back to main content if no article tag", async () => {
    const mockHtml = `
      <html>
        <body>
          <main>Main content</main>
        </body>
      </html>
    `;

    axios.get.mockResolvedValueOnce({ data: mockHtml });

    const result = await extractTextFromUrl("https://test.com/article");
    expect(result).toBe("Main content");
  });

  it("should handle errors gracefully", async () => {
    axios.get.mockRejectedValueOnce(new Error("Network error"));

    await expect(
      extractTextFromUrl("https://test.com/article")
    ).rejects.toThrow("Failed to extract text from URL");
  });
});
