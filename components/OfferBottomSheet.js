import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IoCall } from "react-icons/io5";
import { FaLocationArrow } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import { FaBookmark } from "react-icons/fa";
import { FaRegBookmark } from "react-icons/fa6";
import { DB } from "@/firebaseConfig";
import { getDoc, doc } from "firebase/firestore";
import axios from "axios";

export const OfferBottomSheet = ({ offer, isOpen, onClose, user }) => {
  const router = useRouter();

  const [isSaved, setIsSaved] = useState(false);
  const [animateBookmark, setAnimateBookmark] = useState(false);
  const [isPostLoading, setIsPostLoading] = useState(false);

  // ---------------------------------------------------
  // LOAD SAVED STATE (MATCHES MOBILE APP LOGIC EXACTLY)
  // ---------------------------------------------------
  useEffect(() => {
    async function loadData() {
      if (!offer) return;

      setIsPostLoading(true);

      // If user not logged in → mark unsaved
      if (!user) {
        setIsSaved(false);
        setIsPostLoading(false);
        return;
      }

      try {
        const userRef = doc(DB, "users", user.email.toLowerCase());
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const liked = userSnap.data().liked_posts || [];
          setIsSaved(liked.includes(offer.id));
        } else {
          setIsSaved(false);
        }
      } catch (err) {
        console.log("Error loading saved state:", err);
        setIsSaved(false);
      }

      setIsPostLoading(false);
    }

    loadData();
  }, [offer, user]);

  // ---------------------------------------------------
  // SAVE / UNSAVE POST
  // ---------------------------------------------------
  const handleSave = async () => {
    if (!user) return router.push("/login");

    try {
      const res = await axios.post(
        "https://us-central1-waffer-741af.cloudfunctions.net/api/toggleLike",
        {
          email: user.email,
          postId: offer.id,
        }
      );

      const liked = res.data.liked === true;
      setIsSaved(liked);

      // Animate icon
      setAnimateBookmark(true);
      setTimeout(() => setAnimateBookmark(false), 350);
    } catch (err) {
      console.log("SAVE ERROR:", err);
    }
  };

  // ---------------------------------------------------
  // CALL SHOP
  // ---------------------------------------------------
  const handleCall = () => {
    if (offer?.phone) window.location.href = `tel:${offer.phone}`;
  };

  // ---------------------------------------------------
  // GOOGLE MAPS DIRECTIONS
  // ---------------------------------------------------
  const handleDirections = () => {
    if (!offer?.location) return;

    const { latitude, longitude } = offer.location;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
      "_blank"
    );
  };

  // ---------------------------------------------------
  // RENDER
  // ---------------------------------------------------
  return (
    <AnimatePresence>
      {isOpen && offer && (
        <>
          {/* BACKDROP */}
          <motion.div
            className="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* BOTTOM SHEET */}
          <motion.div
            className="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="sheet-handle"><div /></div>

            <div className="sheet-content">

              {/* FULL PAGE LOADING LIKE THE APP */}
              {isPostLoading && (
                <div className="sheet-full-loader">
                  <div className="spinner-big"></div>
                  <p>جاري تحميل تفاصيل العرض...</p>
                </div>
              )}

              {/* CLOSE BUTTON */}
              <button className="sheet-close-btn" onClick={onClose}>
                <IoClose size={20} />
              </button>

              {/* ONLY SHOW CONTENT AFTER LOADING */}
              {!isPostLoading && (
                <>
                  {/* TITLE */}
                  <h2 className="sheet-title">{offer.shop_name}</h2>

                  <div className="sheet-subinfo">
                    <span>{offer.category}</span>
                    <span>•</span>
                    <span>{offer.address}</span>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="sheet-actions">

                    {/* CALL */}
                    <button className="sheet-btn save" onClick={handleCall}>
                      <IoCall size={22} />
                    </button>

                    {/* SAVE / UNSAVE */}
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      className={`sheet-btn save ${isSaved ? "saved" : ""}`}
                      onClick={handleSave}
                    >
                      {isSaved ? (
                        <FaBookmark size={24} />
                      ) : (
                        <FaRegBookmark size={24} />
                      )}

                      {/* POP ANIMATION */}
                      {animateBookmark && (
                        <motion.div
                          className="sheet-like-animation"
                          initial={{ scale: 0.3, opacity: 1 }}
                          animate={{ scale: 1.8, opacity: 0 }}
                          transition={{ duration: 0.4 }}
                        >
                          <FaBookmark size={26} />
                        </motion.div>
                      )}
                    </motion.button>

                    {/* DIRECTIONS */}
                    <button className="sheet-btn direction" onClick={handleDirections}>
                      <FaLocationArrow size={22} />
                    </button>
                  </div>

                  {/* PRODUCT NAME */}
                  <h3 className="sheet-prod-name">{offer.prod_name}</h3>

                  {/* PRICE OR DISCOUNT */}
                  {offer.discount_type === "price" ? (
                    <div className="sheet-price-box">
                      <p className="sheet-price-old">{offer.old_price} د.ت</p>
                      <p>/</p>
                      <p className="sheet-price-new">{offer.new_price} د.ت</p>
                    </div>
                  ) : (
                    <div className="sheet-price-box">
                      <p className="sheet-discount">{offer.percentage}%</p>
                      <p className="sheet-discount-label">تخفيض</p>
                    </div>
                  )}

                  {/* EXPIRATION */}
                  <p className="sheet-expire-text">
                    عرض صالح إلى غاية:{" "}
                    {new Intl.DateTimeFormat("ar-TN", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }).format(offer.end_date.toDate())}
                  </p>

                  {/* IMAGES */}
                  {offer.images?.length > 0 && (
                    <div className="sheet-images-container">
                      <div className="sheet-images">
                        {offer.images.map((img, idx) => (
                          <motion.img
                            key={idx}
                            src={img}
                            className="sheet-image"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
