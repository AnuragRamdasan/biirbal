import { extractTextFromUrl } from '@/lib/textExtractor';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('textExtractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should extract text from article content', async () => {
    const mockHtml = `
      <html>
        <body>
          <article>Test article content</article>
          <div>Other content</div>
        </body>
      </html>
    `;

    mockedAxios.get.mockResolvedValueOnce({ data: mockHtml });

    const result = await extractTextFromUrl('https://test.com/article');
    expect(result).toBe('Test article content');
  });

  it('should fall back to main content if no article tag', async () => {
    const mockHtml = `
      <html>
        <body>
          <main>Main content</main>
        </body>
      </html>
    `;

    mockedAxios.get.mockResolvedValueOnce({ data: mockHtml });

    const result = await extractTextFromUrl('https://test.com/article');
    expect(result).toBe('Main content');
  });

  it('should handle errors gracefully', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

    await expect(extractTextFromUrl('https://test.com/article'))
      .rejects
      .toThrow('Failed to extract text from URL');
  });
}); 