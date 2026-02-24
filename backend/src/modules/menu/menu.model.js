// src/modules/menu/menu.model.js
import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true }, // hot_drinks, cold_drinks, soups, etc.
    emoji: { type: String, default: "🍽️" },
    image: { type: String, default: null },
    cafeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cafe",
      required: true,
    },
    isAvailable: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isVeg: { type: Boolean, default: false },
    spiceLevel: { type: Number, min: 0, max: 3, default: 0 }, // 0=none, 1=mild, 2=medium, 3=hot
    preparationTimeMinutes: { type: Number, default: 10 },
    allergens: [{ type: String }],
    tags: [{ type: String }], // 'bestseller', 'new', 'seasonal'
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

menuItemSchema.index({ cafeId: 1, isAvailable: 1 });
menuItemSchema.index({ cafeId: 1, category: 1 });
menuItemSchema.index({ cafeId: 1, isFeatured: 1 });

const MenuItem = mongoose.model("MenuItem", menuItemSchema);
export default MenuItem;
