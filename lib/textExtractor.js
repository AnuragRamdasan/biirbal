import axios from "axios";
import * as cheerio from "cheerio";

export async function extractTextFromUrl(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // Remove unnecessary elements
    $("script, style, nav, footer, header, aside").remove();

    // Get main content
    const article =
      $("article").text() ||
      $('[role="main"]').text() ||
      $("main").text() ||
      $(".content").text() ||
      $("body").text();

    // Clean up text
    return article.replace(/\s+/g, " ").trim();
  } catch (error) {
    console.error("Error extracting text:", error);
    throw new Error("Failed to extract text from URL");
  }
}
