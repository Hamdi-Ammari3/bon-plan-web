"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { GoogleMap, LoadScript } from "@react-google-maps/api";
import { MarkerClusterer, SuperClusterAlgorithm } from "@googlemaps/markerclusterer";
import { motion } from "framer-motion";
import { CategoryFilter } from "../components/CategoryFilter";
import { OfferBottomSheet } from "../components/OfferBottomSheet";
import { createMarkerIcon } from "../lib/createMarkerIcon";
import { DB, auth } from "@/firebaseConfig";
import { collection, getDocs, getDoc, doc, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { HiRefresh } from "react-icons/hi";
import { FaLocationArrow, FaBookmark } from "react-icons/fa";

// Config
const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const tunisiaCenter = { lat: 36.8065, lng: 10.1815 };

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  streetViewControl: false,
  gestureHandling: "greedy",
  clickableIcons: false,
};

export default function HomeMap() {
  const [offers, setOffers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [mapLoadedOnce, setMapLoadedOnce] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // GOOGLE MAP REFS
  const mapRef = useRef(null);
  const clustererRef = useRef(null);

  // MARKER POOL
  const markersRef = useRef({}); // store markers by id: { id: marker }

  // AUTH LISTENER
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u || null));
  }, []);

  // INITIAL DATA LOAD
  useEffect(() => {
    (async () => {
      const now = Date.now();
      const postsRef = collection(DB, "posts");

      const qActive = query(
        postsRef,
        where("isActive", "==", true),
        where("canceled", "==", false)
      );

      const [postsSnap, catSnap] = await Promise.all([
        getDocs(qActive),
        getDoc(doc(DB, "categories", "6mTU8aEAcAxdIdhsXA9L")),
      ]);

      const activeOffers = postsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((o) => o.end_date?.toMillis() >= now);

      setOffers(activeOffers);

      if (catSnap.exists()) {
        setCategories(catSnap.data().categories_array || []);
      }
    })();
  }, []);

  // CURRENT FILTER
  const filteredOffers = useMemo(() => {
    return selectedCategory === "الكل"
      ? offers
      : offers.filter((o) => o.category === selectedCategory);
  }, [offers, selectedCategory]);

  // MAP LOAD
  const onMapLoadd = async (map) => {
    mapRef.current = map;
    setMapLoadedOnce(true);
    map.setOptions({ gestureHandling: "greedy" });

    // Load Marker library (new API)
    try {
      const { Marker } = await google.maps.importLibrary("marker");
      window.Marker = Marker;
    } catch (e) {
      window.Marker = google.maps.Marker; // fallback
    }

    initMarkersOnce();
  };

  const onMapLoad = async (map) => {
    mapRef.current = map;
    setMapLoadedOnce(true);

    // Load Marker library
    try {
      const { Marker } = await google.maps.importLibrary("marker");
      window.Marker = Marker;
    } catch {
      window.Marker = google.maps.Marker;
    }

    // Try getting user location first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setUserLocation(coords);

          // Center on user like RN (zoom 12)
          map.panTo(coords);
          map.setZoom(12);
        },
        () => {
          // ❌ User denied or failed => fallback to Tunisia center
          map.panTo(tunisiaCenter);
          map.setZoom(7);
        }
      );
    }

    // Create markers after map is ready
    initMarkersOnce();
  };

  //Fit all markers
  const fitAllOffers = (list) => {
    if (!mapRef.current || list.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();

    list.forEach((offer) => {
      bounds.extend({
        lat: offer.location.latitude,
        lng: offer.location.longitude,
      });
    });

    mapRef.current.fitBounds(bounds);
  };

  // CREATE ALL MARKERS ONCE
  const initMarkersOnce = async () => {
    if (!mapRef.current) return;

    for (const offer of offers) {
      createMarker(offer);
    }

    updateVisibleMarkers();
    updateClusterer();
  };

  // CREATE A SINGLE MARKER (ONCE)
  const createMarker = async (offer) => {
    if (!mapRef.current) return;
    if (markersRef.current[offer.id]) return;

    const icon = await createMarkerIcon(offer.thumbnail, offer.prod_name);

    const marker = new google.maps.Marker({
      position: {
        lat: offer.location.latitude,
        lng: offer.location.longitude,
      },
      map: null,
      icon,
    });

    marker.addListener("click", () => {
      setSelectedOffer(offer);
      setIsSheetOpen(true);
      mapRef.current.panTo(marker.getPosition());
      mapRef.current.setZoom(14);
    });

    markersRef.current[offer.id] = marker;
  };

  // UPDATE MARKER VISIBILITY (FILTER)
  const updateVisibleMarkers = () => {
    const visibleIds = new Set(filteredOffers.map(o => o.id));

    Object.entries(markersRef.current).forEach(([id, marker]) => {
      marker?.setMap(visibleIds.has(id) ? mapRef.current : null);
    });
  };

  // CLUSTER ONLY VISIBLE MARKERS
  const updateClusterer = () => {
    if (!mapRef.current) return;

    const visibleMarkers = filteredOffers
      .map(o => markersRef.current[o.id])
      .filter(Boolean);

    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    }

    clustererRef.current = new MarkerClusterer({
      map: mapRef.current,
      markers: visibleMarkers,
      algorithm: new SuperClusterAlgorithm({ radius: 100, maxZoom: 15 }),
      renderer: {
        render: ({ count, position }) => {
          const size = 48;          // SVG size
          const radius = 22;        // Circle size
          const cx = size / 2;
          const cy = size / 2;

          const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
              <circle
                cx="${cx}"
                cy="${cy}"
                r="${radius}"
                fill="#d37b01"
                stroke="#ffffff"
                stroke-width="3"
              />
              <text
                x="${cx}"
                y="${cy + 5}"
                font-size="16"
                font-family="Arial"
                font-weight="700"
                fill="#ffffff"
                text-anchor="middle"
              >
                ${count}
              </text>
            </svg>
          `;

          const icon = {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
            scaledSize: new google.maps.Size(size, size),
            anchor: new google.maps.Point(cx, cy),
          };

          const MarkerClass = window.Marker || google.maps.Marker;

          return new MarkerClass({position,icon,zIndex: 1000});
        },
      },
    });
  };

  useEffect(() => {
    if (!mapRef.current || offers.length === 0) return;

    Promise.all(offers.map(o => createMarker(o))).then(() => {
      updateVisibleMarkers();
      updateClusterer();
    });

  }, [offers, mapRef.current]);

  // UPDATE WHEN CATEGORY CHANGES
  useEffect(() => {
    if (!mapRef.current) return;
    updateVisibleMarkers();
    updateClusterer();
  }, [filteredOffers, mapRef.current]);

  // REFRESH (FAST)
  const handleRefresh = async () => {
    const now = Date.now();
    const postsRef = collection(DB, "posts");

    const qActive = query(
      postsRef,
      where("isActive", "==", true),
      where("canceled", "==", false)
    );

    const snap = await getDocs(qActive);

    const newOffers = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((o) => o.end_date?.toMillis() >= now);

    setOffers(newOffers);

    // Add any missing markers
    await Promise.all(newOffers.map((o) => createMarker(o)));

    updateVisibleMarkers();
    updateClusterer();

    // Zoom out and show all markers
    fitAllOffers(newOffers);
  };

  // Re-center map
  const handleRecenter = () => {
    if (!mapRef.current) return;

    // User location already known
    if (userLocation) {
      mapRef.current.panTo(userLocation);
      mapRef.current.setZoom(13);
      return;
    }

    // Otherwise request again
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setUserLocation(coords);

          mapRef.current.panTo(coords);
          mapRef.current.setZoom(13);
        },
        () => {
          alert("تعذّر تحديد موقعك.");
        }
      );
    }
  };

  //Center to tunisiaCenter is user denies his loaction grant
  useEffect(() => {
    if (!mapLoadedOnce || offers.length === 0) return;

    if (!userLocation) {
      // fallback on first load
      mapRef.current.panTo(tunisiaCenter);
      mapRef.current.setZoom(7);
    }
  }, [mapLoadedOnce, offers]);


  // SHOW SAVED POSTS (FAST)
  const handleShowSavedPosts = async () => {
    if (!user) return alert("الرجاء تسجيل الدخول");

    const userRef = doc(DB, "users", user.email.toLowerCase());
    const snap = await getDoc(userRef);

    const liked = snap.data()?.liked_posts || [];
    if (liked.length === 0) return alert("لا توجد عروض محفوظة");

    const savedOffers = offers.filter((o) => liked.includes(o.id));

    setSelectedCategory("الكل");
    setOffers(savedOffers);

    updateVisibleMarkers();
    updateClusterer();
  };

  return (
    <div className="page-container">

       {user && <div className="welcome-bar">مرحباً، {user.displayName} 👋</div>}

      <LoadScript googleMapsApiKey={googleMapsKey}>
        <GoogleMap
          mapContainerClassName="map-fullscreen"
          center={tunisiaCenter}
          zoom={6}
          options={mapOptions}
          onLoad={onMapLoad}
        >
        </GoogleMap>
      </LoadScript>

      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <OfferBottomSheet
        offer={selectedOffer}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      />

      <div className="map-controls">
        <motion.button className="map-control-btn" whileTap={{ scale: 0.95 }} onClick={handleRecenter}>
          <FaLocationArrow />
        </motion.button>

        <motion.button className="map-control-btn" onClick={handleRefresh}>
          <HiRefresh />
        </motion.button>

        {user && (
          <motion.button className="map-control-btn saved" onClick={handleShowSavedPosts}>
            <FaBookmark />
          </motion.button>
        )}
      </div>
    </div>
  );
}

