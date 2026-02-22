// services/smartService.ts
const WEATHER_KEY = "d1f6db931e05bca24a26555147f0a99d";
const MAPILLARY_KEY = "MLY|26019255507693470|5bc2f6f80c6fa716af84fb85044c8186";

export const fetchNext100mInfor = async (lat: number, lon: number) => {
  try {
    const [osmRes, weatherRes] = await Promise.all([
      fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(`[out:json];way(around:100, ${lat}, ${lon})["highway"];out tags;`)}`),
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`)
    ]);

    const osmData = await osmRes.json();
    const weatherData = await weatherRes.json();
    const tags = osmData.elements[0]?.tags || {};

    return {
      speedLimit: tags.maxspeed || "50",
      temp: Math.round(weatherData.main.temp),
      condition: weatherData.weather[0].main,
      isWet: weatherData.weather[0].main.toLowerCase().includes('rain'),
      slope: tags.incline || "0.0",
      hasPothole: tags.smoothness === "very_bad" || tags.surface === "unpaved",
      hasBumper: tags.traffic_calming === "bump" || tags.hazard === "speed_bump"
    };
  } catch (error) { return null; }
};