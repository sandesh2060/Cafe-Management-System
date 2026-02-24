// src/modules/customer/components/menu/RecommendedCard.jsx
import { useDispatch } from 'react-redux'
import { addItem }     from '@store/slices/cartSlice'
import WeatherBadge    from './WeatherBadge'
import { COLORS }      from '@colors'
import { Plus, Star }  from 'lucide-react'
import toast           from 'react-hot-toast'

const RecommendedCard = ({ item }) => {
  const dispatch = useDispatch()

  const handleAdd = () => {
    dispatch(addItem({
      menuItemId: item._id,
      name: item.name, price: item.price,
      emoji: item.emoji, category: item.category, quantity: 1,
    }))
    toast.success(`${item.emoji} Added!`, { duration: 1500 })
  }

  return (
    <div className="w-36 bg-white rounded-2xl overflow-hidden shadow-card border border-cream-border flex flex-col">
      {/* Image */}
      <div className="h-24 bg-cream-dark flex items-center justify-center relative">
        {item.image
          ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
          : <span className="text-3xl">{item.emoji}</span>
        }
        {item.isFavourite && (
          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-saffron
                           flex items-center justify-center">
            <Star size={11} color="#fff" fill="#fff" />
          </span>
        )}
      </div>

      <div className="p-2 flex flex-col gap-1 flex-1">
        {item.weatherTag && <WeatherBadge tag={item.weatherTag} />}
        <p className="text-xs font-bold text-brew line-clamp-2 leading-tight">{item.name}</p>
        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="text-xs font-bold text-brew">₹{item.price}</span>
          <button
            onClick={handleAdd}
            className="w-6 h-6 rounded-full flex items-center justify-center text-white active:scale-90"
            style={{ backgroundColor: COLORS.saffron.DEFAULT }}
          >
            <Plus size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default RecommendedCard