import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Helmet } from 'react-helmet-async';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Autocomplete, Polyline } from '@react-google-maps/api';
import { MapPin, Navigation, Search, Shield, AlertTriangle, CheckCircle, Info, Share2, Lightbulb, Phone, Siren, Hospital, Maximize2, Minimize2, UserPlus, Trash2, X, Bike } from 'lucide-react';

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ['places', 'geometry'];
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { analyzeRouteSafety, getIncidentDetails, IncidentDetail } from '@/services/navigation';
import { API_BASE_URL, API_KEY } from '@/config';

// ─── Types ────────────────────────────────────────────────────────────────────

type TravelMode = 'CAR' | 'TWO_WHEELER';

interface TrustedContact {
  name: string;
  phone: string;
}

interface EmergencyPlace {
  name: string;
  address: string;
  formatted_phone_number: string;
}

interface EmergencySupport {
  police: EmergencyPlace;
  hospital: EmergencyPlace;
}

interface DerivedRiskSummary {
  primary_risk_factors: string[];
}

interface AICrimeAnalysis {
  incidents: IncidentDetail[];
  derived_risk_summary: DerivedRiskSummary;
}

interface MergedRoute extends google.maps.DirectionsRoute {
  safety_score: number;
  safetyScore: number;
  risk_level?: string;
  incident_count?: number;
  incident_ids?: number[];
  route_name?: string;
  aiCrimeAnalysis: AICrimeAnalysis;
  emergencySupport: EmergencySupport;
  overview_path: google.maps.LatLng[];
}

interface SafetyRouteData {
  routes?: Array<{
    safety_score?: number;
    risk_level?: string;
    incident_count?: number;
    incident_ids?: number[];
    route_name?: string;
  }>;
  safest_route?: string;
}

interface RiskLabel {
  label: string;
  color: string;
  status: string;
}

