import React, { useState, useEffect } from 'react';
import { 
  Cloud, Sun, CloudRain, CloudSnow, Eye, Wind, Droplets, Thermometer, 
  MapPin, RefreshCw, AlertCircle, Search, Calendar, Sunrise, Sunset,
  Compass, Gauge, CloudDrizzle, Zap, Snowflake, CloudLightning,
  Navigation, Activity, TrendingUp, TrendingDown, Clock, Star,
  Settings, Info, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';

const WeatherApp = () => {
  // ⚠️ IMPORTANT: Replace with your actual OpenWeatherMap API key
  const API_KEY = 'bd8f424e6954f9eb7c82c13523fe889d'; // 👈 PUT YOUR API KEY HERE
  const BASE_URL = 'https://api.openweathermap.org/data/2.5';

  // Enhanced state management
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [showExtendedForecast, setShowExtendedForecast] = useState(false);
  const [units, setUnits] = useState('metric'); // metric or imperial
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  /**
   * @typedef {Object} AirQualityType
   * @property {number} aqi
   * @property {number} pm25
   * @property {number} pm10
   * @property {number} co
   * @property {number} no2
   * @property {number} o3
   */
  const [airQuality, setAirQuality] = useState(null);
  const [uvIndex, setUvIndex] = useState(null);

  // Enhanced weather icon function with more conditions
  const getWeatherIcon = (condition, code, isLarge = false) => {
    const size = isLarge ? 64 : 24;
    const iconClass = `${isLarge ? 'w-16 h-16' : 'w-6 h-6'} text-white drop-shadow-lg`;
    
    // More detailed weather condition mapping
    if (code >= 200 && code < 300) {
      return <CloudLightning className={iconClass} size={size} />;
    } else if (code >= 300 && code < 400) {
      return <CloudDrizzle className={iconClass} size={size} />;
    } else if (code >= 500 && code < 600) {
      return <CloudRain className={iconClass} size={size} />;
    } else if (code >= 600 && code < 700) {
      return <CloudSnow className={iconClass} size={size} />;
    } else if (code >= 700 && code < 800) {
      return <Cloud className={iconClass} size={size} />;
    } else if (code === 800) {
      return <Sun className={iconClass} size={size} />;
    } else if (code > 800) {
      return <Cloud className={iconClass} size={size} />;
    }
    
    return <Sun className={iconClass} size={size} />;
  };

  // Get weather background gradient based on condition and time
  const getWeatherGradient = (condition, isDay = true) => {
    if (!isDay) {
      return 'from-slate-900 via-blue-900 to-indigo-900';
    }
    
    switch (condition?.toLowerCase()) {
      case 'clear':
      case 'sunny':
        return 'from-blue-400 via-sky-500 to-blue-600';
      case 'cloudy':
      case 'overcast':
        return 'from-slate-500 via-blue-600 to-gray-700';
      case 'rain':
      case 'drizzle':
        return 'from-gray-600 via-blue-700 to-slate-800';
      case 'snow':
        return 'from-blue-200 via-blue-400 to-blue-600';
      case 'thunderstorm':
        return 'from-gray-800 via-blue-900 to-black';
      default:
        return 'from-blue-500 via-blue-600 to-blue-700';
    }
  };

  // Get current location using geolocation API
  const getCurrentLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lon: longitude, name: 'Current Location' });
        fetchWeatherData(latitude, longitude, 'Current Location', '');
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location. ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please allow location access and try again.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
            break;
        }
        setError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  // Search for location by city name using OpenWeatherMap Geocoding API
  const searchLocation = async (cityName) => {
    setSearchLoading(true);
    setError(null);
    
    try {
      // Geocoding API to get coordinates from city name
      const geocodingResponse = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cityName)}&limit=5&appid=${API_KEY}`
      );
      
      if (!geocodingResponse.ok) {
        throw new Error(`Geocoding API error: ${geocodingResponse.status}`);
      }
      
      const geocodingData = await geocodingResponse.json();
      
      if (geocodingData.length === 0) {
        throw new Error('City not found. Please check the spelling and try again.');
      }
      
      // Use the first result
      const foundCity = geocodingData[0];
      const locationData = {
        name: foundCity.name,
        country: foundCity.country,
        state: foundCity.state || '',
        lat: foundCity.lat,
        lon: foundCity.lon
      };
      
      setLocation(locationData);
      await fetchWeatherData(foundCity.lat, foundCity.lon, foundCity.name, foundCity.country);
      setSearchQuery('');
      
    } catch (err) {
      console.error('Search location error:', err);
      setError(err.message || 'Failed to search location. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Fetch real weather data from OpenWeatherMap APIs
  const fetchWeatherData = async (lat, lon, locationName = 'Current Location', country = '') => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch current weather data
      const currentWeatherResponse = await fetch(
        `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units}`
      );
      
      if (!currentWeatherResponse.ok) {
        throw new Error(`Weather API error: ${currentWeatherResponse.status}`);
      }
      
      const currentWeatherData = await currentWeatherResponse.json();
      
      // Fetch 5-day forecast (includes hourly data)
      const forecastResponse = await fetch(
        `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${units}`
      );
      
      if (!forecastResponse.ok) {
        throw new Error(`Forecast API error: ${forecastResponse.status}`);
      }
      
      const forecastData = await forecastResponse.json();
      
      // Fetch air quality data
      let airQualityData = null;
      try {
        const airQualityResponse = await fetch(
          `${BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
        );
        if (airQualityResponse.ok) {
          const airData = await airQualityResponse.json();
          airQualityData = {
            aqi: airData.list[0].main.aqi * 50, // Convert to US AQI scale
            pm25: airData.list[0].components.pm2_5,
            pm10: airData.list[0].components.pm10,
            co: airData.list[0].components.co,
            no2: airData.list[0].components.no2,
            o3: airData.list[0].components.o3
          };
        }
      } catch (airErr) {
        console.warn('Air quality data not available:', airErr);
      }
      
      // Process current weather data
      const processedWeatherData = {
        location: {
          name: locationName,
          country: country || currentWeatherData.sys.country,
          timezone: currentWeatherData.timezone,
          lat: lat,
          lon: lon
        },
        current: {
          temp: Math.round(currentWeatherData.main.temp),
          feels_like: Math.round(currentWeatherData.main.feels_like),
          humidity: currentWeatherData.main.humidity,
          wind_speed: Math.round(currentWeatherData.wind.speed * 3.6), // Convert m/s to km/h
          wind_direction: currentWeatherData.wind.deg || 0,
          visibility: Math.round((currentWeatherData.visibility || 10000) / 1000), // Convert to km
          pressure: currentWeatherData.main.pressure,
          condition: currentWeatherData.weather[0].main.toLowerCase(),
          description: currentWeatherData.weather[0].description,
          code: currentWeatherData.weather[0].id,
          sunrise: new Date(currentWeatherData.sys.sunrise * 1000),
          sunset: new Date(currentWeatherData.sys.sunset * 1000),
          isDay: new Date().getTime() > currentWeatherData.sys.sunrise * 1000 && 
                 new Date().getTime() < currentWeatherData.sys.sunset * 1000
        },
        // Process hourly forecast (next 24 hours)
        hourly: forecastData.list.slice(0, 8).map(item => ({
          time: new Date(item.dt * 1000),
          temp: Math.round(item.main.temp),
          condition: item.weather[0].main.toLowerCase(),
          code: item.weather[0].id,
          humidity: item.main.humidity,
          wind_speed: Math.round(item.wind.speed * 3.6),
          precipitation: item.pop * 100 // Probability of precipitation
        })),
        // Check for weather alerts
        alerts: currentWeatherData.alerts ? currentWeatherData.alerts.map(alert => ({
          title: alert.event,
          description: alert.description,
          severity: alert.severity || 'moderate'
        })) : []
      };
      
      // Process 7-day forecast
      /**
       * @typedef {Object} DailyForecast
       * @property {Date} date
       * @property {number} temp_max
       * @property {number} temp_min
       * @property {string} condition
       * @property {number} code
       * @property {number} humidity
       * @property {number} wind_speed
       * @property {number} precipitation
       * @property {string} description
       */
      /** @type {DailyForecast[]} */
      const dailyForecast = [];
      const processedDays = new Set();
      
      forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toDateString();
        
        if (!processedDays.has(dateKey) && dailyForecast.length < 7) {
          processedDays.add(dateKey);
          
          // Find all forecasts for this day to get min/max temps
          const dayForecasts = forecastData.list.filter(forecast => {
            const forecastDate = new Date(forecast.dt * 1000);
            return forecastDate.toDateString() === dateKey;
          });
          
          const temps = dayForecasts.map(f => f.main.temp);
          const humidity = dayForecasts.map(f => f.main.humidity);
          const windSpeeds = dayForecasts.map(f => f.wind.speed);
          const precipitation = dayForecasts.map(f => f.pop);
      
          dailyForecast.push({
            date: date,
            temp_max: Math.round(Math.max(...temps)),
            temp_min: Math.round(Math.min(...temps)),
            condition: item.weather[0].main.toLowerCase(),
            code: item.weather[0].id,
            humidity: Math.round(humidity.reduce((a, b) => a + b, 0) / humidity.length),
            wind_speed: Math.round((windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length) * 3.6),
            precipitation: Math.round((precipitation.reduce((a, b) => a + b, 0) / precipitation.length) * 100),
            description: item.weather[0].description
          });
        }
      });
      
      // Calculate UV Index (simplified estimation based on weather conditions and time)
      const now = new Date();
      const hour = now.getHours();
      let uvValue = 0;
      
      if (hour >= 10 && hour <= 16 && processedWeatherData.current.condition === 'clear') {
        uvValue = Math.min(10, Math.max(1, 11 - currentWeatherData.clouds.all / 10));
      } else if (hour >= 8 && hour <= 18) {
        uvValue = Math.max(1, 6 - currentWeatherData.clouds.all / 20);
      }
      
      const uvLevels = ['Low', 'Low', 'Low', 'Moderate', 'Moderate', 'Moderate', 'High', 'High', 'Very High', 'Very High', 'Extreme'];
      const uvIndexData = {
        value: Math.round(uvValue),
        level: uvLevels[Math.min(Math.round(uvValue), 10)]
      };

      // Update all state
      setWeatherData(processedWeatherData);
      setForecastData(dailyForecast);
      setAirQuality(airQualityData);
      setUvIndex(uvIndexData);
      setError(null);
      
    } catch (err) {
      console.error('Fetch weather data error:', err);
      setError(err.message || 'Failed to fetch weather data. Please check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Add location to favorites
  const addToFavorites = () => {
    if (location && !favorites.find(fav => fav.name === location.name)) {
      setFavorites([...favorites, location]);
    }
  };

  // Remove from favorites
  const removeFromFavorites = (locationName) => {
    setFavorites(favorites.filter(fav => fav.name !== locationName));
  };

  // Load favorite location
  const loadFavorite = (fav) => {
    setLocation(fav);
    fetchWeatherData(fav.lat, fav.lon, fav.name);
    setShowFavorites(false);
  };

  // Get AQI level and color
  const getAQIInfo = (aqi) => {
    if (aqi <= 50) return { level: 'Good', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (aqi <= 100) return { level: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    if (aqi <= 150) return { level: 'Unhealthy for Sensitive', color: 'text-orange-400', bg: 'bg-orange-500/20' };
    if (aqi <= 200) return { level: 'Unhealthy', color: 'text-red-400', bg: 'bg-red-500/20' };
    return { level: 'Hazardous', color: 'text-purple-400', bg: 'bg-purple-500/20' };
  };

  // Format time
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date
  const formatDate = (date) => {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Get wind direction
  const getWindDirection = (degrees) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(degrees / 45) % 8];
  };

  // Initialize app
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-16 h-16 animate-spin mx-auto mb-6 text-white" />
          <p className="text-2xl font-semibold mb-2">Getting your weather...</p>
          <p className="text-blue-200">Please wait while we fetch the latest data</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 via-blue-700 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-md w-full text-center text-white border border-white/20">
          <AlertCircle className="w-20 h-20 mx-auto mb-6 text-red-300" />
          <h2 className="text-3xl font-bold mb-4">Oops! Something went wrong</h2>
          <p className="mb-8 text-white/90 leading-relaxed">{error}</p>
          <button
            onClick={getCurrentLocation}
            className="bg-blue-600 hover:bg-blue-700 transition-all duration-300 px-8 py-4 rounded-full font-semibold flex items-center gap-3 mx-auto transform hover:scale-105"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const currentGradient = getWeatherGradient(weatherData?.current?.condition, weatherData?.current?.isDay);

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentGradient} transition-all duration-1000`}>
      <div className="min-h-screen bg-blue-900 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header with Search */}
          <div className="text-center py-6">
            <h1 className="text-5xl md:text-6xl font-bold text-yellow-400 mb-4 drop-shadow-lg">
              Weather Forecast
            </h1>
            <p className="text-white/90 text-xl mb-8">
              Your comprehensive weather companion
            </p>

            {/* Search Bar */}
            <div className="max-w-md mx-auto relative">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchQuery.trim() && searchLocation(searchQuery)}
                  placeholder="Search for a city..."
                  className="w-full bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-6 py-4 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all duration-300"
                />
                <button
                  onClick={() => searchQuery.trim() && searchLocation(searchQuery)}
                  disabled={searchLoading || !searchQuery.trim()}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 disabled:opacity-50 p-3 rounded-full transition-all duration-300"
                >
                  {searchLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Weather Alerts */}
          {weatherData?.alerts?.length > 0 && (
            <div className="bg-red-500/20 backdrop-blur-md border border-red-400/50 rounded-3xl p-6 text-white">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-8 h-8 text-red-300 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">{weatherData.alerts[0].title}</h3>
                  <p className="text-white/90">{weatherData.alerts[0].description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Weather Dashboard */}
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Current Weather - Large Card */}
            <div className="lg:col-span-2 bg-white/15 backdrop-blur-lg rounded-3xl p-8 text-white border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <MapPin className="w-7 h-7" />
                  <div>
                    <h2 className="text-3xl font-semibold">{weatherData.location.name}</h2>        
                    <p className="text-white/80 text-lg">{weatherData.location.country}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={addToFavorites}
                    className="bg-white/20 hover:bg-white/30 transition-all duration-300 p-3 rounded-full"
                    title="Add to favorites"
                  >
                    <Star className="w-6 h-6" />
                  </button>
                  <button
                    onClick={getCurrentLocation}
                    className="bg-white/20 hover:bg-white/30 transition-all duration-300 p-3 rounded-full"
                    title="Refresh weather"
                  >
                    <RefreshCw className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 items-center">
                {/* Temperature Display */}
                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-6 mb-6">
                    {getWeatherIcon(weatherData.current.condition, weatherData.current.code, true)}
                    <div>
                      <div className="text-8xl font-light tracking-tight">
                        {weatherData.current.temp}°
                      </div>
                      <div className="text-white/90 capitalize text-xl">
                        {weatherData.current.description}
                      </div>
                    </div>
                  </div>
                  <div className="text-white/80 text-lg">
                    Feels like {weatherData.current.feels_like}°C
                  </div>
                  
                  {/* Sun Times */}
                  <div className="flex items-center gap-6 mt-6">
                    <div className="flex items-center gap-2">
                      <Sunrise className="w-5 h-5 text-yellow-300" />
                      <span className="text-sm">{formatTime(weatherData.current.sunrise)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sunset className="w-5 h-5 text-orange-300" />
                      <span className="text-sm">{formatTime(weatherData.current.sunset)}</span>
                    </div>
                  </div>
                </div>

                {/* Weather Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
                    <Droplets className="w-8 h-8 mx-auto mb-3 text-blue-300" />
                    <div className="text-2xl font-semibold">{weatherData.current.humidity}%</div>
                    <div className="text-white/80 text-sm">Humidity</div>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
                    <Wind className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                    <div className="text-2xl font-semibold">{weatherData.current.wind_speed}</div>
                    <div className="text-white/80 text-sm">km/h {getWindDirection(weatherData.current.wind_direction)}</div>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
                    <Eye className="w-8 h-8 mx-auto mb-3 text-green-300" />
                    <div className="text-2xl font-semibold">{weatherData.current.visibility}</div>
                    <div className="text-white/80 text-sm">km</div>
                  </div>
                  <div className="bg-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
                    <Gauge className="w-8 h-8 mx-auto mb-3 text-purple-300" />
                    <div className="text-2xl font-semibold">{weatherData.current.pressure}</div>
                    <div className="text-white/80 text-sm">hPa</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Side Panel - Air Quality & UV Index */}
            <div className="space-y-6">
              {/* Air Quality */}
              {airQuality && (
                <div className="bg-white/15 backdrop-blur-lg rounded-3xl p-6 text-white border border-white/20">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-3">
                    <Activity className="w-6 h-6" />
                    Air Quality
                  </h3>
                  <div className={`${getAQIInfo(airQuality.aqi).bg} rounded-2xl p-4 mb-4`}>
                    <div className="text-3xl font-bold mb-1">{airQuality.aqi}</div>
                    <div className={`${getAQIInfo(airQuality.aqi).color} font-medium`}>
                      {getAQIInfo(airQuality.aqi).level}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>PM2.5</span>
                      <span>{airQuality.pm25} μg/m³</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PM10</span>
                      <span>{airQuality.pm10} μg/m³</span>
                    </div>
                  </div>
                </div>
              )}

              {/* UV Index */}
              {uvIndex && (
                <div className="bg-white/15 backdrop-blur-lg rounded-3xl p-6 text-white border border-white/20">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-3">
                    <Sun className="w-6 h-6" />
                    UV Index
                  </h3>
                  <div className="bg-yellow-500/20 rounded-2xl p-4">
                    <div className="text-3xl font-bold mb-1">{uvIndex.value}</div>
                    <div className="text-yellow-300 font-medium">{uvIndex.level}</div>
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="bg-white/15 backdrop-blur-lg rounded-3xl p-6 text-white border border-white/20">
                <h3 className="text-xl font-semibold mb-4">Quick Stats</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Compass className="w-4 h-4" />
                      Wind Direction
                    </span>
                    <span>{getWindDirection(weatherData.current.wind_direction)} ({weatherData.current.wind_direction}°)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Navigation className="w-4 h-4" />
                      Coordinates
                    </span>
                    <span>{weatherData.location.lat.toFixed(2)}, {weatherData.location.lon.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hourly Forecast */}
          <div className="bg-white/15 backdrop-blur-lg rounded-3xl p-6 text-white border border-white/20">
            <h3 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <Clock className="w-7 h-7" />
              24-Hour Forecast
            </h3>
            
            <div className="overflow-x-auto">
              <div className="flex gap-4 pb-4" style={{ minWidth: 'max-content' }}>
                {weatherData.hourly.slice(0, 24).map((hour, index) => (
                  <div
                    key={index}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center min-w-[120px] hover:bg-white/20 transition-all duration-300 border border-white/10"
                  >
                    <div className="text-white/80 text-sm mb-3">
                      {index === 0 ? 'Now' : formatTime(hour.time)}
                    </div>
                    <div className="flex justify-center mb-3">
                      {getWeatherIcon(hour.condition, hour.code)}
                    </div>
                    <div className="text-xl font-semibold mb-2">
                      {hour.temp}°
                    </div>
                    <div className="text-xs text-white/70 space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <Droplets className="w-3 h-3" />
                        <span>{hour.humidity}%</span>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <Wind className="w-3 h-3" />
                        <span>{hour.wind_speed}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 7-Day Forecast */}
          <div className="bg-white/15 backdrop-blur-lg rounded-3xl p-6 text-white border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold flex items-center gap-3">
                <Calendar className="w-7 h-7" />
                7-Day Forecast
              </h3>
              <button
                onClick={() => setShowExtendedForecast(!showExtendedForecast)}
                className="bg-white/20 hover:bg-white/30 transition-all duration-300 px-4 py-2 rounded-full flex items-center gap-2"
              >
                {showExtendedForecast ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showExtendedForecast ? 'Show Less' : 'Show More'}
              </button>
            </div>

            <div className="space-y-4">
              {forecastData?.slice(0, showExtendedForecast ? 7 : 3).map((day, index) => (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/20 transition-all duration-300 border border-white/10"
                >
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-4 items-center">
                    <div className="col-span-2 md:col-span-1">
                      <div className="font-semibold">
                        {index === 0 ? 'Today' : formatDate(day.date)}
                      </div>
                      <div className="text-sm text-white/70 capitalize">
                        {day.description}
                      </div>
                    </div>
                    
                    <div className="flex justify-center">
                      {getWeatherIcon(day.condition, day.code)}
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <TrendingUp className="w-4 h-4 text-red-300" />
                        <span className="font-semibold">{day.temp_max}°</span>
                      </div>
                      <div className="flex items-center gap-2 justify-center">
                        <TrendingDown className="w-4 h-4 text-blue-300" />
                        <span className="text-white/70">{day.temp_min}°</span>
                      </div>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-2 justify-center">
                      <Droplets className="w-4 h-4 text-blue-300" />
                      <span className="text-sm">{day.humidity}%</span>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-2 justify-center">
                      <Wind className="w-4 h-4 text-gray-300" />
                      <span className="text-sm">{day.wind_speed} km/h</span>
                    </div>
                    
                    <div className="flex items-center gap-2 justify-center">
                      <CloudRain className="w-4 h-4 text-blue-400" />
                      <span className="text-sm">{Math.round(day.precipitation)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Favorites Section */}
          {favorites.length > 0 && (
            <div className="bg-white/15 backdrop-blur-lg rounded-3xl p-6 text-white border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold flex items-center gap-3">
                  <Star className="w-7 h-7" />
                  Favorite Locations ({favorites.length})
                </h3>
                <button
                  onClick={() => setShowFavorites(!showFavorites)}
                  className="bg-white/20 hover:bg-white/30 transition-all duration-300 px-4 py-2 rounded-full flex items-center gap-2"
                >
                  {showFavorites ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showFavorites ? 'Hide' : 'Show'}
                </button>
              </div>

              {showFavorites && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favorites.map((fav, index) => (
                    <div
                      key={index}
                      className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/20 transition-all duration-300 border border-white/10 cursor-pointer"
                      onClick={() => loadFavorite(fav)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{fav.name}</div>
                          <div className="text-sm text-white/70">{fav.country}</div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromFavorites(fav.name);
                          }}
                          className="text-red-300 hover:text-red-200 transition-colors duration-300"
                          title="Remove from favorites"
                        >
                          <Star className="w-5 h-5 fill-current" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings Panel */}
          <div className="bg-white/15 backdrop-blur-lg rounded-3xl p-6 text-white border border-white/20">
            <h3 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <Settings className="w-7 h-7" />
              Settings & Preferences
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Units Toggle */}
              <div className="space-y-3">
                <label className="text-lg font-medium">Temperature Units</label>
                <div className="flex bg-white/10 rounded-full p-1">
                  <button
                    onClick={() => setUnits('metric')}
                    className={`flex-1 py-2 px-4 rounded-full transition-all duration-300 ${
                      units === 'metric' 
                        ? 'bg-blue-500 text-white shadow-lg' 
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    Celsius (°C)
                  </button>
                  <button
                    onClick={() => setUnits('imperial')}
                    className={`flex-1 py-2 px-4 rounded-full transition-all duration-300 ${
                      units === 'imperial' 
                        ? 'bg-blue-500 text-white shadow-lg' 
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    Fahrenheit (°F)
                  </button>
                </div>
              </div>

              {/* Additional Settings */}
              <div className="space-y-3">
                <label className="text-lg font-medium">Quick Actions</label>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-white/10 hover:bg-white/20 transition-all duration-300 px-4 py-2 rounded-full flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh All
                  </button>
                  <button
                    onClick={() => setFavorites([])}
                    className="bg-white/10 hover:bg-white/20 transition-all duration-300 px-4 py-2 rounded-full flex items-center gap-2"
                  >
                    <Star className="w-4 h-4" />
                    Clear Favorites
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Weather Tips & Information */}
          <div className="bg-white/15 backdrop-blur-lg rounded-3xl p-6 text-white border border-white/20">
            <h3 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <Info className="w-7 h-7" />
              Weather Tips & Information
            </h3>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-blue-300">Today's Recommendations</h4>
                <div className="space-y-2 text-sm">
                  {weatherData?.current?.temp > 25 && (
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4 text-yellow-400" />
                      <span>Hot day - stay hydrated and use sunscreen</span>
                    </div>
                  )}
                  {weatherData?.current?.humidity > 70 && (
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-blue-400" />
                      <span>High humidity - dress in breathable fabrics</span>
                    </div>
                  )}
                  {weatherData?.current?.wind_speed > 20 && (
                    <div className="flex items-center gap-2">
                      <Wind className="w-4 h-4 text-gray-400" />
                      <span>Windy conditions - secure loose items</span>
                    </div>
                  )}
                  {uvIndex?.value > 6 && (
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4 text-orange-400" />
                      <span>High UV - limit sun exposure</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-green-300">Air Quality Info</h4>
                <div className="text-sm space-y-2">
                  <p>Current AQI: <span className={getAQIInfo(airQuality?.aqi || 50).color}>{getAQIInfo(airQuality?.aqi || 50).level}</span></p>
                  <p className="text-white/70">
                    Air quality is measured by the concentration of pollutants including PM2.5, PM10, and various gases.
                  </p>
                  {airQuality?.aqi > 100 && (
                    <p className="text-orange-300">
                      Consider limiting outdoor activities if you have respiratory conditions.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-purple-300">Weather Facts</h4>
                <div className="text-sm space-y-2 text-white/80">
                  <p>• Humidity affects how hot it feels</p>
                  <p>• Wind chill makes it feel colder</p>
                  <p>• UV index peaks around midday</p>
                  <p>• Atmospheric pressure affects weather patterns</p>
                  <p>• Visibility can be reduced by fog, rain, or pollution</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center py-8">
            <div className="space-y-4">
              <p className="text-white/80 text-lg">
                🌤️ Weather data updates automatically every hour
              </p>
              <p className="text-white/60">
                Built with React, Tailwind CSS, and comprehensive weather APIs
              </p>
              <div className="flex justify-center items-center gap-6 text-white/60 text-sm">
                <span>© 2025 Weather Forecast App</span>
                <span>•</span>
                <span>Powered by OpenWeatherMap API</span>
                <span>•</span>
                <span>Real-time data & forecasts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherApp;
                