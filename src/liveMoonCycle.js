// src/liveMoonCycle.js

export function getMoonPhase(date = new Date()) {
  const knownNewMoon = new Date('2024-01-11T11:57:00Z').getTime();
  const lunarCycle = 29.53058770576 * 86400000; // Cycle length in milliseconds
  const elapsed = date.getTime() - knownNewMoon;
  const phase = (elapsed % lunarCycle) / lunarCycle;
  return phase < 0 ? phase + 1 : phase;
}