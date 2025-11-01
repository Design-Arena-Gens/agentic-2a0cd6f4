import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import * as cheerio from 'cheerio'

interface SearchResult {
  title: string
  url: string
  description: string
  source: string
}

interface SearchPayload {
  partName: string
  partNumber: string
  websites: string[]
}

async function searchWebsite(
  website: string,
  partName: string,
  partNumber: string
): Promise<SearchResult[]> {
  const results: SearchResult[] = []

  try {
    const searchQuery = [partName, partNumber].filter(Boolean).join(' ')
    const encodedQuery = encodeURIComponent(searchQuery)

    // Try common search patterns
    const searchUrls = [
      `${website}/search?q=${encodedQuery}`,
      `${website}/s?k=${encodedQuery}`,
      `${website}/search.php?search_query=${encodedQuery}`,
      `${website}/catalogsearch/result/?q=${encodedQuery}`,
    ]

    for (const searchUrl of searchUrls) {
      try {
        const response = await axios.get(searchUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          maxRedirects: 5,
        })

        const $ = cheerio.load(response.data)
        const hostname = new URL(website).hostname

        // Generic selectors for common e-commerce patterns
        const selectors = [
          // Product cards
          '.product-item, .product, .item, [data-product], .search-result',
          // List items
          'li[class*="product"], li[class*="item"], li[class*="result"]',
          // Links with product info
          'a[class*="product"], a[href*="product"], a[href*="part"]',
        ]

        let foundResults = false

        for (const selector of selectors) {
          $(selector).slice(0, 10).each((_, element) => {
            const $el = $(element)

            // Try to find title
            let title =
              $el.find('h2, h3, h4, .title, .name, [class*="title"], [class*="name"]').first().text().trim() ||
              $el.find('a').first().text().trim() ||
              $el.text().trim().split('\n')[0]

            // Try to find link
            let link =
              $el.find('a').first().attr('href') ||
              $el.attr('href') ||
              ''

            if (link && !link.startsWith('http')) {
              link = new URL(link, website).href
            }

            // Try to find description
            let description =
              $el.find('.description, .desc, p, [class*="description"]').first().text().trim() ||
              $el.text().trim().substring(0, 200)

            // Clean up text
            title = title.replace(/\s+/g, ' ').trim().substring(0, 150)
            description = description.replace(/\s+/g, ' ').trim().substring(0, 250)

            // Basic validation
            if (title && title.length > 3 && link &&
                (title.toLowerCase().includes(partName.toLowerCase()) ||
                 title.toLowerCase().includes(partNumber.toLowerCase()) ||
                 description.toLowerCase().includes(partName.toLowerCase()) ||
                 description.toLowerCase().includes(partNumber.toLowerCase()))) {

              results.push({
                title,
                url: link,
                description: description || 'No description available',
                source: hostname,
              })
              foundResults = true
            }
          })

          if (foundResults) break
        }

        if (foundResults) break

      } catch (error) {
        continue
      }
    }

    // If no specific results found, try to create generic search result
    if (results.length === 0) {
      const searchQuery = [partName, partNumber].filter(Boolean).join(' ')
      const encodedQuery = encodeURIComponent(searchQuery)
      const hostname = new URL(website).hostname

      results.push({
        title: `Search "${searchQuery}" on ${hostname}`,
        url: `${website}/search?q=${encodedQuery}`,
        description: `Click to search for "${searchQuery}" on ${hostname}`,
        source: hostname,
      })
    }

  } catch (error) {
    // Silently fail for individual websites
    console.error(`Error searching ${website}:`, error)
  }

  return results
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchPayload = await request.json()
    const { partName, partNumber, websites } = body

    if (!partName && !partNumber) {
      return NextResponse.json(
        { error: 'Part name or part number is required' },
        { status: 400 }
      )
    }

    if (!websites || websites.length === 0) {
      return NextResponse.json(
        { error: 'At least one website is required' },
        { status: 400 }
      )
    }

    // Search all websites in parallel
    const searchPromises = websites.map(website =>
      searchWebsite(website, partName, partNumber)
    )

    const searchResults = await Promise.all(searchPromises)
    const allResults = searchResults.flat()

    // Remove duplicates based on URL
    const uniqueResults = Array.from(
      new Map(allResults.map(item => [item.url, item])).values()
    )

    return NextResponse.json({
      results: uniqueResults,
      count: uniqueResults.length,
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
