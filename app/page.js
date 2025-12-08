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
import { loginWithGoogle } from "@/firebaseAuth";
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
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [mapLoadedOnce, setMapLoadedOnce] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [savedMode, setSavedMode] = useState(false);
  const [canTestApp, setCanTestApp] = useState(false);
  const [showDownloadBanner, setShowDownloadBanner] = useState(true);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  const mapRef = useRef(null);
  const clustererRef = useRef(null);
  const markersRef = useRef({});

  // AUTH LISTENER
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u || null));
  }, []);

  //MANUAL LOGIN  
  const handleManualLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.log("Login failed:", err);
    }
  }

  //CHECK IF USER ELIGIBLE TO DOWNLOAD THE APP  
  useEffect(() => {
    const fetchUserFlags = async () => {
      if (!user) {
        setCanTestApp(false);
        return;
      }

      const userRef = doc(DB, "users", user.email.toLowerCase());
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        setCanTestApp(snap.data().can_test_the_app === true);
      }
    };

    fetchUserFlags();
  }, [user]);

  // INITIAL DATA LOAD
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);        

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

        let activeOffers = postsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((o) => o.end_date?.toMillis() >= now);

        //PRELOAD ALL MARKER ICONS BEFORE MAP RENDERS
        activeOffers = await Promise.all(
          activeOffers.map(async (offer) => ({
            ...offer,
            markerIcon: await createMarkerIcon(offer.thumbnail, offer.prod_name),
          }))
        );

        setOffers(activeOffers);

        if (catSnap.exists()) {
          setCategories(catSnap.data().categories_array || []);
        }
      } 
      catch (err) {
        console.log("Error loading offers", err);
      } finally {
        setLoading(false);
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

    // wait for ALL markers to be created
    await Promise.all(offers.map(o => createMarker(o)));

    updateVisibleMarkers();
    updateClusterer();
  };

  // CREATE A SINGLE MARKER (ONCE)
  const createMarker = async (offer) => {
    if (!mapRef.current) return;
    if (markersRef.current[offer.id]) return;

    //const icon = await createMarkerIcon(offer.thumbnail, offer.prod_name);

    const marker = new google.maps.Marker({
      position: {
        lat: offer.location.latitude,
        lng: offer.location.longitude,
      },
      //map: null,
      //icon,
      icon: offer.markerIcon,
      map: mapRef.current,
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

    (async () => {
      await Promise.all(offers.map(o => createMarker(o)));
      updateVisibleMarkers();
      updateClusterer();
      setLoading(false);
    })();

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
    setSavedMode(false);

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
    setSavedMode(false);

    // If location already known, center immediately
    if (userLocation) {
      mapRef.current.panTo(userLocation);
      mapRef.current.setZoom(13);
      return;
    }

    // Request permission from user
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

        (err) => {
          if (err.code === 1) {
            alert(
              "للاستفادة من ميزة تحديد موقعك، يرجى تفعيل الإذن من الإعدادات:\n\n" +
              "الإعدادات > الخصوصية > خدمات الموقع > Safari\n" +
              "وقم بتحديد 'السماح أثناء الاستخدام'."
            );
          } else {
            alert("تعذّر تحديد موقعك.");
          }
        }
      );
    }
  }

  // FETCH SAVED POSTS
  const handleShowSavedPosts = async () => {
    if (!user) return alert("الرجاء تسجيل الدخول");

    const userRef = doc(DB, "users", user.email.toLowerCase());
    const snap = await getDoc(userRef);

    const liked = snap.data()?.liked_posts || [];
    if (liked.length === 0) return alert("لا توجد عروض محفوظة");

    const savedOffers = offers.filter((o) => liked.includes(o.id));

    setSavedMode(true);
    setSelectedCategory("الكل");
    setOffers(savedOffers);

    updateVisibleMarkers();
    updateClusterer();

    // Center map around saved posts
    if (savedOffers.length === 1) {
      const post = savedOffers[0];
      mapRef.current.panTo({
        lat: post.location.latitude,
        lng: post.location.longitude,
      });
      mapRef.current.setZoom(14);
    } else {
      fitAllOffers(savedOffers);
    }
  }

  //Center to tunisiaCenter is user denies his loaction grant
  useEffect(() => {
    if (!mapLoadedOnce || offers.length === 0) return;

    if (!userLocation) {
      // fallback on first load
      mapRef.current.panTo(tunisiaCenter);
      mapRef.current.setZoom(7);
    }
  }, [mapLoadedOnce, offers]);

  return (
    <div className="page-container">

      <div className="welcome-bar">
        {user ? (
          <p className="welcome-bar-text">مرحباً، {user.displayName} 👋</p>
        ) : (
          <p className="welcome-bar-text login" onClick={handleManualLogin}>
           تسجيل الدخول
          </p>
        )}
      </div>

      {user && canTestApp && showDownloadBanner && (
        <div className="download-banner">
          <p onClick={() => setIsDownloadModalOpen(true)}>نسخة التطبيق متوفرة الان</p>
          <div className="close-banner-btn" onClick={() => setShowDownloadBanner(false)}>×</div>
        </div>
      )}

      {isDownloadModalOpen && (
        <div className="download-modal-backdrop" onClick={() => setIsDownloadModalOpen(false)}>
          <div className="download-modal" onClick={(e) => e.stopPropagation()}>
            <h3>روابط تحميل التطبيق</h3>

            <a
              className="download-link"
              href="https://play.google.com/apps/testing/com.hamdi.waffer"
              target="_blank"
            >
             تحميل للأندرويد
            </a>

            <a
              className="download-link disabled"
              //href="https://testflight.apple.com/join/YOUR_TESTFLIGHT_LINK"
              //target="_blank"
            >
             تحميل للآيفون
            </a>

            <button className="close-modal-btn" onClick={() => setIsDownloadModalOpen(false)}>
             إغلاق
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-box">
            <div className="spinner"></div>
            <p>جاري تحميل العروض...</p>
          </div>
        </div>
      )}

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

        <motion.button className="map-control-btn refresh" onClick={handleRefresh}>
          <HiRefresh/>
        </motion.button>

        {user && (
          <motion.button 
            className={`map-control-btn saved ${savedMode ? "active" : ""}`}
            onClick={handleShowSavedPosts}
          >
            <FaBookmark />
          </motion.button>
        )}
      </div>
    </div>
  );
}

