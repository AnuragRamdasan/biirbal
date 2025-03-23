import axios from 'axios'
import * as cheerio from 'cheerio'
import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'

export async function extractTextFromUrl(url) {
  try {
    const { data } = await axios.get(url)

    // Use Readability to parse the content
    const dom = new JSDOM(data, { url })
    const reader = new Readability(dom.window.document)
    const article = reader.parse()

    if (article && article.textContent) {
      return article.textContent.replace(/\s+/g, ' ').trim()
    }

    // Fallback to cheerio if Readability fails
    const $ = cheerio.load(data)

    // Remove unnecessary elements
    $('script, style, nav, footer, header, aside').remove()

    // Get main content
    const content =
      $('article').text() ||
      $('[role="main"]').text() ||
      $('main').text() ||
      $('.content').text() ||
      $('body').text()

    // Clean up text
    return content.replace(/\s+/g, ' ').trim()
  } catch (error) {
    console.error('Error extracting text:', error)
    throw new Error('Failed to extract text from URL')
  }
}
