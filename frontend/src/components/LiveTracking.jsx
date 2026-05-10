import React, { useState, useEffect } from 'react'
import { LoadScript, GoogleMap, Marker } from '@react-google-maps/api'

const containerStyle = {
    width: '100%',
    height: '100%',
};

const center = {
    lat: 28.6139,
    lng: 77.2090
};

const LiveTracking = () => {
    const [ currentPosition, setCurrentPosition ] = useState(center);
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    useEffect(() => {
        if (!navigator.geolocation) {
            return undefined;
        }

        const updatePosition = (position) => {
            const { latitude, longitude } = position.coords;
            setCurrentPosition({
                lat: latitude,
                lng: longitude
            });
        };

        navigator.geolocation.getCurrentPosition(updatePosition, () => undefined);

        const watchId = navigator.geolocation.watchPosition(updatePosition, () => undefined, {
            enableHighAccuracy: true,
            maximumAge: 10000,
        });

        const intervalId = setInterval(() => {
            navigator.geolocation.getCurrentPosition(updatePosition, () => undefined);
        }, 10000);

        return () => {
            navigator.geolocation.clearWatch(watchId);
            clearInterval(intervalId);
        };
    }, []);

    if (!apiKey || apiKey === 'replace_me') {
        return (
            <div className='h-full w-full bg-slate-100 flex items-center justify-center text-center p-6'>
                <div>
                    <p className='text-sm font-semibold text-slate-700'>Live map unavailable</p>
                    <p className='text-xs text-slate-500 mt-1'>Add VITE_GOOGLE_MAPS_API_KEY to enable Google Maps.</p>
                </div>
            </div>
        )
    }

    return (
        <LoadScript googleMapsApiKey={apiKey}>
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={currentPosition}
                zoom={15}
            >
                <Marker position={currentPosition} />
            </GoogleMap>
        </LoadScript>
    )
}

export default LiveTracking
