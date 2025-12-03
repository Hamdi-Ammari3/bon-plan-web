import { MdRestaurant,MdDevices } from "react-icons/md";
import { FaCoffee,FaShoppingBasket,FaTshirt } from "react-icons/fa";
import { BiSolidCategory } from "react-icons/bi";

const getCategoryIcon = (iconName, isActive) => {
  const className = `category-icon ${isActive ? "active" : ""}`;

  switch (iconName) {
    case "مطاعم":
      return <MdRestaurant className={className} />;
    case "مقاهي":
      return <FaCoffee className={className} />;
    case "مواد غذائية":
      return <FaShoppingBasket className={className} />;
    case "ملابس":
      return <FaTshirt className={className} />;
    case "أجهزة إلكترونية":
      return <MdDevices className={className} />;
    default:
      return <BiSolidCategory className={className} />;
  }
};

export const CategoryFilter = ({
  categories,
  selectedCategory,
  onSelectCategory
}) => {
  return (
    <div className="category-wrapper">
      <div className="category-box">
        <div className="category-scroll-container">
          <div className="category-scroll">
            {categories.map((category) => {
              const isActive = selectedCategory === category.name;

              return (
                <div
                  key={category.name}
                  onClick={() => onSelectCategory(category.name)}
                  className={`category-btn ${isActive ? "active" : ""}`}
                >
                  {getCategoryIcon(category.name, isActive)}
                  <span className={`category-text ${isActive ? "active" : ""}`}>
                    {category.name}                
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

