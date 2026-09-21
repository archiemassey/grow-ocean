/* star-math.js — pure, DOM-free astronomy for the Voyage Star Guide.
   Kept separate from the view so it can be unit-tested under Node and reused.
   Coordinates are real: right ascension (hours) and declination (degrees). */

/* Star catalogue: each star is [name, RA(hours), Dec(deg), mag, colourKind?].
   colourKind 'warm' = orange/red giants, 'cool' = blue-white; default neutral. */
export const CONSTELLATIONS = [
  { name: 'ORION', stars: [['Betelgeuse', 5.919, 7.41, 0.5, 'warm'], ['Bellatrix', 5.418, 6.35, 1.6], ['Mintaka', 5.533, -0.30, 2.2],
    ['Alnilam', 5.604, -1.20, 1.7], ['Alnitak', 5.679, -1.94, 1.8], ['Saiph', 5.796, -9.67, 2.1], ['Rigel', 5.242, -8.20, 0.1, 'cool']],
    lines: [[0, 1], [0, 4], [1, 2], [2, 3], [3, 4], [6, 2], [5, 4], [6, 5]] },
  { name: 'CANIS MAJOR', stars: [['Sirius', 6.752, -16.72, -1.46, 'cool'], ['Mirzam', 6.378, -17.96, 2.0], ['Wezen', 7.140, -26.39, 1.8],
    ['Adhara', 6.977, -28.97, 1.5], ['Aludra', 7.401, -29.30, 2.4]], lines: [[0, 1], [0, 2], [2, 3], [2, 4], [3, 1]] },
  { name: 'CANIS MINOR', stars: [['Procyon', 7.655, 5.22, 0.34], ['Gomeisa', 7.452, 8.29, 2.9]], lines: [[0, 1]] },
  { name: 'TAURUS', stars: [['Aldebaran', 4.599, 16.51, 0.85, 'warm'], ['Elnath', 5.438, 28.61, 1.65], ['', 4.330, 15.87, 3.5],
    ['', 4.478, 15.96, 3.4], ['Pleiades', 3.79, 24.11, 1.6]], lines: [[0, 1], [0, 2], [0, 3]] },
  { name: 'GEMINI', stars: [['Pollux', 7.755, 28.03, 1.14, 'warm'], ['Castor', 7.577, 31.89, 1.58], ['Alhena', 6.629, 16.40, 1.9],
    ['', 6.732, 25.13, 3.0], ['', 7.335, 21.98, 3.5]], lines: [[1, 3], [3, 4], [4, 2], [0, 4]] },
  { name: 'AURIGA', stars: [['Capella', 5.278, 46.00, 0.08, 'warm'], ['Menkalinan', 5.992, 44.95, 1.9], ['', 5.995, 37.21, 2.7], ['', 4.950, 33.16, 2.7]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 0]] },
  { name: 'LEO', stars: [['Regulus', 10.139, 11.97, 1.35], ['Denebola', 11.818, 14.57, 2.1], ['Algieba', 10.333, 19.84, 2.0],
    ['', 10.278, 23.42, 3.4], ['', 11.235, 20.52, 2.6], ['', 11.399, 15.43, 3.3]], lines: [[0, 2], [2, 3], [0, 5], [5, 4], [4, 1], [4, 2]] },
  { name: 'BOÖTES', stars: [['Arcturus', 14.261, 19.18, -0.05, 'warm'], ['', 14.531, 30.37, 2.7], ['', 15.032, 40.39, 3.0]], lines: [[0, 1], [1, 2]] },
  { name: 'SCORPIUS', stars: [['Antares', 16.490, -26.43, 1.06, 'warm'], ['', 16.005, -19.80, 2.6], ['', 15.981, -22.62, 2.9],
    ['', 16.353, -25.59, 2.8], ['', 17.560, -37.10, 1.9], ['', 17.708, -39.03, 2.4]], lines: [[1, 2], [2, 3], [3, 0], [0, 4], [4, 5]] },
  { name: 'CARINA', stars: [['Canopus', 6.399, -52.70, -0.74]], lines: [] },
  { name: 'CRUX', stars: [['Acrux', 12.443, -63.10, 0.77, 'cool'], ['Gacrux', 12.519, -57.11, 1.6, 'warm'],
    ['Mimosa', 12.795, -59.69, 1.25, 'cool'], ['Delta', 12.252, -58.75, 2.8]], lines: [[0, 1], [2, 3]] }
];

const DEG = Math.PI / 180, HRAD = 15 * DEG;

export function raSun(day) { return (17.4 + (day - 1) * 0.06575) % 24; }   // ~Dec 12 departure
export function latForVoyage(voy) { return 28 - 14 * voy; }                // 28°N → 14°N
export function hoursAfterMidnight(clk) { return -4 + clk * 10; }          // dusk 20:00 → pre-dawn 06:00
export function lstHours(day, clk) { return (raSun(day) + 12 + hoursAfterMidnight(clk) + 24) % 24; }

/* Convert equatorial (RA/Dec) to horizontal (altitude/azimuth) for the observer.
   azimuth is measured from North, clockwise (East = 90°). */
export function altaz(raHours, decDeg, lstH, latDeg) {
  const Hang = (lstH - raHours) * HRAD, d = decDeg * DEG, phi = latDeg * DEG;
  const sinAlt = Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(Hang);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  let cosA = (Math.sin(d) - Math.sin(phi) * sinAlt) / (Math.cos(phi) * Math.cos(alt));
  cosA = Math.max(-1, Math.min(1, cosA));
  let az = Math.acos(cosA) / DEG;
  if (Math.sin(Hang) > 0) az = 360 - az;
  return { alt: alt / DEG, az };
}

/* --- Sun position, for the "follow the sky over the boat" Auto screen mode ---
   Low-precision solar altitude (NOAA/USNO algorithm, good to well within a
   degree). Everything runs off the device's UTC clock, so it is immune to
   whatever timezone the phone is set to; longitude supplies the local offset. */
export function sunAltitudeDeg(date, latDeg, lonDeg) {
  const d = date.getTime() / 86400000 - 10957.5;        // days since J2000.0 (UT)
  const g = (357.529 + 0.98560028 * d) * DEG;           // mean anomaly
  const q = 280.459 + 0.98564736 * d;                   // mean longitude
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * DEG;  // ecliptic longitude
  const e = (23.439 - 0.00000036 * d) * DEG;            // obliquity
  const dec = Math.asin(Math.sin(e) * Math.sin(L));     // declination (rad)
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / DEG;  // right ascension (deg)
  const gmst = 280.46061837 + 360.98564736629 * d;      // Greenwich sidereal time (deg)
  let ha = (gmst + lonDeg - ra) % 360;                  // hour angle (deg)
  if (ha < -180) ha += 360; else if (ha > 180) ha -= 360;
  const phi = latDeg * DEG, H = ha * DEG;
  const sinAlt = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) / DEG;
}

/* Pick the screen mode from the sun's altitude:
     day   — sun up (allowing for refraction at the horizon)
     dark  — dawn/dusk twilight glow (calm dark theme)
     night — properly dark past nautical twilight (red-on-black to save night vision) */
export function themeForSunAltitude(altDeg) {
  if (altDeg >= -0.83) return 'day';
  if (altDeg >= -12) return 'dark';
  return 'night';
}
