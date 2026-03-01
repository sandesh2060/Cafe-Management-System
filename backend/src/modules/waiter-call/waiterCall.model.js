// backend/src/modules/waiter-call/waiterCall.model.js
// If you already have this model, keep yours — this is a safe reference stub.
import mongoose from "mongoose";

const waiterCallSchema = new mongoose.Schema(
  {
    cafeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cafe",
      required: true,
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true,
    },
    sessionId: { type: String, required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "acknowledged", "on_the_way", "done", "cancelled"],
      default: "pending",
    },
    message: { type: String, default: null },
    acknowledgedAt: { type: Date, default: null },
    arrivedAt: { type: Date, default: null },
    doneAt: { type: Date, default: null },
  },
  { timestamps: true },
);

waiterCallSchema.index({ cafeId: 1, status: 1 });
waiterCallSchema.index({ cafeId: 1, createdAt: -1 });

export default mongoose.model("WaiterCall", waiterCallSchema);
