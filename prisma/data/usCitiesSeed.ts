/**
 * Admin-curated City taxonomy seed — wide U.S. coverage (major metros plus
 * popular vacation/rental destinations) across every state + DC. Hosts can
 * still type any city they want on their listing; this list only decides
 * what's searchable in the dropdown and what's eligible for "Top cities to
 * explore" curation. Safe to re-run (see prisma/seed-cities.ts) — upserts by
 * (name, region), never overwrites an admin's isActive change.
 */
export const US_CITIES_SEED: { name: string; region: string }[] = [
  // Alabama
  { name: "Birmingham", region: "AL" },
  { name: "Montgomery", region: "AL" },
  { name: "Huntsville", region: "AL" },
  { name: "Mobile", region: "AL" },
  // Alaska
  { name: "Anchorage", region: "AK" },
  { name: "Juneau", region: "AK" },
  { name: "Fairbanks", region: "AK" },
  // Arizona
  { name: "Phoenix", region: "AZ" },
  { name: "Scottsdale", region: "AZ" },
  { name: "Tucson", region: "AZ" },
  { name: "Sedona", region: "AZ" },
  { name: "Flagstaff", region: "AZ" },
  // Arkansas
  { name: "Little Rock", region: "AR" },
  { name: "Fayetteville", region: "AR" },
  { name: "Hot Springs", region: "AR" },
  // California
  { name: "Los Angeles", region: "CA" },
  { name: "San Diego", region: "CA" },
  { name: "San Francisco", region: "CA" },
  { name: "Sacramento", region: "CA" },
  { name: "San Jose", region: "CA" },
  { name: "Napa", region: "CA" },
  { name: "Palm Springs", region: "CA" },
  { name: "Santa Barbara", region: "CA" },
  { name: "Lake Tahoe", region: "CA" },
  { name: "Malibu", region: "CA" },
  // Colorado
  { name: "Denver", region: "CO" },
  { name: "Boulder", region: "CO" },
  { name: "Aspen", region: "CO" },
  { name: "Colorado Springs", region: "CO" },
  { name: "Vail", region: "CO" },
  // Connecticut
  { name: "Hartford", region: "CT" },
  { name: "New Haven", region: "CT" },
  { name: "Mystic", region: "CT" },
  // Delaware
  { name: "Wilmington", region: "DE" },
  { name: "Rehoboth Beach", region: "DE" },
  // Washington DC
  { name: "Washington", region: "DC" },
  // Florida
  { name: "Miami", region: "FL" },
  { name: "Orlando", region: "FL" },
  { name: "Key West", region: "FL" },
  { name: "Tampa", region: "FL" },
  { name: "Fort Lauderdale", region: "FL" },
  { name: "St. Augustine", region: "FL" },
  { name: "Naples", region: "FL" },
  { name: "Sarasota", region: "FL" },
  // Georgia
  { name: "Atlanta", region: "GA" },
  { name: "Savannah", region: "GA" },
  { name: "Athens", region: "GA" },
  // Hawaii
  { name: "Honolulu", region: "HI" },
  { name: "Maui", region: "HI" },
  { name: "Kauai", region: "HI" },
  // Idaho
  { name: "Boise", region: "ID" },
  { name: "Sun Valley", region: "ID" },
  { name: "Coeur d'Alene", region: "ID" },
  // Illinois
  { name: "Chicago", region: "IL" },
  { name: "Springfield", region: "IL" },
  // Indiana
  { name: "Indianapolis", region: "IN" },
  { name: "Bloomington", region: "IN" },
  // Iowa
  { name: "Des Moines", region: "IA" },
  { name: "Iowa City", region: "IA" },
  // Kansas
  { name: "Wichita", region: "KS" },
  { name: "Lawrence", region: "KS" },
  // Kentucky
  { name: "Louisville", region: "KY" },
  { name: "Lexington", region: "KY" },
  { name: "Bowling Green", region: "KY" },
  // Louisiana
  { name: "New Orleans", region: "LA" },
  { name: "Baton Rouge", region: "LA" },
  { name: "Lafayette", region: "LA" },
  // Maine
  { name: "Portland", region: "ME" },
  { name: "Bar Harbor", region: "ME" },
  { name: "Kennebunkport", region: "ME" },
  // Maryland
  { name: "Baltimore", region: "MD" },
  { name: "Annapolis", region: "MD" },
  { name: "Ocean City", region: "MD" },
  // Massachusetts
  { name: "Boston", region: "MA" },
  { name: "Cambridge", region: "MA" },
  { name: "Cape Cod", region: "MA" },
  { name: "Nantucket", region: "MA" },
  { name: "Martha's Vineyard", region: "MA" },
  // Michigan
  { name: "Detroit", region: "MI" },
  { name: "Ann Arbor", region: "MI" },
  { name: "Traverse City", region: "MI" },
  { name: "Grand Rapids", region: "MI" },
  // Minnesota
  { name: "Minneapolis", region: "MN" },
  { name: "St. Paul", region: "MN" },
  { name: "Duluth", region: "MN" },
  // Mississippi
  { name: "Jackson", region: "MS" },
  { name: "Biloxi", region: "MS" },
  { name: "Oxford", region: "MS" },
  // Missouri
  { name: "Kansas City", region: "MO" },
  { name: "St. Louis", region: "MO" },
  { name: "Branson", region: "MO" },
  // Montana
  { name: "Bozeman", region: "MT" },
  { name: "Missoula", region: "MT" },
  { name: "Whitefish", region: "MT" },
  // Nebraska
  { name: "Omaha", region: "NE" },
  { name: "Lincoln", region: "NE" },
  // Nevada
  { name: "Las Vegas", region: "NV" },
  { name: "Reno", region: "NV" },
  // New Hampshire
  { name: "Portsmouth", region: "NH" },
  { name: "North Conway", region: "NH" },
  // New Jersey
  { name: "Jersey City", region: "NJ" },
  { name: "Atlantic City", region: "NJ" },
  { name: "Cape May", region: "NJ" },
  // New Mexico
  { name: "Santa Fe", region: "NM" },
  { name: "Albuquerque", region: "NM" },
  { name: "Taos", region: "NM" },
  // New York
  { name: "New York", region: "NY" },
  { name: "Brooklyn", region: "NY" },
  { name: "Hudson", region: "NY" },
  { name: "Saratoga Springs", region: "NY" },
  { name: "Lake Placid", region: "NY" },
  { name: "Ithaca", region: "NY" },
  { name: "Montauk", region: "NY" },
  // North Carolina
  { name: "Charlotte", region: "NC" },
  { name: "Asheville", region: "NC" },
  { name: "Raleigh", region: "NC" },
  { name: "Wilmington", region: "NC" },
  { name: "Outer Banks", region: "NC" },
  // North Dakota
  { name: "Fargo", region: "ND" },
  { name: "Bismarck", region: "ND" },
  // Ohio
  { name: "Columbus", region: "OH" },
  { name: "Cincinnati", region: "OH" },
  { name: "Cleveland", region: "OH" },
  // Oklahoma
  { name: "Oklahoma City", region: "OK" },
  { name: "Tulsa", region: "OK" },
  // Oregon
  { name: "Portland", region: "OR" },
  { name: "Bend", region: "OR" },
  { name: "Ashland", region: "OR" },
  // Pennsylvania
  { name: "Philadelphia", region: "PA" },
  { name: "Pittsburgh", region: "PA" },
  { name: "Lancaster", region: "PA" },
  { name: "Poconos", region: "PA" },
  // Rhode Island
  { name: "Providence", region: "RI" },
  { name: "Newport", region: "RI" },
  // South Carolina
  { name: "Charleston", region: "SC" },
  { name: "Myrtle Beach", region: "SC" },
  { name: "Columbia", region: "SC" },
  { name: "Hilton Head Island", region: "SC" },
  // South Dakota
  { name: "Sioux Falls", region: "SD" },
  { name: "Rapid City", region: "SD" },
  { name: "Deadwood", region: "SD" },
  // Tennessee
  { name: "Nashville", region: "TN" },
  { name: "Memphis", region: "TN" },
  { name: "Gatlinburg", region: "TN" },
  { name: "Chattanooga", region: "TN" },
  { name: "Knoxville", region: "TN" },
  // Texas
  { name: "Austin", region: "TX" },
  { name: "Houston", region: "TX" },
  { name: "Dallas", region: "TX" },
  { name: "San Antonio", region: "TX" },
  { name: "Fort Worth", region: "TX" },
  { name: "Galveston", region: "TX" },
  // Utah
  { name: "Salt Lake City", region: "UT" },
  { name: "Park City", region: "UT" },
  { name: "Moab", region: "UT" },
  // Vermont
  { name: "Burlington", region: "VT" },
  { name: "Stowe", region: "VT" },
  { name: "Woodstock", region: "VT" },
  // Virginia
  { name: "Richmond", region: "VA" },
  { name: "Virginia Beach", region: "VA" },
  { name: "Charlottesville", region: "VA" },
  { name: "Alexandria", region: "VA" },
  // Washington
  { name: "Seattle", region: "WA" },
  { name: "Spokane", region: "WA" },
  { name: "Leavenworth", region: "WA" },
  // West Virginia
  { name: "Charleston", region: "WV" },
  { name: "Harpers Ferry", region: "WV" },
  // Wisconsin
  { name: "Milwaukee", region: "WI" },
  { name: "Madison", region: "WI" },
  { name: "Door County", region: "WI" },
  // Wyoming
  { name: "Jackson Hole", region: "WY" },
  { name: "Cheyenne", region: "WY" },
  { name: "Yellowstone", region: "WY" },
];
