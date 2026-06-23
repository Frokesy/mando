"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeftIcon } from "@/components/svgs/DefaultIcons";
import useCartStore from "@/store/cartStore";
import BottomNav from "@/components/BottomNav";

const CartPage = () => {
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total)();
  const deliveryAddress = useCartStore((s) => s.deliveryAddress);
  const phoneNumber = useCartStore((s) => s.phoneNumber);
  const setPhoneNumber = useCartStore((s) => s.setPhoneNumber);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [inputPhone, setInputPhone] = useState(phoneNumber);

  return (
    <div className="p-4 pb-24 space-y-6">
      <header className="flex items-center gap-3">
        <Link href="/customer/restaurants" className="flex items-center gap-3">
          <ArrowLeftIcon />
          <span className="text-[20px] font-semibold">Checkout</span>
        </Link>
      </header>

      <section className="rounded-xl border p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[14px] text-[#A4A4A4]">Delivery address</p>
            <p className="font-semibold">{deliveryAddress}</p>
            <p className="text-[12px] text-[#A4A4A4]">ETA: 30-45 mins</p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Link href="/customer/cart/change-address" className="underline text-[#DFB400]">
              Change address
            </Link>
            <button
              onClick={() => setShowPhoneModal(true)}
              className="underline text-[#DFB400] bg-transparent border-0 cursor-pointer"
            >
              Add phone number
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {items.length === 0 ? (
          <p className="text-[14px] text-[#A4A4A4]">Your cart is empty.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={item.image} alt={item.comboName} className="w-28 h-28 rounded-md object-cover" />
                <div>
                  <p className="text-[14px] font-semibold">{item.restaurantName}</p>
                  <p className="text-[13px] text-[#4D4D4D] my-1">{item.comboName}</p>
                  <Link href={`/customer/featured-combos/${item.id}`} className="underline text-[13px] text-[#DFB400]">
                    edit combo quantity
                  </Link>
                </div>
              </div>

              <div className="text-right">
                <p className="font-semibold">₦{(item.price * item.quantity).toLocaleString()}</p>
                <p className="text-[12px] text-[#A4A4A4]">Qty: {item.quantity}</p>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="border-t pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[14px] text-[#A4A4A4]">Subtotal</span>
          <span className="font-semibold">₦{total.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[14px] text-[#A4A4A4]">Delivery</span>
          <span className="font-semibold">₦0</span>
        </div>

        <div className="flex items-center justify-between text-[16px] font-semibold">
          <span>Total</span>
          <span>₦{total.toLocaleString()}</span>
        </div>

        <button className="w-full mt-2 rounded-xl bg-[#DFB400] py-4 text-[16px] font-semibold text-white">
          Proceed to payment
        </button>
      </section>

      <BottomNav />

      {/* Phone Number Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowPhoneModal(false)} />
      )}

      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 z-50 transition-transform duration-300 ${
          showPhoneModal ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="space-y-4">
          <h3 className="text-[20px] font-semibold">Add phone number</h3>
          <input
            type="tel"
            value={inputPhone}
            onChange={(e) => setInputPhone(e.target.value)}
            placeholder="Enter your phone number"
            className="w-full border border-gray-300 rounded-md p-4 text-[14px] focus:outline-none focus:border-[#DFB400]"
          />
          <button
            onClick={() => {
              setPhoneNumber(inputPhone);
              setShowPhoneModal(false);
            }}
            className="w-full bg-[#DFB400] text-white font-semibold py-4 rounded-md"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
