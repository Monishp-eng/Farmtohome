import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Truck, MapPin, Navigation, Clock, Gauge, Sparkles } from 'lucide-react';
import useDeliveryTracking from '../../hooks/useWebSocket';

// Custom Map Markers
const createEmojiIcon = (emoji, label = '') => L.divIcon({
  html: `<div style="font-size: 26px; text-align: center; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35)); cursor: pointer;">${emoji}</div>`,
  className: 'custom-leaflet-emoji-marker',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const farmMarkerIcon = createEmojiIcon('🧑‍🌾', 'Farm Gate');
const doorstepMarkerIcon = createEmojiIcon('🏡', 'Doorstep');
const truckMarkerIcon = createEmojiIcon('🚛', 'Cold Transit');

const AutoFitBounds = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [map, bounds]);
  return null;
};

const LiveTrackingMap = ({
  deliveryId = 'DEL-101',
  pickup = { name: 'Salem Organic Farm Gate', lat: 11.6643, lng: 78.1460 },
  dropoff = { name: 'Consumer Doorstep (Chennai)', lat: 13.0827, lng: 80.2707 },
  orderStatus = 'in_transit',
  height = '360px'
}) => {
  const { trackingData } = useDeliveryTracking(deliveryId, pickup, dropoff);

  const truckPos = trackingData?.position || [
    pickup.lat + (dropoff.lat - pickup.lat) * 0.45,
    pickup.lng + (dropoff.lng - pickup.lng) * 0.45
  ];

  const polylineCoords = [
    [pickup.lat, pickup.lng],
    truckPos,
    [dropoff.lat, dropoff.lng]
  ];

  const bounds = [
    [pickup.lat, pickup.lng],
    [dropoff.lat, dropoff.lng]
  ];

  return (
    <div className="relative rounded-3xl overflow-hidden border border-emerald-200 dark:border-slate-800 shadow-md">
      {/* Live Status Overlay Header */}
      <div className="absolute top-3 left-3 right-3 z-[1000] bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md text-white p-3 rounded-2xl border border-white/10 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <div>
            <strong className="font-black text-emerald-400 block text-xs">
              Live WebSocket Truck Stream
            </strong>
            <span className="text-[10px] text-gray-300">
              {trackingData?.status || 'Direct NH-44 Farm-to-City Route'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-[11px] text-gray-300">
            <Clock size={14} className="text-amber-400" />
            <span>ETA: <strong className="text-white">{trackingData?.etaMinutes || 42} mins</strong></span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-gray-300">
            <Gauge size={14} className="text-blue-400" />
            <span>Speed: <strong className="text-white">{trackingData?.speed || 52} km/h</strong></span>
          </div>
        </div>
      </div>

      {/* Interactive Leaflet Map */}
      <div style={{ height }}>
        <MapContainer
          center={truckPos}
          zoom={8}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <AutoFitBounds bounds={bounds} />

          {/* Farm Origin Marker */}
          <Marker position={[pickup.lat, pickup.lng]} icon={farmMarkerIcon}>
            <Popup>
              <div className="text-xs font-bold">
                <p className="text-emerald-800">🧑‍🌾 Farm Gate Origin</p>
                <p>{pickup.name}</p>
              </div>
            </Popup>
          </Marker>

          {/* Doorstep Destination Marker */}
          <Marker position={[dropoff.lat, dropoff.lng]} icon={doorstepMarkerIcon}>
            <Popup>
              <div className="text-xs font-bold">
                <p className="text-blue-800">🏡 Consumer Doorstep</p>
                <p>{dropoff.name}</p>
              </div>
            </Popup>
          </Marker>

          {/* Live Moving Truck Marker */}
          <Marker position={truckPos} icon={truckMarkerIcon}>
            <Popup>
              <div className="text-xs font-bold">
                <p className="text-amber-800">🚛 Cold Transit Dispatch</p>
                <p>Speed: {trackingData?.speed || 52} km/h</p>
                <p>Progress: {trackingData?.progress || 45}%</p>
              </div>
            </Popup>
          </Marker>

          {/* Route Polyline */}
          <Polyline
            positions={polylineCoords}
            pathOptions={{ color: '#16a34a', weight: 4, dashArray: '8, 8', opacity: 0.85 }}
          />
        </MapContainer>
      </div>

      {/* Progress Bar Footer */}
      <div className="bg-white dark:bg-slate-900 p-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-gray-700 dark:text-gray-300">
        <div className="flex items-center gap-1.5">
          <Navigation size={13} className="text-primary" />
          <span>Farm Gate</span>
        </div>
        <div className="flex-1 mx-4 bg-gray-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500"
            style={{ width: `${trackingData?.progress || 45}%` }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span>Doorstep Delivery</span>
          <span className="text-emerald-600 dark:text-emerald-400">({trackingData?.progress || 45}%)</span>
        </div>
      </div>
    </div>
  );
};

export default LiveTrackingMap;
