import React, { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, Wind, Droplets, Eye, Gauge, Sunrise, Sunset, Cloud, CloudRain, CloudSnow, Sun, CloudDrizzle, Zap, CloudFog, Thermometer, Navigation, Waves, Activity, Calendar, Clock, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Loader } from 'lucide-react';

const AdvancedWeatherApp = () => {
  const [location, setLocation] = useState({ lat: 51.5074, lon: -0.1278, name: 'London' });
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [currentWeather, setCurrentWeather] = useState(null);
  const [hourlyForecast, setHourlyForecast] = useState([]);
  const [dailyForecast, setDailyForecast] = useState([]);
  const [airQuality, setAirQuality] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unit, setUnit] = useState('celsius');
  const [activeTab, setActiveTab] = useState('today');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    if (location.lat && location.lon) {
      fetchAllWeatherData();
    }
  }, [location, unit]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const locationName = await getLocationName(latitude, longitude);
          setLocation({ lat: latitude, lon: longitude, name: locationName });
        },
        () => {
          fetchAllWeatherData();
        }
      );
    }
  };

  const getLocationName = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}`
      );
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return result.name || result.city || result.admin1 || 'Unknown Location';
      }
      return 'Unknown Location';
    } catch (err) {
      return 'Unknown Location';
    }
  };

  const searchLocations = async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
      );
      const data = await response.json();
      setSuggestions(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const selectLocation = (result) => {
    setLocation({
      lat: result.latitude,
      lon: result.longitude,
      name: result.name
    });
    setSearchQuery('');
    setSuggestions([]);
  };

  const fetchAllWeatherData = async () => {
    setLoading(true);
    setError('');

    try {
      const tempUnit = unit === 'celsius' ? 'celsius' : 'fahrenheit';
      const windUnit = unit === 'celsius' ? 'kmh' : 'mph';

      // Fetch current and forecast data
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,precipitation,rain,weather_code,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,rain_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}&precipitation_unit=mm&timezone=auto`
      );

      if (!weatherResponse.ok) throw new Error('Failed to fetch weather data');

      const weatherData = await weatherResponse.json();

      // Fetch air quality
      const airQualityResponse = await fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.lat}&longitude=${location.lon}&current=european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust`
      );

      const airQualityData = await airQualityResponse.json();

      setCurrentWeather(weatherData.current);
      setHourlyForecast(processHourlyData(weatherData.hourly));
      setDailyForecast(processDailyData(weatherData.daily));
      setAirQuality(airQualityData.current);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      setError('Failed to load weather data. Please try again.');
      setLoading(false);
    }
  };

  const processHourlyData = (hourly) => {
    const now = new Date();
    const currentHour = now.getHours();
    const data = [];

    for (let i = 0; i < 24; i++) {
      data.push({
        time: hourly.time[i],
        temp: Math.round(hourly.temperature_2m[i]),
        feelsLike: Math.round(hourly.apparent_temperature[i]),
        precipitation: hourly.precipitation_probability[i] || 0,
        humidity: hourly.relative_humidity_2m[i],
        windSpeed: Math.round(hourly.wind_speed_10m[i]),
        windDirection: hourly.wind_direction_10m[i],
        weatherCode: hourly.weather_code[i],
        uvIndex: hourly.uv_index[i] || 0,
        cloudCover: hourly.cloud_cover[i],
        visibility: hourly.visibility[i]
      });
    }

    return data;
  };

  const processDailyData = (daily) => {
    const data = [];

    for (let i = 0; i < 7; i++) {
      data.push({
        date: daily.time[i],
        tempMax: Math.round(daily.temperature_2m_max[i]),
        tempMin: Math.round(daily.temperature_2m_min[i]),
        weatherCode: daily.weather_code[i],
        precipitation: daily.precipitation_probability_max[i] || 0,
        precipSum: daily.precipitation_sum[i],
        sunrise: daily.sunrise[i],
        sunset: daily.sunset[i],
        uvIndex: daily.uv_index_max[i],
        windSpeed: Math.round(daily.wind_speed_10m_max[i])
      });
    }

    return data;
  };

  const getWeatherDescription = (code) => {
    const weatherCodes = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail'
    };
    return weatherCodes[code] || 'Unknown';
  };

  const getWeatherIcon = (code, size = 'w-8 h-8') => {
    if (code === 0 || code === 1) return <Sun className={`${size} text-yellow-400`} />;
    if (code === 2) return <Cloud className={`${size} text-gray-300`} />;
    if (code === 3) return <Cloud className={`${size} text-gray-400`} />;
    if (code === 45 || code === 48) return <CloudFog className={`${size} text-gray-400`} />;
    if (code >= 51 && code <= 55) return <CloudDrizzle className={`${size} text-blue-300`} />;
    if (code >= 61 && code <= 67) return <CloudRain className={`${size} text-blue-400`} />;
    if (code >= 71 && code <= 77) return <CloudSnow className={`${size} text-blue-200`} />;
    if (code >= 80 && code <= 82) return <CloudRain className={`${size} text-blue-500`} />;
    if (code >= 85 && code <= 86) return <CloudSnow className={`${size} text-blue-300`} />;
    if (code >= 95) return <Zap className={`${size} text-yellow-500`} />;
    return <Cloud className={`${size} text-gray-300`} />;
  };

  const getAirQualityInfo = (aqi) => {
    if (!aqi) return { level: 'Unknown', color: 'bg-gray-500', description: 'No data' };
    if (aqi <= 20) return { level: 'Good', color: 'bg-green-500', description: 'Air quality is excellent' };
    if (aqi <= 40) return { level: 'Fair', color: 'bg-yellow-500', description: 'Air quality is acceptable' };
    if (aqi <= 60) return { level: 'Moderate', color: 'bg-orange-500', description: 'Sensitive groups may experience effects' };
    if (aqi <= 80) return { level: 'Poor', color: 'bg-red-500', description: 'Everyone may experience effects' };
    return { level: 'Very Poor', color: 'bg-purple-600', description: 'Health warning of emergency conditions' };
  };

  const getBackgroundGradient = () => {
    if (!currentWeather) return 'from-blue-400 to-blue-600';

    const isDay = currentWeather.is_day === 1;
    const code = currentWeather.weather_code;

    if (!isDay) return 'from-indigo-900 via-purple-900 to-pink-900';
    if (code === 0 || code === 1) return 'from-sky-400 via-blue-400 to-blue-500';
    if (code === 2 || code === 3) return 'from-gray-400 via-gray-500 to-slate-600';
    if (code >= 61 && code <= 67) return 'from-slate-600 via-slate-700 to-slate-800';
    if (code >= 71 && code <= 77) return 'from-blue-300 via-blue-400 to-cyan-500';
    if (code >= 95) return 'from-gray-700 via-purple-800 to-indigo-900';

    return 'from-blue-400 to-blue-600';
  };

  const getUVIndexInfo = (uv) => {
    if (uv <= 2) return { level: 'Low', color: 'text-green-500' };
    if (uv <= 5) return { level: 'Moderate', color: 'text-yellow-500' };
    if (uv <= 7) return { level: 'High', color: 'text-orange-500' };
    if (uv <= 10) return { level: 'Very High', color: 'text-red-500' };
    return { level: 'Extreme', color: 'text-purple-600' };
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getBackgroundGradient()} transition-all duration-1000 p-4 md:p-6`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-6">
          <div className="text-white mb-4 md:mb-0">
            <h1 className="text-4xl md:text-5xl font-bold drop-shadow-lg flex items-center gap-3">
              <Activity className="w-10 h-10" />
              Weather Pro
            </h1>
            <p className="text-white/80 text-sm mt-1">Powered by Open-Meteo API</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAllWeatherData}
              disabled={loading}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-md p-3 rounded-full transition-all disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
            </button>

            <div className="bg-white/20 backdrop-blur-md rounded-full p-1 flex gap-1">
              <button
                onClick={() => setUnit('celsius')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  unit === 'celsius' ? 'bg-white text-blue-600 shadow-lg' : 'text-white'
                }`}
              >
                °C
              </button>
              <button
                onClick={() => setUnit('fahrenheit')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  unit === 'fahrenheit' ? 'bg-white text-blue-600 shadow-lg' : 'text-white'
                }`}
              >
                °F
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-6 relative">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchLocations(e.target.value);
              }}
              placeholder="Search for any city..."
              className="w-full px-6 py-4 pl-12 rounded-2xl text-lg shadow-2xl focus:outline-none focus:ring-4 focus:ring-white/50 transition-all bg-white/95 backdrop-blur-md"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>

          {suggestions.length > 0 && (
            <div className="absolute w-full mt-2 bg-white rounded-2xl shadow-2xl overflow-hidden z-20 max-h-80 overflow-y-auto">
              {suggestions.map((result, idx) => (
                <button
                  key={idx}
                  onClick={() => selectLocation(result)}
                  className="w-full px-6 py-3 text-left hover:bg-blue-50 transition-colors border-b last:border-b-0 flex items-center gap-3"
                >
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-800">{result.name}</div>
                    <div className="text-sm text-gray-500">
                      {result.admin1 && `${result.admin1}, `}
                      {result.country}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && !currentWeather && (
          <div className="text-center text-white py-20">
            <Loader className="w-16 h-16 mx-auto animate-spin mb-4" />
            <p className="text-xl">Loading weather data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/90 backdrop-blur-md text-white p-6 rounded-2xl shadow-2xl max-w-md mx-auto">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
            <p className="text-center text-lg">{error}</p>
          </div>
        )}

        {currentWeather && !loading && (
          <div className="space-y-6">
            {/* Main Weather Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-6 md:p-8 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 text-white/90 mb-2">
                    <MapPin className="w-6 h-6" />
                    <span className="text-2xl font-semibold">{location.name}</span>
                  </div>
                  <div className="text-white/70 text-sm">
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                <button
                  onClick={getUserLocation}
                  className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition-all"
                  title="Use my location"
                >
                  <Navigation className="w-6 h-6 text-white" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Temperature Display */}
                <div className="flex flex-col items-center justify-center text-center">
                  {getWeatherIcon(currentWeather.weather_code, 'w-32 h-32')}
                  <div className="text-8xl font-bold text-white my-4">
                    {Math.round(currentWeather.temperature_2m)}°
                  </div>
                  <div className="text-2xl text-white/90 capitalize mb-2">
                    {getWeatherDescription(currentWeather.weather_code)}
                  </div>
                  <div className="text-white/80 text-lg">
                    Feels like {Math.round(currentWeather.apparent_temperature)}°
                  </div>
                </div>

                {/* Weather Details Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <WeatherMetric
                    icon={Wind}
                    label="Wind"
                    value={`${Math.round(currentWeather.wind_speed_10m)} ${unit === 'celsius' ? 'km/h' : 'mph'}`}
                    subValue={`${currentWeather.wind_direction_10m}°`}
                  />
                  <WeatherMetric
                    icon={Droplets}
                    label="Humidity"
                    value={`${currentWeather.relative_humidity_2m}%`}
                  />
                  <WeatherMetric
                    icon={Gauge}
                    label="Pressure"
                    value={`${Math.round(currentWeather.pressure_msl)} hPa`}
                  />
                  <WeatherMetric
                    icon={Cloud}
                    label="Cloud Cover"
                    value={`${currentWeather.cloud_cover}%`}
                  />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-1 flex gap-1 overflow-x-auto">
              {['today', '7-day', 'details', 'air-quality'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-white text-blue-600 shadow-lg'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  {tab === 'today' && 'Today'}
                  {tab === '7-day' && '7-Day Forecast'}
                  {tab === 'details' && 'Details'}
                  {tab === 'air-quality' && 'Air Quality'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'today' && (
              <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-6 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Clock className="w-6 h-6" />
                  24-Hour Forecast
                </h2>
                <div className="overflow-x-auto pb-4">
                  <div className="flex gap-4 min-w-max">
                    {hourlyForecast.map((hour, idx) => (
                      <HourlyCard key={idx} data={hour} isFirst={idx === 0} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === '7-day' && (
              <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-6 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Calendar className="w-6 h-6" />
                  7-Day Forecast
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {dailyForecast.map((day, idx) => (
                    <DailyCard key={idx} data={day} isToday={idx === 0} />
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'details' && dailyForecast[0] && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-6 border border-white/20">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Sunrise className="w-6 h-6" />
                    Sun & Moon
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Sunrise className="w-8 h-8 text-orange-300" />
                        <div>
                          <div className="text-white/70 text-sm">Sunrise</div>
                          <div className="text-white text-lg font-semibold">
                            {new Date(dailyForecast[0].sunrise).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Sunset className="w-8 h-8 text-orange-400" />
                        <div>
                          <div className="text-white/70 text-sm">Sunset</div>
                          <div className="text-white text-lg font-semibold">
                            {new Date(dailyForecast[0].sunset).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-6 border border-white/20">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Sun className="w-6 h-6" />
                    UV Index
                  </h3>
                  <div className="text-center">
                    <div className={`text-6xl font-bold mb-2 ${getUVIndexInfo(dailyForecast[0].uvIndex).color}`}>
                      {dailyForecast[0].uvIndex?.toFixed(1) || 0}
                    </div>
                    <div className="text-white text-xl font-semibold mb-2">
                      {getUVIndexInfo(dailyForecast[0].uvIndex).level}
                    </div>
                    <div className="text-white/70 text-sm">
                      {dailyForecast[0].uvIndex > 5 ? 'Wear sunscreen' : 'Protection not required'}
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-6 border border-white/20">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Droplets className="w-6 h-6" />
                    Precipitation
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-white/70">Probability</span>
                      <span className="text-white font-semibold">{dailyForecast[0].precipitation}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Amount</span>
                      <span className="text-white font-semibold">{dailyForecast[0].precipSum?.toFixed(1) || 0} mm</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-6 border border-white/20">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Wind className="w-6 h-6" />
                    Wind Speed
                  </h3>
                  <div className="text-center">
                    <div className="text-5xl font-bold text-white mb-2">
                      {dailyForecast[0].windSpeed}
                    </div>
                    <div className="text-white/70">
                      {unit === 'celsius' ? 'km/h' : 'mph'} max
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'air-quality' && airQuality && (
              <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-6 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Waves className="w-6 h-6" />
                  Air Quality Index
                </h2>

                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-white/70 text-sm mb-1">Overall AQI</div>
                      <div className="text-5xl font-bold text-white">
                        {Math.round(airQuality.european_aqi)}
                      </div>
                    </div>
                    <div className={`${getAirQualityInfo(airQuality.european_aqi).color} px-6 py-3 rounded-2xl`}>
                      <div className="text-white font-bold text-xl">
                        {getAirQualityInfo(airQuality.european_aqi).level}
                      </div>
                    </div>
                  </div>
                  <div className="text-white/80">
                    {getAirQualityInfo(airQuality.european_aqi).description}
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <AirQualityMetric label="PM2.5" value={airQuality.pm2_5?.toFixed(1)} unit="µg/m³" />
                  <AirQualityMetric label="PM10" value={airQuality.pm10?.toFixed(1)} unit="µg/m³" />
                  <AirQualityMetric label="O₃" value={airQuality.ozone?.toFixed(1)} unit="µg/m³" />
                  <AirQualityMetric label="NO₂" value={airQuality.nitrogen_dioxide?.toFixed(1)} unit="µg/m³" />
                  <AirQualityMetric label="SO₂" value={airQuality.sulphur_dioxide?.toFixed(1)} unit="µg/m³" />
                  <AirQualityMetric label="CO" value={airQuality.carbon_monoxide?.toFixed(1)} unit="µg/m³" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const WeatherMetric = ({ icon: Icon, label, value, subValue }) => (
  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-5 h-5 text-white/70" />
      <span className="text-white/70 text-sm">{label}</span>
    </div>
    <div className="text-white text-xl font-bold">{value}</div>
    {subValue && <div className="text-white/60 text-sm mt-1">{subValue}</div>}
  </div>
);

const HourlyCard = ({ data, isFirst }) => {
  const hour = new Date(data.time).getHours();
  const timeStr = isFirst ? 'Now' : `${hour.toString().padStart(2, '0')}:00`;

  return (
    <div className={`bg-white/10 backdrop-blur-sm rounded-2xl p-4 min-w-[120px] text-center border border-white/10 hover:bg-white/15 transition-all ${
      isFirst ? 'ring-2 ring-white/50' : ''
    }`}>
      <div className="text-white/80 font-medium mb-3">{timeStr}</div>
      <div className="flex justify-center mb-3">
        {(() => {
          const Icon = data.weatherCode === 0 || data.weatherCode === 1 ? Sun :
                      data.weatherCode === 2 || data.weatherCode === 3 ? Cloud :
                      data.weatherCode >= 61 && data.weatherCode <= 67 ? CloudRain :
                      data.weatherCode >= 71 && data.weatherCode <= 77 ? CloudSnow :
                      data.weatherCode >= 95 ? Zap : Cloud;
          return <Icon className="w-10 h-10 text-white" />;
        })()}
      </div>
      <div className="text-white text-2xl font-bold mb-2">{data.temp}°</div>
      <div className="flex items-center justify-center gap-1 text-white/70 text-sm mb-2">
        <Droplets className="w-4 h-4" />
        <span>{data.precipitation}%</span>
      </div>
      <div className="flex items-center justify-center gap-1 text-white/70 text-sm">
        <Wind className="w-4 h-4" />
        <span>{data.windSpeed}</span>
      </div>
    </div>
  );
};

const DailyCard = ({ data, isToday }) => {
  const date = new Date(data.date);
  const dayName = isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className={`bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:bg-white/15 transition-all ${
      isToday ? 'ring-2 ring-white/50' : ''
    }`}>
      <div className="text-center mb-3">
        <div className="text-white font-bold text-lg mb-1">{dayName}</div>
        <div className="text-white/70 text-sm">{dateStr}</div>
      </div>

      <div className="flex justify-center mb-4">
        {(() => {
          const Icon = data.weatherCode === 0 || data.weatherCode === 1 ? Sun :
                      data.weatherCode === 2 || data.weatherCode === 3 ? Cloud :
                      data.weatherCode >= 61 && data.weatherCode <= 67 ? CloudRain :
                      data.weatherCode >= 71 && data.weatherCode <= 77 ? CloudSnow :
                      data.weatherCode >= 95 ? Zap : Cloud;
          return <Icon className="w-16 h-16 text-white" />;
        })()}
      </div>

      <div className="flex items-center justify-center gap-3 mb-3">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-5 h-5 text-red-300" />
          <span className="text-white text-xl font-bold">{data.tempMax}°</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingDown className="w-5 h-5 text-blue-300" />
          <span className="text-white/70 text-lg">{data.tempMin}°</span>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between text-white/70">
          <div className="flex items-center gap-1">
            <Droplets className="w-4 h-4" />
            <span>Rain</span>
          </div>
          <span className="font-semibold">{data.precipitation}%</span>
        </div>
        <div className="flex items-center justify-between text-white/70">
          <div className="flex items-center gap-1">
            <Wind className="w-4 h-4" />
            <span>Wind</span>
          </div>
          <span className="font-semibold">{data.windSpeed}</span>
        </div>
        <div className="flex items-center justify-between text-white/70">
          <div className="flex items-center gap-1">
            <Sun className="w-4 h-4" />
            <span>UV</span>
          </div>
          <span className="font-semibold">{data.uvIndex?.toFixed(1) || 0}</span>
        </div>
      </div>
    </div>
  );
};

const AirQualityMetric = ({ label, value, unit }) => (
  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
    <div className="text-white/70 text-sm mb-2">{label}</div>
    <div className="text-white text-2xl font-bold">
      {value || 'N/A'}
    </div>
    {value && <div className="text-white/60 text-xs mt-1">{unit}</div>}
  </div>
);

export default AdvancedWeatherApp;