"use client";

import { useEffect, useRef, useState } from "react";
import Input from "@/components/ui/Input";

export interface CityOption {
  id: string;
  name: string;
  region: string;
}

interface CityComboBoxProps {
  cities: CityOption[];
  cityValue: string;
  onCityChange: (city: string) => void;
  onSelectCity: (city: string, region: string) => void;
}

/**
 * Lets a host search/select from the admin-curated city list, but still type
 * a custom city that isn't in it — that value just won't be eligible for the
 * homepage's "Top cities to explore" curation (admin-curated cities only).
 */
export default function CityComboBox({ cities, cityValue, onCityChange, onSelectCity }: CityComboBoxProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = cityValue.trim().toLowerCase();
  const matches = query
    ? cities.filter(
        (c) => c.name.toLowerCase().includes(query) || c.region.toLowerCase().includes(query),
      )
    : cities;
  const suggestions = matches.slice(0, 8);

  const isKnownCity = cities.some((c) => c.name.toLowerCase() === query);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open]);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [cityValue, open]);

  function selectCity(city: CityOption) {
    onSelectCity(city.name, city.region);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case "Enter":
        if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
          e.preventDefault();
          selectCity(suggestions[focusedIndex]);
        }
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <Input
        value={cityValue}
        onChange={(e) => {
          onCityChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search or type a city"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {cityValue && !isKnownCity && (
        <p className="mt-1 text-xs text-neutral-400">
          Not in our curated list — your listing will still work, but this city won&apos;t show up in Top Cities.
        </p>
      )}
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg">
          {suggestions.map((city, index) => (
            <button
              key={city.id}
              type="button"
              onClick={() => selectCity(city)}
              className={`flex w-full items-center justify-between px-4 py-2 text-sm text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
                focusedIndex === index ? "bg-neutral-100 dark:bg-neutral-700" : ""
              }`}
            >
              <span className="text-neutral-900 dark:text-neutral-100">{city.name}</span>
              <span className="text-neutral-400 text-xs">{city.region}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
