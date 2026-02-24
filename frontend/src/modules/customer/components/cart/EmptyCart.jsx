// src/modules/customer/components/cart/EmptyCart.jsx
import { useNavigate } from 'react-router-dom'

const EmptyCart = () => {
  const navigate = useNavigate()
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4 pb-20">
      <div className="text-6xl">🛒</div>
      <div>
        <h2 className="text-xl font-bold text-brew">Your cart is empty</h2>
        <p className="text-brew-soft text-sm mt-1">
          Browse the menu and add items to get started
        </p>
      </div>
      <button
        onClick={() => navigate('/menu')}
        className="btn-brand px-8"
      >
        Browse Menu
      </button>
    </div>
  )
}

export default EmptyCart