interface TimeRiskWarning {
  show: boolean;
  level: 'high' | 'moderate' | 'low';
  message: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const safetyTips: string[] = [
  "Share your live location with a trusted contact.",
  "Keep emergency contacts easily accessible.",
  "Prefer well-lit and populated routes.",
  "Trust your instincts — if something feels wrong, seek help.",
  "Keep your phone charged and carry a power bank.",
  "Note landmarks along your route for easier navigation.",
];

// ─── Component ────────────────────────────────────────────────────────────────

const CheckRoute: React.FC = () => {
  const [fromLocation, setFromLocation] = useState<string>('');
  const [toLocation, setToLocation] = useState<string>('');
  const [travelMode, setTravelMode] = useState<TravelMode>('CAR');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [routeResult, setRouteResult] = useState<MergedRoute | null>(null);
  const [allRoutes, setAllRoutes] = useState<MergedRoute[]>([]);
  const [error, setError] = useState<string>('');
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  const [originAutocomplete, setOriginAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [destAutocomplete, setDestAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [sosActive, setSosActive] = useState<boolean>(false);
  const [trackingInterval, setTrackingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Trusted Contacts
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [trustedContacts, setTrustedContacts] = useState<TrustedContact[]>([]);
  const [newContactName, setNewContactName] = useState<string>('');
  const [newContactPhone, setNewContactPhone] = useState<string>('');
  const [showAllIncidents, setShowAllIncidents] = useState<boolean>(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

  // Load contacts from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('raksha_trusted_contacts');
    if (saved) {
      try {
        setTrustedContacts(JSON.parse(saved) as TrustedContact[]);
      } catch {
        // ignore malformed data
      }
    }
  }, []);

  const addContact = (): void => {
    if (newContactName && newContactPhone) {
      const updated: TrustedContact[] = [...trustedContacts, { name: newContactName, phone: newContactPhone }];
      setTrustedContacts(updated);
      localStorage.setItem('raksha_trusted_contacts', JSON.stringify(updated));
      setNewContactName('');
      setNewContactPhone('');
    }
  };

  const removeContact = (index: number): void => {
    const updated = trustedContacts.filter((_, i) => i !== index);
    setTrustedContacts(updated);
    localStorage.setItem('raksha_trusted_contacts', JSON.stringify(updated));
  };

  const onLoad = React.useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = React.useCallback((_mapInstance: google.maps.Map) => {
    setMap(null);
  }, []);

  // Fit map bounds to selected route
  useEffect(() => {
    if (map && routeResult) {
      const bounds = new window.google.maps.LatLngBounds();
      if (routeResult.overview_path) {
        routeResult.overview_path.forEach((point) => bounds.extend(point));
      } else if (routeResult.overview_polyline) {
        const encoded =
          typeof routeResult.overview_polyline === 'string'
            ? routeResult.overview_polyline
            : (routeResult.overview_polyline as google.maps.DirectionsPolyline).points;
        window.google.maps.geometry.encoding.decodePath(encoded).forEach((p) => bounds.extend(p));
      }
      map.fitBounds(bounds);
    }
  }, [map, routeResult, isFullScreen]);

  const fetchCurrentLocation = (): void => {
    if (!navigator.geolocation || !window.google) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocationAccuracy(accuracy);

        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode(
          { location: { lat: latitude, lng: longitude } },
          (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
              const getPrecisionScore = (res: google.maps.GeocoderResult): number => {
                const types = res.types;
                if (types.includes('street_address') || types.includes('premise') || types.includes('subpremise')) return 3;
                if (types.includes('route') || types.includes('plus_code')) return 2;
                if (types.includes('neighborhood') || types.includes('political')) return 1;
                return 0;
              };
              const sorted = [...results].sort((a, b) => getPrecisionScore(b) - getPrecisionScore(a));
              setFromLocation(
                getPrecisionScore(sorted[0]) >= 1 ? sorted[0].formatted_address : results[0].formatted_address
              );
            } else {
              setFromLocation(`${latitude},${longitude}`);
            }
          }
        );
      },
      (err) => {
        console.error('Error getting location:', err);
        alert('Could not get your location. Please ensure location services are enabled.');
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (isLoaded) fetchCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  const onOriginLoad = (ac: google.maps.places.Autocomplete): void => setOriginAutocomplete(ac);
  const onOriginPlaceChanged = (): void => {
    if (originAutocomplete) {
      const place = originAutocomplete.getPlace();
      setFromLocation(place.formatted_address || place.name || '');
    }
  };

  const onDestLoad = (ac: google.maps.places.Autocomplete): void => setDestAutocomplete(ac);
  const onDestPlaceChanged = (): void => {
    if (destAutocomplete) {
      const place = destAutocomplete.getPlace();
      setToLocation(place.formatted_address || place.name || '');
    }
  };

  /** Maps our TravelMode to Google Maps TravelMode */
  const getGoogleTravelMode = (): google.maps.TravelMode => {
    // Two-wheelers use DRIVING mode (closest proxy in Google Maps)
    return window.google.maps.TravelMode.DRIVING;
  };

  /** Two-wheeler specific: prefer shorter/faster routes, avoid highways */
  const getTwoWheelerRouteModifiers = () => ({
    avoidHighways: true,
    avoidTolls: true,
  });

  const handleCheckRoute = async (): Promise<void> => {
    if (!fromLocation || !toLocation || !isLoaded || !window.google) return;

    setIsAnalyzing(true);
    setError('');
    setShowResults(false);
    setDirectionsResponse(null);

    try {
      const directionsService = new window.google.maps.DirectionsService();

      const routeRequest: google.maps.DirectionsRequest = {
        origin: fromLocation,
        destination: toLocation,
        travelMode: getGoogleTravelMode(),
        provideRouteAlternatives: true,
        ...(travelMode === 'TWO_WHEELER' ? getTwoWheelerRouteModifiers() : {}),
      };

      const googleResults = await directionsService.route(routeRequest);
      setDirectionsResponse(googleResults);

      const safetyData = (await analyzeRouteSafety(fromLocation, toLocation)) as SafetyRouteData;

      if (!googleResults.routes?.length) {
        setError('No routes found by Google Maps.');
        return;
      }

      // Collect all incident IDs
      let allIncidentIds: number[] = [];
      safetyData.routes?.forEach((r) => {
        if (r.incident_ids) allIncidentIds = [...allIncidentIds, ...r.incident_ids];
      });

      const incidentDetailsMap: Record<number, IncidentDetail> = {};
      if (allIncidentIds.length > 0) {
        try {
          const uniqueIds = [...new Set(allIncidentIds)];
          const details = await getIncidentDetails(uniqueIds);
          details.forEach((d) => {
            incidentDetailsMap[Number(d.id)] = d;
          });
        } catch (e) {
          console.warn('Failed to fetch incident details', e);
        }
      }

      // Default emergency data
      const emergencyData: EmergencySupport = {
        police: { name: 'Local Police', address: 'Nearby', formatted_phone_number: '100' },
        hospital: { name: 'City Hospital', address: 'Nearby', formatted_phone_number: '108' },
      };

      try {
        const firstRoute = googleResults.routes[0];
        const legs = firstRoute.legs;
        if (legs?.length) {
          const destLoc = legs[legs.length - 1].end_location;

          const fetchPlace = (type: string, keyword: string): Promise<google.maps.places.PlaceResult | null> =>
            new Promise((resolve) => {
              const service = new window.google.maps.places.PlacesService(document.createElement('div'));
              service.nearbySearch(
                { location: destLoc, radius: 3000, type, keyword },
                (results, status) => {
                  if (status === window.google.maps.places.PlacesServiceStatus.OK && results?.length) {
                    resolve(results[0]);
                  } else {
                    resolve(null);
                  }
                }
              );
            });

          const [policePlace, hospitalPlace] = await Promise.all([
            fetchPlace('police', 'police station'),
            fetchPlace('hospital', 'hospital'),
          ]);

          if (policePlace) {
            emergencyData.police = {
              name: policePlace.name ?? 'Nearest Police Station',
              address: policePlace.vicinity ?? policePlace.formatted_address ?? 'Location Verified',
              formatted_phone_number: '100',
            };
          }
          if (hospitalPlace) {
            emergencyData.hospital = {
              name: hospitalPlace.name ?? 'Nearest Hospital',
              address: hospitalPlace.vicinity ?? hospitalPlace.formatted_address ?? 'Location Verified',
              formatted_phone_number: '108',
            };
          }
        }
      } catch (e) {
        console.error('Error fetching emergency places', e);
      }

      const mergedRoutes: MergedRoute[] = googleResults.routes.map((gRoute, index) => {
        const sRoute = safetyData.routes?.[index] ?? {
          safety_score: 70,
          risk_level: 'Moderate',
          incident_count: 0,
          incident_ids: [],
        };

        const routeIncidents: IncidentDetail[] = (sRoute.incident_ids ?? [])
          .map((id) => incidentDetailsMap[id])
          .filter((d): d is IncidentDetail => Boolean(d));

        // For two-wheelers, apply a slight safety score penalty for highway-heavy routes
        // (heuristic: longer duration relative to distance = more highway usage)
        let adjustedSafetyScore = sRoute.safety_score ?? 70;
        if (travelMode === 'TWO_WHEELER') {
          const leg = gRoute.legs?.[0];
          if (leg) {
            const distKm = (leg.distance?.value ?? 0) / 1000;
            const durationMin = (leg.duration?.value ?? 0) / 60;
            // If average speed > 60 km/h, likely highway-heavy — reduce safety for two-wheelers
            const avgSpeed = distKm / (durationMin / 60);
            if (avgSpeed > 60) adjustedSafetyScore = Math.max(0, adjustedSafetyScore - 10);
          }
        }

        return {
          ...gRoute,
          safety_score: adjustedSafetyScore,
          safetyScore: adjustedSafetyScore,
          risk_level: sRoute.risk_level,
          incident_count: sRoute.incident_count,
          incident_ids: sRoute.incident_ids,
          route_name: sRoute.route_name,
          aiCrimeAnalysis: {
            incidents: routeIncidents,
            derived_risk_summary: {
              primary_risk_factors: [sRoute.risk_level ?? 'General Caution'],
            },
          },
          emergencySupport: emergencyData,
        } as MergedRoute;
      });

      setAllRoutes(mergedRoutes);
      const safestNamed = mergedRoutes.find((r) => r.route_name === safetyData.safest_route);
      setRouteResult(safestNamed ?? mergedRoutes[0]);
      setShowResults(true);
    } catch (err) {
      console.error(err);
      setError('Failed to analyze route. Is the backend running?');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleShareLocation = async (): Promise<void> => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Live Location',
          text: `I'm travelling from ${fromLocation} to ${toLocation}. Track my safety status on Raksha.`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      alert('Live location link copied to clipboard!');
    }
  };

  const notifyTrustedContacts = (message: string): void => {
    if (!trustedContacts.length) return;
    trustedContacts.forEach((contact) => {
      const phone = contact.phone.replace(/\D/g, '');
      const encodedMsg = encodeURIComponent(`Hi ${contact.name}, ${message}`);
      window.open(`https://wa.me/${phone}?text=${encodedMsg}`, '_blank');
    });
  };

  const handleSOS = async (): Promise<void> => {
    setSosActive(true);
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const locationLink = `https://www.google.com/maps?q=${latitude},${longitude}`;

        try {
          await fetch(`${API_BASE_URL}/sos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
            body: JSON.stringify({
              lat: latitude,
              lng: longitude,
              timestamp: new Date().toISOString(),
              route: routeResult?.summary,
            }),
          });
        } catch (e) {
          console.error(e);
        }

        const sosMsg = `🚨 *EMERGENCY SOS* 🚨\nI need help!\nMy Location: ${locationLink}\nRoute: ${fromLocation} to ${toLocation}`;
        notifyTrustedContacts(sosMsg);

        if (navigator.share) {
          try {
            await navigator.share({ title: '🚨 EMERGENCY', text: sosMsg, url: locationLink });
          } catch (e) {
            console.log(e);
          }
        } else {
          alert(`Emergency alert sent to ${trustedContacts.length} contacts! Calling Police...`);
          window.location.href = 'tel:100';
        }
      },
      (err) => console.error('SOS location error:', err),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const startTracking = (): void => {
    if (!routeResult?.overview_polyline) return;
    setIsTracking(true);

    notifyTrustedContacts(
      `🛡️ I've started a journey on Raksha.\nMode: ${travelMode === 'TWO_WHEELER' ? '🏍️ Two-Wheeler' : '🚗 Car'}\nRoute: ${fromLocation} to ${toLocation}.\nTrack my safety status here: ${window.location.href}`
    );

    const interval = setInterval(() => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const polylineStr =
              typeof routeResult.overview_polyline === 'string'
                ? routeResult.overview_polyline
                : (routeResult.overview_polyline as google.maps.DirectionsPolyline).points;

            const response = await fetch(`${API_BASE_URL}/track`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
              body: JSON.stringify({ currentLat: latitude, currentLng: longitude, routePolyline: polylineStr }),
            });

            const data = (await response.json()) as { needsReroute?: boolean; distanceFromRoute?: number };

            if (data.needsReroute) {
              const shouldReroute = confirm(
                `⚠️ You've deviated ${Math.round(data.distanceFromRoute ?? 0)}m from the safe route.\n\nWould you like to recalculate?`
              );
              if (shouldReroute) {
                stopTracking();
                handleCheckRoute();
              }
            }
          } catch (trackErr) {
            console.error('Tracking error:', trackErr);
          }
        },
        (err) => console.error('Tracking location error:', err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }, 10000);

    setTrackingInterval(interval);
  };

  const stopTracking = (): void => {
    setIsTracking(false);
    if (trackingInterval) {
      clearInterval(trackingInterval);
      setTrackingInterval(null);
    }
  };

  useEffect(() => {
    return () => {
      if (trackingInterval) clearInterval(trackingInterval);
    };
  }, [trackingInterval]);

  const getTimeRiskWarning = (): TimeRiskWarning => {
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) {
      return { show: true, level: 'high', message: 'Night Travel: Reduced safety score due to low visibility and fewer people' };
    } else if ((hour >= 18 && hour < 22) || (hour >= 6 && hour < 8)) {
      return { show: true, level: 'moderate', message: 'Evening/Early Morning: Moderate risk period - stay alert' };
    }
    return { show: false, level: 'low', message: '' };
  };

