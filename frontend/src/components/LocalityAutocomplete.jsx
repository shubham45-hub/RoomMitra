import { useEffect, useState } from "react";
import { getLocalitySuggestions } from "../services/locations";

export default function LocalityAutocomplete({ city, value, onChange }) {
  const [focused, setFocused] = useState(false);
  const [suggestionState, setSuggestionState] = useState({
    city: "",
    query: "",
    items: [],
  });
  const normalizedCity = city.trim();
  const normalizedQuery = value.trim();
  const suggestions =
    suggestionState.city === normalizedCity && suggestionState.query === normalizedQuery
      ? suggestionState.items
      : [];

  useEffect(() => {
    if (!normalizedCity || !normalizedQuery) return undefined;
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const items = await getLocalitySuggestions(normalizedCity, normalizedQuery);
        if (!cancelled) {
          setSuggestionState({ city: normalizedCity, query: normalizedQuery, items });
        }
      } catch {
        if (!cancelled) {
          setSuggestionState({ city: normalizedCity, query: normalizedQuery, items: [] });
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalizedCity, normalizedQuery]);

  function select(place) {
    onChange(place);
    setSuggestionState({ city: "", query: "", items: [] });
    setFocused(false);
  }

  return (
    <div className="locality-autocomplete">
      <label htmlFor="locality">Locality</label>
      <input
        id="locality"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Start typing a locality"
        minLength={2}
        maxLength={150}
        autoComplete="off"
        required
      />

      {focused && suggestions.length > 0 && (
        <div className="locality-suggestions" role="listbox">
          {suggestions.map((place) => (
            <button
              key={place}
              type="button"
              className="locality-suggestion"
              role="option"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(place)}
            >
              <span className="suggestion-pin">⌖</span>
              {place}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
