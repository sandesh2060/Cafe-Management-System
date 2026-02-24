// src/modules/customer/components/menu/SkeletonMenuCard.jsx
const SkeletonMenuCard = () => (
  <div className="bg-white rounded-2xl overflow-hidden border border-cream-border animate-pulse">
    <div className="h-28 bg-cream-deep" />
    <div className="p-2.5 space-y-2">
      <div className="h-3 bg-cream-deep rounded w-3/4" />
      <div className="h-3 bg-cream-deep rounded w-1/2" />
      <div className="flex justify-between items-center pt-1">
        <div className="h-4 bg-cream-deep rounded w-10" />
        <div className="w-7 h-7 rounded-full bg-cream-deep" />
      </div>
    </div>
  </div>
)

export default SkeletonMenuCard