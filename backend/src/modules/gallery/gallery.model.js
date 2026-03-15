// src/modules/gallery/gallery.model.js
import mongoose from 'mongoose'

/**
 * GalleryPhoto — manager-uploaded cafe & kitchen photos
 *  • Cloudinary URL stored in `imageUrl`
 *  • `publicId` needed for Cloudinary deletion
 *  • `category`: kitchen | ambience | food | event | team
 *  • `isFeatured` pins to top of masonry grid
 */
const gallerySchema = new mongoose.Schema(
  {
    imageUrl:  { type: String, required: true },
    publicId:  { type: String, required: true },        // Cloudinary public_id for deletion
    thumbnail: { type: String, default: null },         // auto-generated thumb URL
    caption:   { type: String, trim: true, maxlength: 200, default: '' },
    category: {
      type:    String,
      enum:    ['kitchen', 'ambience', 'food', 'event', 'team', 'other'],
      default: 'other',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
      required: true,
    },
    isFeatured: { type: Boolean, default: false },
    isVisible:  { type: Boolean, default: true },
    width:      { type: Number, default: null },   // original pixel width (set by client)
    height:     { type: Number, default: null },   // original pixel height
    likes:      { type: Number, default: 0 },
    likedBy:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    tags:       [{ type: String, trim: true }],
  },
  { timestamps: true }
)

gallerySchema.index({ category: 1, isVisible: 1, createdAt: -1 })
gallerySchema.index({ isFeatured: 1, createdAt: -1 })

export default mongoose.model('GalleryPhoto', gallerySchema)