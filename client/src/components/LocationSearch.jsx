import { useState } from 'react'

function LocationSearch({ label, value, onChange, onSelect }) {
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')

  const searchLocation = async () => {
    setIsSearching(true)
    setError('')

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(value)}`,
      )
      const results = await response.json()

      if (!results.length) {
        setError('No matching place found')
        return
      }

      onSelect([Number(results[0].lat), Number(results[0].lon)])
    } catch {
      setError('Location search is unavailable')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <label className="location-field">
      <span>{label}</span>
      <div className="location-input-row">
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={`Search ${label.toLowerCase()}`}
        />
        <button type="button" onClick={searchLocation} disabled={!value.trim() || isSearching}>
          {isSearching ? 'Searching' : 'Find'}
        </button>
      </div>
      {error && <small className="field-error">{error}</small>}
    </label>
  )
}

export default LocationSearch
