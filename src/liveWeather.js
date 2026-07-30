async function syncLiveWeather(lat, lon) {
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
  const data = await res.json();
  const weatherCode = data.current_weather.weathercode;

  // WMO Weather interpretation codes
  if (weatherCode >= 1 && weatherCode <= 3) {
    // Partly Cloudy / Overcast
    skyUniforms['turbidity'].value = 20; // Increases cloud haze in sky
    sunLight.intensity = 1.2;
  } else if (weatherCode >= 51) {
    // Rain / Storm
    skyUniforms['turbidity'].value = 50;
    skyUniforms['rayleigh'].value = 0.5; // Dulls blue sky
    sunLight.intensity = 0.3; // Dim sunlight
  }
}

// Example: Sync with Venice, Italy coordinates
syncLiveWeather(45.44, 12.31);