  const getRiskLabel = (score: number): RiskLabel => {
    if (score >= 80) return { label: 'LOW RISK', color: 'text-brand-teal', status: 'Safe Route' };
    if (score >= 50) return { label: 'MODERATE', color: 'text-yellow-500', status: 'Caution Advised' };
    return { label: 'HIGH RISK', color: 'text-red-500', status: 'Avoid if possible' };
  };

  const getPolylinePath = (route: MergedRoute): google.maps.LatLng[] => {
    if (route.overview_path) return route.overview_path;
    const encoded =
      typeof route.overview_polyline === 'string'
        ? route.overview_polyline
        : (route.overview_polyline as google.maps.DirectionsPolyline).points;
    return window.google.maps.geometry.encoding.decodePath(encoded);
  };

  // ─── Map Content ────────────────────────────────────────────────────────────

  const mapContent = (
    <div
      className={`${isFullScreen ? 'lg:col-span-5 h-[85vh]' : 'lg:col-span-3'} bg-white/5 rounded-3xl overflow-hidden border border-white/10 shadow-lg flex flex-col relative group transition-all duration-500`}
    >
      {/* Badge */}
      <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-brand-teal" />
        <span className="text-xs font-bold text-white">Route Preview</span>
        {travelMode === 'TWO_WHEELER' && (
          <span className="bg-brand-purple/30 border border-brand-purple/40 text-brand-purple text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">
            2-Wheeler
          </span>
        )}
      </div>

      {/* Full Screen Toggle */}
      <button
        onClick={() => setIsFullScreen(!isFullScreen)}
        className="absolute top-4 right-4 z-10 bg-black/60 backdrop-blur p-2 rounded-full border border-white/10 text-white/80 hover:bg-brand-teal hover:text-white transition-colors"
      >
        {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
      </button>

      {/* Tracking Indicator */}
      {isTracking && (
        <div className="absolute top-16 right-4 z-10 bg-green-500/90 backdrop-blur px-3 py-2 rounded-full border border-green-400 flex items-center gap-2 animate-pulse">
          <div className="w-2 h-2 bg-white rounded-full animate-ping" />
          <span className="text-xs font-bold text-white">Live Tracking Active</span>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 min-h-[400px] relative bg-white/5">
        {isLoaded && directionsResponse ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={{ lat: 28.6139, lng: 77.209 }}
            zoom={12}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
              mapId: '4f6ea60a12e3432',
              disableDefaultUI: true,
              zoomControl: true,
              styles: [
                { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
                { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
                { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
                { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
                { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
                { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
                { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
              ],
            }}
          >
            <DirectionsRenderer
              directions={directionsResponse}
              options={{
                polylineOptions: {
                  strokeColor: showResults && routeResult ? '#555555' : '#2dd4bf',
                  strokeOpacity: showResults && routeResult ? 0.3 : 0.8,
                  strokeWeight: 6,
                },
                suppressMarkers: !!showResults,
                preserveViewport: !!showResults,
              }}
            />

            {showResults && routeResult && (
              <Polyline
                path={getPolylinePath(routeResult)}
                options={{
                  strokeColor:
                    getRiskLabel(routeResult.safetyScore).color === 'text-brand-teal'
                      ? '#2dd4bf'
                      : getRiskLabel(routeResult.safetyScore).color === 'text-yellow-500'
                      ? '#eab308'
                      : '#ef4444',
                  strokeOpacity: 1,
                  strokeWeight: 8,
                }}
              />
            )}
          </GoogleMap>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-brand-teal border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Compact route info overlay */}
        <div className="absolute bottom-6 right-6 bg-black/90 backdrop-blur-xl rounded-2xl p-5 border border-white/10 shadow-2xl pointer-events-none">
          <div className="text-right">
            <p className="text-brand-teal font-bold text-3xl leading-none tracking-tight">
              {routeResult?.legs?.[0]?.duration?.text ?? '~25 min'}
            </p>
            <div className="flex items-center justify-end gap-2 mt-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  getRiskLabel(routeResult?.safety_score ?? 0).color.replace('text-', 'bg-')
                }`}
              />
              <p
                className={`text-xs font-bold uppercase tracking-wider ${getRiskLabel(routeResult?.safety_score ?? 0).color}`}
              >
                {getRiskLabel(routeResult?.safety_score ?? 0).status}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <Helmet>
        <title>Check Route Safety | MargSathi</title>
        <meta name="description" content="Prioritize safety over speed. Analyze route safety with MargSathi." />
      </Helmet>

      <div className="min-h-screen bg-brand-dark flex flex-col font-sans text-white selection:bg-brand-teal/30">
        <Navbar />

        <main className="flex-1 pt-24 md:pt-32 pb-20">

          {/* Header */}
          <section className="container px-4 mb-12">
            <div className="max-w-4xl mx-auto text-center">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
              >
                Not just the fastest route <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-teal to-brand-purple">
                  — the safest one.
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg text-white/60 max-w-2xl mx-auto mb-8"
              >
                Lighting • Crowd presence • Area risk patterns • Time of travel
              </motion.p>
            </div>
          </section>

          {/* Input Section */}
          <section className="container px-4 mb-16 relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="max-w-3xl mx-auto"
            >
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 md:p-10 border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-purple/5 rounded-full blur-3xl -z-10" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-teal/5 rounded-full blur-3xl -z-10" />

                <div className="space-y-8">

                  {/* ── Travel Mode Selector ── */}
                  <div>
                    <label className="text-xs uppercase tracking-wider text-white/40 font-bold mb-3 block">
                      Travel Mode
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Car */}
                      <button
                        onClick={() => setTravelMode('CAR')}
                        className={`flex items-center justify-center gap-3 h-14 rounded-2xl border font-bold text-sm transition-all duration-200 ${
                          travelMode === 'CAR'
                            ? 'bg-brand-teal/20 border-brand-teal text-brand-teal shadow-[0_0_20px_rgba(45,212,191,0.2)]'
                            : 'bg-black/20 border-white/10 text-white/50 hover:bg-white/5 hover:text-white/70'
                        }`}
                      >
                        {/* inline car SVG */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-3" />
                          <circle cx="7.5" cy="17.5" r="2.5" />
                          <circle cx="17.5" cy="17.5" r="2.5" />
                        </svg>
                        Car / Cab
                      </button>

                      {/* Two-Wheeler */}
                      <button
                        onClick={() => setTravelMode('TWO_WHEELER')}
                        className={`flex items-center justify-center gap-3 h-14 rounded-2xl border font-bold text-sm transition-all duration-200 ${
                          travelMode === 'TWO_WHEELER'
                            ? 'bg-brand-purple/20 border-brand-purple text-brand-purple shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                            : 'bg-black/20 border-white/10 text-white/50 hover:bg-white/5 hover:text-white/70'
                        }`}
                      >
                        <Bike className="w-5 h-5" />
                        Two-Wheeler
                      </button>
                    </div>

                    {/* Two-wheeler safety notice */}
                    {travelMode === 'TWO_WHEELER' && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 flex items-start gap-2 p-3 bg-brand-purple/10 border border-brand-purple/20 rounded-xl"
                      >
                        <AlertTriangle className="w-4 h-4 text-brand-purple mt-0.5 shrink-0" />
                        <p className="text-xs text-brand-purple/80 leading-relaxed">
                          <strong>Two-Wheeler mode:</strong> Routes avoid highways & tolls. Safety scores factor in road surface risk and visibility for riders.
                        </p>
                      </motion.div>
                    )}
                  </div>

                  {/* Timeline Inputs */}
                  <div className="relative">
                    <div className="absolute left-[1.65rem] top-8 bottom-8 w-0.5 bg-gradient-to-b from-brand-teal/50 via-white/10 to-brand-purple/50 md:left-8" />

                    {/* From */}
                    <div className="relative flex items-center gap-4 md:gap-6 mb-8">
                      <div className="w-14 h-14 md:w-16 md:h-16 bg-black/40 rounded-2xl flex items-center justify-center border border-white/10 flex-shrink-0 z-10">
                        <div className="w-3 h-3 bg-brand-teal rounded-full animate-pulse shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs uppercase tracking-wider text-white/40 font-bold block ml-1">
                            Start Location
                          </label>
                          {locationAccuracy !== null && (
                            <span className="text-[10px] uppercase font-bold text-brand-teal animate-pulse">
                              Accuracy: ±{Math.round(locationAccuracy)}m
                            </span>
                          )}
                        </div>
                        {isLoaded ? (
                          <Autocomplete onLoad={onOriginLoad} onPlaceChanged={onOriginPlaceChanged}>
                            <div className="relative">
                              <Input
                                type="text"
                                placeholder="Where are you starting from?"
                                value={fromLocation}
                                onChange={(e) => setFromLocation(e.target.value)}
                                className="h-14 bg-black/20 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-brand-teal rounded-xl text-lg pr-12"
                              />
                              <button
                                onClick={fetchCurrentLocation}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-brand-teal transition-colors"
                                title="Use my current location"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" />
                                </svg>
                              </button>
                            </div>
                          </Autocomplete>
                        ) : (
                          <div className="relative">
                            <Input
                              type="text"
                              placeholder="Where are you starting from?"
                              value={fromLocation}
                              onChange={(e) => setFromLocation(e.target.value)}
                              className="h-14 bg-black/20 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-brand-teal rounded-xl text-lg pr-12"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* To */}
                    <div className="relative flex items-center gap-4 md:gap-6">
                      <div className="w-14 h-14 md:w-16 md:h-16 bg-black/40 rounded-2xl flex items-center justify-center border border-white/10 flex-shrink-0 z-10">
                        <MapPin className="w-6 h-6 text-brand-purple" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs uppercase tracking-wider text-white/40 font-bold mb-2 block ml-1">
                          Destination
                        </label>
                        {isLoaded ? (
                          <Autocomplete onLoad={onDestLoad} onPlaceChanged={onDestPlaceChanged}>
                            <Input
                              type="text"
                              placeholder="Where do you want to go?"
                              value={toLocation}
                              onChange={(e) => setToLocation(e.target.value)}
                              className="h-14 bg-black/20 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-brand-purple rounded-xl text-lg"
                            />
                          </Autocomplete>
                        ) : (
                          <Input
                            type="text"
                            placeholder="Where do you want to go?"
                            value={toLocation}
                            onChange={(e) => setToLocation(e.target.value)}
                            className="h-14 bg-black/20 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-1 focus-visible:ring-brand-purple rounded-xl text-lg"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="pt-4">
                    <Button
                      size="xl"
                      className="w-full h-16 text-lg font-bold rounded-2xl bg-gradient-to-r from-brand-purple to-brand-teal text-white hover:opacity-90 transition-[opacity,box-shadow] shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(45,212,191,0.4)]"
                      onClick={handleCheckRoute}
                      disabled={!fromLocation || !toLocation || isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Analysing Safety Patterns...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          {travelMode === 'TWO_WHEELER' ? <Bike className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                          <span>Analyze Route Safety</span>
                        </div>
                      )}
                    </Button>
                    <div className="flex items-center justify-center gap-4 mt-4 text-[10px] uppercase tracking-widest text-white/30 font-medium">
                      <span>•</span>
                      <span>Privacy-first</span>
                      <span>•</span>
                      <span>AI Powered Analysis</span>
                    </div>
                    {error && (
                      <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center text-red-200">
                        <p>{error}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </section>

          {/* Results */}
          {showResults && routeResult && (
            <section
              className={`container px-4 mb-16 scroll-mt-24 ${!isFullScreen ? 'animate-fade-in' : ''}`}
              id="results"
            >
              <div className="max-w-6xl mx-auto grid lg:grid-cols-5 gap-6">

                {mapContent}

                {/* Safety Sidebar */}
                <div className={`space-y-4 transition-all duration-500 ${isFullScreen ? 'lg:col-span-5' : 'lg:col-span-2'}`}>

                  {/* Two-Wheeler specific tips */}
                  {travelMode === 'TWO_WHEELER' && (
                    <div className="bg-brand-purple/10 rounded-2xl p-4 border border-brand-purple/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Bike className="w-4 h-4 text-brand-purple" />
                        <span className="text-xs font-bold text-brand-purple uppercase tracking-wider">Rider Safety Tips</span>
                      </div>
                      <ul className="space-y-1.5">
                        {[
                          'Wear a helmet — it reduces fatal injury risk by 40%.',
                          'Avoid lane splitting on busy corridors.',
                          'Watch for potholes and unpaved stretches at night.',
                          'Keep extra distance from heavy vehicles.',
                        ].map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                            <span className="text-brand-purple mt-0.5">›</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Trusted Contacts */}
                  <Button
                    onClick={() => setShowContactModal(true)}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl h-12 flex items-center justify-between px-4"
                  >
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-brand-teal" />
                      <span>Trusted Contacts</span>
                    </div>
                    <span className="bg-white/10 text-xs px-2 py-1 rounded-full">{trustedContacts.length} Added</span>
                  </Button>

                  <h3 className="font-display text-lg font-bold text-white/80 mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-brand-purple" />
                    Safety Analysis
                  </h3>

                  {/* Score Ring */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center relative">
                      <span className="text-xl font-bold text-white">{Math.round(routeResult.safety_score)}</span>
                      <svg className="absolute inset-0 w-full h-full -rotate-90">
                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-white/10" />
                        <circle
                          cx="32" cy="32" r="28"
                          stroke="currentColor" strokeWidth="4" fill="none"
                          className={getRiskLabel(routeResult.safety_score).color}
                          strokeDasharray="175.9"
                          strokeDashoffset={175.9 - (175.9 * routeResult.safety_score) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className={`text-2xl font-bold ${getRiskLabel(routeResult.safety_score).color}`}>
                        {getRiskLabel(routeResult.safety_score).label}
                      </div>
                      <div className="text-sm text-white/50">{getRiskLabel(routeResult.safety_score).status}</div>
                      {travelMode === 'TWO_WHEELER' && (
                        <div className="text-[10px] text-brand-purple/70 mt-1">★ Adjusted for 2-wheeler</div>
                      )}
                    </div>
                  </div>

                  {/* Risk Report */}
                  {routeResult.aiCrimeAnalysis && (
                    <div className="bg-white/5 rounded-3xl p-5 border border-white/10 shadow-lg animate-fade-in-up">
                      <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        Risk Analysis Report
                      </h3>

                      <div className="space-y-3">
                        {routeResult.aiCrimeAnalysis.incidents.length > 0 ? (
                          <>
                            <div className={`space-y-3 ${showAllIncidents ? 'max-h-[300px] overflow-y-auto pr-2' : ''}`}>
                              {(showAllIncidents
                                ? routeResult.aiCrimeAnalysis.incidents
                                : routeResult.aiCrimeAnalysis.incidents.slice(0, 3)
                              ).map((incident, idx) => (
                                <div key={idx} className="flex gap-3 p-3 bg-red-500/10 rounded-xl border border-red-500/10">
                                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                  <div>
                                    <div className="flex justify-between items-start">
                                      <p className="text-xs font-bold text-red-200 uppercase tracking-wider">
                                        {incident.category ?? 'Incident'}
                                      </p>
                                      <span className="text-[10px] text-white/40">{incident.incident_date ?? 'Recent'}</span>
                                    </div>
                                    <p className="text-sm text-white/70 mt-1">
                                      {incident.description ?? 'Safety concern reported in this area.'}
                                    </p>
                                    {incident.area && (
                                      <p className="text-[10px] text-white/30 mt-1">📍 {incident.area}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {routeResult.aiCrimeAnalysis.incidents.length > 3 && (
                              <button
                                onClick={() => setShowAllIncidents(!showAllIncidents)}
                                className="w-full py-2 text-xs font-bold text-center text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-dashed border-white/10"
                              >
                                {showAllIncidents
                                  ? 'Show Less'
                                  : `View ${routeResult.aiCrimeAnalysis.incidents.length - 3} More Incidents`}
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="flex gap-3 p-3 bg-green-500/10 rounded-xl border border-green-500/10">
                            <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                            <p className="text-sm text-green-200">No major recent incidents reported in this corridor.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {routeResult.aiCrimeAnalysis?.derived_risk_summary?.primary_risk_factors?.length > 0 ? (
                      routeResult.aiCrimeAnalysis.derived_risk_summary.primary_risk_factors.slice(0, 3).map((factor, idx) => (
                        <div key={idx} className="flex gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                          <Info className="w-4 h-4 text-brand-teal mt-0.5 shrink-0" />
                          <p className="text-sm text-white/70">{factor}</p>
                        </div>
                      ))
                    ) : (
                      <div className="flex gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                        <Info className="w-4 h-4 text-brand-teal mt-0.5 shrink-0" />
                        <p className="text-sm text-white/70">Safety analysis based on available street data.</p>
                      </div>
                    )}
                  </div>

                  {/* Alternative Routes */}
                  {allRoutes.length > 1 && (
                    <div className="bg-white/5 rounded-3xl p-5 border border-white/10 shadow-lg mt-4">
                      <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-brand-purple" />
                        Alternative Routes
                      </h3>
                      <div className="space-y-2">
                        {allRoutes.map((route, idx) => {
                          const isSelected = routeResult === route;
                          const risk = getRiskLabel(route.safety_score);
                          return (
                            <button
                              key={idx}
                              onClick={() => setRouteResult(route)}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                                isSelected
                                  ? 'bg-brand-purple/20 border-brand-purple shadow-lg shadow-brand-purple/10'
                                  : 'bg-black/20 border-white/5 hover:bg-white/5'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    isSelected ? 'bg-brand-purple text-white' : 'bg-white/10 text-white/50'
                                  }`}
                                >
                                  {idx + 1}
                                </div>
                                <div className="text-left">
                                  <p className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-white/70'}`}>
                                    {route.route_name ?? `Route ${idx + 1}`}
                                  </p>
                                  <p className="text-xs text-white/40">{route.incident_count ?? 0} incidents near route</p>
                                </div>
                              </div>
                              <span className={`text-xs font-bold ${risk.color}`}>{risk.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Safer route warning */}
                  {allRoutes.length > 0 && routeResult !== allRoutes[0] && (
                    <div className="bg-red-500/10 rounded-3xl p-5 border border-red-500/20 shadow-lg mt-4 animate-pulse">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                        <div>
                          <h3 className="text-sm font-bold text-red-200 uppercase tracking-wider mb-1">
                            Caution: Safer Route Available
                          </h3>
                          <p className="text-sm text-red-100/70 leading-relaxed">
                            You selected a route with a lower safety score ({routeResult.safety_score}) than the recommended
                            option ({allRoutes[0].safety_score}).
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-3 bg-red-500/20 border-red-500/30 text-red-100 hover:bg-red-500/30"
                            onClick={() => setRouteResult(allRoutes[0])}
                          >
                            Switch to Safest Route
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Emergency Services */}
                  <div className="bg-white/5 rounded-3xl p-5 border border-white/10 shadow-lg">
                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Siren className="w-4 h-4 text-brand-purple" />
                      Emergency Support Nearby
                    </h3>
                    <div className="space-y-3">
                      {/* Police */}
                      <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/20">
                            <Shield className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white max-w-[150px] truncate" title={routeResult.emergencySupport.police.name}>
                              {routeResult.emergencySupport.police.name}
                            </p>
                            <p className="text-xs text-white/50 truncate max-w-[160px]">
                              {routeResult.emergencySupport.police.address}
                            </p>
                          </div>
                        </div>
                        <a href={`tel:${routeResult.emergencySupport.police.formatted_phone_number}`}>
                          <Button size="icon" className="w-9 h-9 rounded-full bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20">
                            <Phone className="w-4 h-4" />
                          </Button>
                        </a>
                      </div>

                      {/* Hospital */}
                      <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center border border-red-500/20">
                            <Hospital className="w-5 h-5 text-red-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white max-w-[150px] truncate" title={routeResult.emergencySupport.hospital.name}>
                              {routeResult.emergencySupport.hospital.name}
                            </p>
                            <p className="text-xs text-white/50 truncate max-w-[160px]">
                              {routeResult.emergencySupport.hospital.address}
                            </p>
                          </div>
                        </div>
                        <a href={`tel:${routeResult.emergencySupport.hospital.formatted_phone_number}`}>
                          <Button size="icon" className="w-9 h-9 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20">
                            <Phone className="w-4 h-4" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* SOS */}
                  <Button
                    onClick={handleSOS}
                    className={`w-full h-16 ${sosActive ? 'bg-red-600 animate-pulse' : 'bg-red-500 hover:bg-red-600'} text-white rounded-2xl text-lg font-bold shadow-2xl shadow-red-500/50 border-2 border-red-400`}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6" />
                      <span>{sosActive ? '🚨 SOS ACTIVE' : '🆘 EMERGENCY SOS'}</span>
                    </div>
                  </Button>

                  {/* Tracking + Share */}
                  <div className="flex gap-3">
                    <Button
                      onClick={isTracking ? stopTracking : startTracking}
                      className={`flex-1 h-14 ${isTracking ? 'bg-green-500 hover:bg-green-600' : 'bg-brand-purple hover:bg-brand-purple/80'} text-white rounded-2xl font-bold shadow-lg`}
                    >
                      <div className="flex items-center gap-2">
                        <Navigation className={`w-5 h-5 ${isTracking ? 'animate-pulse' : ''}`} />
                        <span>{isTracking ? 'Stop Tracking' : 'Start Tracking'}</span>
                      </div>
                    </Button>
                    <Button
                      onClick={handleShareLocation}
                      className="flex-1 h-14 bg-gradient-to-r from-brand-teal/20 to-brand-purple/20 hover:from-brand-teal/30 hover:to-brand-purple/30 border border-brand-teal/30 text-white rounded-2xl font-bold shadow-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-brand-teal" />
                        <span>Share</span>
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Safety Tips */}
          <section className="container px-4">
            <div className="max-w-4xl mx-auto bg-white/5 border border-white/10 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-brand-purple/20 rounded-xl flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-brand-purple" />
                </div>
                <h2 className="font-display text-xl font-bold text-white">Smart Travel Tips</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {safetyTips.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-black/20 rounded-2xl border border-white/5">
                    <div className="w-6 h-6 bg-brand-teal/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-brand-teal">{index + 1}</span>
                    </div>
                    <p className="text-sm text-white/70">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </main>

        {/* Trusted Contacts Modal */}
        {showContactModal &&
          createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-fade-in-up">
                <button
                  onClick={() => setShowContactModal(false)}
                  className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-brand-purple" />
                  Trusted Contacts
                </h2>
                <p className="text-sm text-white/50 mb-6">
                  Add contacts to automatically notify them when you start tracking or trigger SOS.
                </p>

                <div className="space-y-3 mb-6 max-h-[200px] overflow-y-auto">
                  {trustedContacts.length === 0 ? (
                    <div className="text-center p-6 bg-white/5 rounded-2xl border border-dashed border-white/5">
                      <UserPlus className="w-8 h-8 text-white/20 mx-auto mb-2" />
                      <p className="text-sm text-white/40">No contacts added yet.</p>
                    </div>
                  ) : (
                    trustedContacts.map((contact, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-teal/20 flex items-center justify-center text-xs font-bold text-brand-teal">
                            {contact.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{contact.name}</p>
                            <p className="text-xs text-white/50">{contact.phone}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeContact(idx)}
                          className="p-2 hover:bg-red-500/20 rounded-lg text-white/30 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-3 pt-4 border-t border-white/10">
                  <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Add New Contact</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Name"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      className="bg-black/20 border-white/10 text-white"
                    />
                    <Input
                      placeholder="Phone (with code)"
                      value={newContactPhone}
                      onChange={(e) => setNewContactPhone(e.target.value)}
                      className="bg-black/20 border-white/10 text-white"
                    />
                  </div>
                  <Button
                    onClick={addContact}
                    disabled={!newContactName || !newContactPhone}
                    className="w-full bg-brand-purple hover:bg-brand-purple/80 text-white font-bold"
                  >
                    Add Contact
                  </Button>
                </div>
              </div>
            </div>,
            document.body
          )}

        <Footer />
      </div>
    </>
  );
};

export default CheckRoute;