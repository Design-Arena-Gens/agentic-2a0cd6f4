'use client'

import { useState } from 'react'

interface SearchResult {
  title: string
  url: string
  description: string
  source: string
}

export default function Home() {
  const [partName, setPartName] = useState('')
  const [partNumber, setPartNumber] = useState('')
  const [websites, setWebsites] = useState<string[]>([
    'https://www.digikey.com',
    'https://www.mouser.com',
    'https://www.newark.com'
  ])
  const [newWebsite, setNewWebsite] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const addWebsite = () => {
    if (newWebsite && !websites.includes(newWebsite)) {
      let url = newWebsite.trim()
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url
      }
      setWebsites([...websites, url])
      setNewWebsite('')
    }
  }

  const removeWebsite = (website: string) => {
    setWebsites(websites.filter(w => w !== website))
  }

  const handleSearch = async () => {
    if (!partName && !partNumber) {
      setError('Please enter a part name or part number')
      return
    }

    if (websites.length === 0) {
      setError('Please add at least one website to search')
      return
    }

    setLoading(true)
    setError('')
    setResults([])

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partName,
          partNumber,
          websites,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Search failed')
      } else {
        setResults(data.results || [])
      }
    } catch (err) {
      setError('Failed to perform search. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="header">
        <h1>🔍 Part Search Agent</h1>
        <p>Search multiple websites for parts by name and number</p>
      </div>

      <div className="search-section">
        <div className="input-group">
          <label htmlFor="partName">Part Name</label>
          <input
            id="partName"
            type="text"
            value={partName}
            onChange={(e) => setPartName(e.target.value)}
            placeholder="e.g., Arduino Uno, Resistor, Capacitor"
          />
        </div>

        <div className="input-group">
          <label htmlFor="partNumber">Part Number</label>
          <input
            id="partNumber"
            type="text"
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value)}
            placeholder="e.g., ATmega328P, LM358, 1N4148"
          />
        </div>

        <div className="websites-section">
          <label>Websites to Search</label>
          <div className="website-list">
            {websites.map((website) => (
              <div key={website} className="website-tag">
                <span>{website}</span>
                <button onClick={() => removeWebsite(website)}>×</button>
              </div>
            ))}
          </div>
          <div className="add-website">
            <input
              type="text"
              value={newWebsite}
              onChange={(e) => setNewWebsite(e.target.value)}
              placeholder="Add website URL (e.g., https://example.com)"
              onKeyPress={(e) => e.key === 'Enter' && addWebsite()}
            />
            <button className="btn btn-secondary" onClick={addWebsite}>
              Add Website
            </button>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <button
          className="btn btn-primary search-btn"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? 'Searching...' : 'Search Parts'}
        </button>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Searching websites for parts...</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="results">
          <h2>Search Results ({results.length})</h2>
          {results.map((result, index) => (
            <div key={index} className="result-item">
              <div className="result-header">
                <div>
                  <div className="result-title">{result.title}</div>
                </div>
                <div className="result-source">{result.source}</div>
              </div>
              <div className="result-description">{result.description}</div>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="result-link"
              >
                View Part → {result.url}
              </a>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && (partName || partNumber) && !error && (
        <div className="results">
          <div className="no-results">
            <h2>No results found</h2>
            <p>Try adjusting your search terms or adding more websites</p>
          </div>
        </div>
      )}
    </div>
  )
}
