import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { auth } from "@/firebaseConfig";
import {loginWithGoogle,saveLikedPost,removeLikedPost,isPostLiked} from "@/firebaseAuth";
import { IoCall } from "react-icons/io5";
import { FaLocationArrow } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import { FaHeart } from "react-icons/fa";
import { FiHeart } from "react-icons/fi";

export const OfferBottomSheet = ({ offer, isOpen, onClose }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);

  // -------------------------------
  // Load liked state when sheet opens
  // -------------------------------
  useEffect(() => {
    async function loadLikeStatus() {
      if (!offer) return;

      const user = auth.currentUser;
      if (!user) {
        setIsLiked(false);
        return;
      }

      const liked = await isPostLiked(user.email, offer.id);
      setIsLiked(liked);
    }

    loadLikeStatus();
  }, [offer]);

  // -------------------------------
  // LIKE / UNLIKE POST
  // -------------------------------
  const handleLike = async () => {
    let user = auth.currentUser;

    // If not logged in → login first
    if (!user) {
      const userId = await loginWithGoogle();
      user = auth.currentUser; // refresh
    }

    const userEmail = user.email;

    if (!isLiked) {
      await saveLikedPost(userEmail, offer.id);
      setIsLiked(true);

      // Show animation
      setShowHeartAnimation(true);
      setTimeout(() => setShowHeartAnimation(false), 600);
    } else {
      await removeLikedPost(userEmail, offer.id);
      setIsLiked(false);
    }
  };

  // -------------------------------
  // Call / Directions
  // -------------------------------
  const handleCall = () => {
    if (offer?.phone) window.location.href = `tel:${offer.phone}`;
  };

  const handleDirections = () => {
    if (!offer?.location) return;

    const { latitude, longitude } = offer.location;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
      "_blank"
    );
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------
  return (
    <AnimatePresence>
      {isOpen && offer && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="sheet-backdrop"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="sheet"
          >
            <div className="sheet-handle"><div/></div>

            <div className="sheet-content">
              <button className="sheet-close-btn" onClick={onClose}>
                <IoClose size={20} />
              </button>

              {/* Shop Info */}
              <h2 className="sheet-title">{offer.shop_name}</h2>
              <div className="sheet-subinfo">
                <span>{offer.category}</span>
                <span>•</span>
                <span>{offer.address}</span>
              </div>

              {/* ACTION BUTTONS */}
              <div className="sheet-actions">
                <button className="sheet-btn call" onClick={handleCall}>
                  <IoCall size={18} /> اتصل
                </button>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className="sheet-btn like"
                  onClick={handleLike}
                >
                  {isLiked ? (
                    <FaHeart size={22} className="heart-filled"/>
                  ) : (
                    <FiHeart size={22}/>
                  )}  

                  <AnimatePresence>
                    {showHeartAnimation && (
                      <motion.div
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: 2, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6 }}
                        className="sheet-like-animation"
                      >
                        <FiHeart size={26} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>

                <button className="sheet-btn direction" onClick={handleDirections}>
                  <FaLocationArrow size={18}/> اتجاهات
                </button>
              </div>

              {/* PRODUCT INFO */}
              <h3 className="sheet-prod-name">{offer.prod_name}</h3>

              {offer.discount_type === "price" ? (
                <div className="sheet-price-box">
                  <span className="sheet-price-old">{offer.old_price} د.ت</span>
                  <span>/</span>
                  <span className="sheet-price-new">{offer.new_price} د.ت</span>
                </div>
              ) : (
                <div className="sheet-discount-box">
                  <span className="sheet-discount">{offer.percentage}%</span>
                  <span className="sheet-discount-label">تخفيض</span>
                </div>
              )}

              <p className="sheet-expire-text">
                عرض صالح إلى غاية:{" "}
                {offer.end_date
                  ? new Intl.DateTimeFormat("ar-TN", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    }).format(offer.end_date.toDate())
                  : "—"}
              </p>

              {/* IMAGES */}
              {offer.images?.length > 0 && (
                <div className="sheet-images-container">
                  <div className="sheet-images">
                    {offer.images.map((img, idx) => (
                      <motion.img
                        key={idx}
                        src={img}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className="sheet-image"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
