 "use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "../lib/supabase"

type Category = { id: string; name: string; sort_order: number }
type MenuItem = {
  id: string
  category_id: string | null
  name: string
  description: string | null
  price: number
  image_url: string | null
}
type Topping = { id: string; name: string; price: number }
type CartItem = {
  key: string
  menuItemId: string
  name: string
  price: number
  quantity: number
  size: "M" | "L"
  sugar: number
  ice: number
  toppingIds: string[]
  toppingNames: string[]
  toppingTotal: number
  note: string
}

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [toppings, setToppings] = useState<Topping[]>([])
  const [category, setCategory] = useState("Tất cả")
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [size, setSize] = useState<"M" | "L">("M")
  const [sugar, setSugar] = useState(50)
  const [ice, setIce] = useState(50)
  const [selectedToppings, setSelectedToppings] = useState<string[]>([])
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [message, setMessage] = useState("")
  const [cartOpen, setCartOpen] = useState(false)

  const table =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("table") || "07"
      : "07"

  const money = (value: number) => value.toLocaleString("vi-VN") + "đ"

  useEffect(() => { loadMenu() }, [])

  async function loadMenu() {
    setLoading(true)
    const [categoryResult, itemResult, toppingResult] = await Promise.all([
      supabase.from("menu_categories").select("id,name,sort_order").eq("active", true).order("sort_order"),
      supabase.from("menu_items").select("id,category_id,name,description,price,image_url").eq("active", true).order("created_at"),
      supabase.from("toppings").select("id,name,price").eq("active", true).order("name"),
    ])

    if (categoryResult.error || itemResult.error || toppingResult.error) {
      setMessage("Không tải được thực đơn. Vui lòng thử lại.")
    } else {
      setCategories(categoryResult.data || [])
      setItems(itemResult.data || [])
      setToppings(toppingResult.data || [])
    }
    setLoading(false)
  }

  const categoryMap = useMemo(() => {
    const result: Record<string, string> = {}
    categories.forEach((item) => { result[item.id] = item.name })
    return result
  }, [categories])

  const visibleItems = useMemo(() => {
    if (category === "Tất cả") return items
    return items.filter((item) => categoryMap[item.category_id || ""] === category)
  }, [items, category, categoryMap])

  const chosenToppings = toppings.filter((item) => selectedToppings.includes(item.id))
  const toppingTotal = chosenToppings.reduce((total, item) => total + item.price, 0)
  const selectedBasePrice = selectedItem ? selectedItem.price + (size === "L" ? 10000 : 0) : 0
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)
  const cartTotal = cart.reduce((total, item) => total + (item.price + item.toppingTotal) * item.quantity, 0)

  function openItem(item: MenuItem) {
    setSelectedItem(item)
    setSize("M")
    setSugar(50)
    setIce(50)
    setSelectedToppings([])
    setNote("")
  }

  function addToCart() {
    if (!selectedItem) return
    const toppingIds = [...selectedToppings].sort()
    const key = [selectedItem.id, size, sugar, ice, toppingIds.join(","), note.trim()].join("|")

    const newItem: CartItem = {
      key,
      menuItemId: selectedItem.id,
      name: selectedItem.name,
      price: selectedBasePrice,
      quantity: 1,
      size,
      sugar,
      ice,
      toppingIds,
      toppingNames: chosenToppings.map((item) => item.name),
      toppingTotal,
      note: note.trim(),
    }

    setCart((current) => {
      const existing = current.find((item) => item.key === key)
      if (existing) {
        return current.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...current, newItem]
    })
    setSelectedItem(null)
    setCartOpen(true)
  }

  function changeQuantity(key: string, amount: number) {
    setCart((current) =>
      current
        .map((item) => item.key === key ? { ...item, quantity: item.quantity + amount } : item)
        .filter((item) => item.quantity > 0)
    )
  }

  async function getTableId() {
    const { data, error } = await supabase
      .from("tables")
      .select("id")
      .eq("table_number", Number(table))
      .eq("active", true)
      .single()
    if (error || !data) return null
    return data.id
  }

  async function callStaff() {
    const tableId = await getTableId()
    if (!tableId) {
      setMessage("Không xác định được bàn.")
      return
    }

    const { error } = await supabase.from("staff_calls").insert({
      table_id: tableId,
      status: "pending",
    })

    setMessage(error ? "Chưa gọi được nhân viên. Vui lòng thử lại." : `🔔 Đã gọi nhân viên đến Bàn ${table}`)
    setTimeout(() => setMessage(""), 3500)
  }

  async function placeOrder() {
    if (!cart.length || placing) return
    setPlacing(true)

    const tableId = await getTableId()
    if (!tableId) {
      setMessage("Không xác định được bàn.")
      setPlacing(false)
      return
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        table_id: tableId,
        status: "pending",
        payment_status: "unpaid",
        total_amount: cartTotal,
      })
      .select("id")
      .single()

    if (orderError || !order) {
      setMessage("Không tạo được đơn hàng. Vui lòng thử lại.")
      setPlacing(false)
      return
    }

    const rows = cart.map((item) => ({
      order_id: order.id,
      menu_item_id: item.menuItemId,
      item_name: item.name,
      quantity: item.quantity,
      size: item.size,
      sugar_percent: item.sugar,
      ice_percent: item.ice,
      unit_price: item.price + item.toppingTotal,
      note: item.note || null,
    }))

    const { data: orderItems, error: itemError } = await supabase
      .from("order_items")
      .insert(rows)
      .select("id")

    if (itemError || !orderItems) {
      setMessage("Không lưu được món trong đơn.")
      setPlacing(false)
      return
    }

    const toppingRows = cart.flatMap((cartItem, index) =>
      cartItem.toppingIds.map((id) => {
        const topping = toppings.find((item) => item.id === id)
        if (!topping) return null
        return {
          order_item_id: orderItems[index].id,
          topping_id: topping.id,
          topping_name: topping.name,
          price: topping.price,
        }
      }).filter(Boolean)
    )

    if (toppingRows.length) {
      await supabase.from("order_item_toppings").insert(toppingRows)
    }

    setCart([])
    setCartOpen(false)
    setMessage(`✅ Đã gửi đơn thành công — Bàn ${table}`)
    setPlacing(false)
    setTimeout(() => setMessage(""), 4000)
  }

  return (
    <>
      <main className="page">
        <section className="hero">
          <div className="top">
            <div className="logo">OMELY COFFEE</div>
            <div className="table">BÀN {table}</div>
          </div>
          <div className="heroContent">
            <h1>Chậm một chút.<br />Thưởng thức nhiều hơn.</h1>
            <p>Coffee • Tea • Bakery • Slow moments</p>
          </div>
        </section>

        <section className="content">
          <div className="heading">
            <div>
              <h2>Thực đơn hôm nay</h2>
              <p>Chọn món bạn muốn thưởng thức</p>
            </div>
            {cartCount > 0 && (
              <button className="cartButton" onClick={() => setCartOpen(true)}>
                🛍 {cartCount} món · {money(cartTotal)}
              </button>
            )}
          </div>

          <div className="categories">
            <button className={category === "Tất cả" ? "category active" : "category"} onClick={() => setCategory("Tất cả")}>
              Tất cả
            </button>
            {categories.map((item) => (
              <button
                key={item.id}
                className={category === item.name ? "category active" : "category"}
                onClick={() => setCategory(item.name)}
              >
                {item.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="loading">Đang tải thực đơn...</div>
          ) : (
            <div className="grid">
              {visibleItems.map((item) => (
                <article className="card" key={item.id}>
                  <div className="photo" style={{ backgroundImage: `url("${item.image_url || ""}")` }} />
                  <div className="info">
                    <div className="tag">{categoryMap[item.category_id || ""] || "OMELY"}</div>
                    <div className="name">{item.name}</div>
                    <div className="description">{item.description}</div>
                    <div className="priceRow">
                      <strong>{money(item.price)}</strong>
                      <button className="addButton" onClick={() => openItem(item)}>+</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <div className="bottomBar">
        <button className="staffButton" onClick={callStaff}>🔔 GỌI NHÂN VIÊN</button>
        {cartCount > 0 && (
          <button className="bottomCart" onClick={() => setCartOpen(true)}>
            🛍 GIỎ HÀNG · {money(cartTotal)}
          </button>
        )}
      </div>

      {message && <div className="toast">{message}</div>}

      {selectedItem && (
        <div className="overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <button className="close" onClick={() => setSelectedItem(null)}>×</button>
            <h3>{selectedItem.name}</h3>
            <div className="modalPrice">{money(selectedBasePrice + toppingTotal)}</div>

            <label>Size</label>
            <div className="choices">
              <button className={size === "M" ? "selected" : ""} onClick={() => setSize("M")}>M</button>
              <button className={size === "L" ? "selected" : ""} onClick={() => setSize("L")}>L +10.000đ</button>
            </div>

            <label>Đường: {sugar}%</label>
            <input type="range" min="0" max="100" step="25" value={sugar} onChange={(event) => setSugar(Number(event.target.value))} />

            <label>Đá: {ice}%</label>
            <input type="range" min="0" max="100" step="25" value={ice} onChange={(event) => setIce(Number(event.target.value))} />

            {toppings.length > 0 && (
              <>
                <label>Topping</label>
                <div className="toppings">
                  {toppings.map((item) => {
                    const selected = selectedToppings.includes(item.id)
                    return (
                      <button
                        key={item.id}
                        className={selected ? "topping selected" : "topping"}
                        onClick={() => setSelectedToppings((current) =>
                          selected ? current.filter((id) => id !== item.id) : [...current, item.id]
                        )}
                      >
                        <span>{item.name}</span>
                        <span>+{money(item.price)}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            <label>Ghi chú</label>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ví dụ: ít ngọt, không đá..." rows={3} />

            <button className="primary" onClick={addToCart}>
              Thêm vào giỏ · {money(selectedBasePrice + toppingTotal)}
            </button>
          </div>
        </div>
      )}

      {cartOpen && (
        <div className="overlay" onClick={() => setCartOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <button className="close" onClick={() => setCartOpen(false)}>×</button>
            <h3>Giỏ hàng · Bàn {table}</h3>

            {cart.map((item) => (
              <div className="cartItem" key={item.key}>
                <div>
                  <strong>{item.name}</strong>
                  <small>
                    {item.size} · Đường {item.sugar}% · Đá {item.ice}%
                    {item.toppingNames.length ? ` · ${item.toppingNames.join(", ")}` : ""}
                  </small>
                </div>
                <div className="quantity">
                  <button onClick={() => changeQuantity(item.key, -1)}>−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => changeQuantity(item.key, 1)}>+</button>
                </div>
              </div>
            ))}

            <div className="total">
              <span>Tổng cộng</span>
              <strong>{money(cartTotal)}</strong>
            </div>

            <button className="primary" disabled={placing} onClick={placeOrder}>
              {placing ? "Đang gửi đơn..." : "XÁC NHẬN ĐẶT MÓN"}
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #f7f3ed; color: #2b211b; font-family: Arial, Helvetica, sans-serif; }
        body { padding-bottom: 92px; }
        button, input, textarea { font: inherit; }
        button { cursor: pointer; }

        .hero { min-height: 310px; padding: 30px 20px 45px; background: #211914; color: white; }
        .top { display: flex; align-items: center; justify-content: space-between; }
        .logo { font-size: 15px; font-weight: 800; letter-spacing: 3px; }
        .table { padding: 9px 14px; border: 1px solid #ffffff55; border-radius: 999px; font-size: 13px; }
        .heroContent { max-width: 700px; margin: 70px auto 0; }
        .hero h1 { margin: 0 0 16px; font-family: Georgia, serif; font-size: clamp(36px, 8vw, 60px); line-height: 1.02; font-weight: 500; }
        .hero p { margin: 0; opacity: .7; }

        .content { max-width: 1180px; margin: auto; padding: 30px 18px 120px; }
        .heading { display: flex; align-items: center; justify-content: space-between; gap: 15px; }
        h2 { margin: 0; font-family: Georgia, serif; font-size: 30px; }
        .heading p { margin: 6px 0 0; color: #7d7067; }
        .cartButton { border: 0; border-radius: 999px; padding: 12px 16px; background: #2b211b; color: white; }

        .categories { display: flex; gap: 9px; overflow-x: auto; padding: 22px 0; scrollbar-width: none; }
        .categories::-webkit-scrollbar { display: none; }
        .category { flex: 0 0 auto; border: 1px solid #ded4ca; border-radius: 999px; padding: 10px 15px; background: white; color: #5e5148; }
        .category.active { background: #2b211b; border-color: #2b211b; color: white; }

        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 18px; }
        .card { overflow: hidden; border-radius: 20px; background: white; box-shadow: 0 7px 25px #2d1e1412; }
        .photo { height: 210px; background-color: #e9e1d8; background-position: center; background-size: cover; }
        .info { padding: 17px; }
        .tag { margin-bottom: 7px; color: #a08167; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
        .name { font-family: Georgia, serif; font-size: 22px; font-weight: 600; }
        .description { min-height: 40px; margin: 7px 0 15px; color: #7d7067; font-size: 14px; line-height: 1.45; }
        .priceRow { display: flex; align-items: center; justify-content: space-between; }
        .addButton { width: 40px; height: 40px; border: 0; border-radius: 50%; background: #2b211b; color: white; font-size: 26px; }
        .loading { padding: 70px 20px; text-align: center; color: #7d7067; }

        .bottomBar { position: fixed; right: 0; bottom: 0; left: 0; z-index: 40; display: flex; justify-content: center; gap: 10px; padding: 12px 15px; background: #f7f3edee; border-top: 1px solid #ded4ca; backdrop-filter: blur(10px); }
        .staffButton, .bottomCart { border: 0; border-radius: 999px; padding: 13px 18px; background: #2b211b; color: white; box-shadow: 0 6px 20px #0002; }
        .toast { position: fixed; left: 50%; bottom: 86px; z-index: 100; transform: translateX(-50%); max-width: calc(100vw - 30px); padding: 12px 17px; border-radius: 12px; background: #2b211b; color: white; text-align: center; }

        .overlay { position: fixed; inset: 0; z-index: 80; display: flex; align-items: flex-end; justify-content: center; padding: 14px; background: #140f0c9e; }
        .modal { position: relative; width: min(560px, 100%); max-height: 90vh; overflow-y: auto; padding: 24px; border-radius: 24px; background: white; }
        .close { position: absolute; top: 14px; right: 16px; width: 38px; height: 38px; border: 0; border-radius: 50%; background: #f0ebe5; font-size: 25px; }
        .modal h3 { margin: 0 45px 4px 0; font-family: Georgia, serif; font-size: 28px; }
        .modalPrice { margin-bottom: 20px; font-weight: 700; }
        .modal label { display: block; margin: 17px 0 9px; font-size: 14px; font-weight: 700; }
        .choices { display: flex; gap: 8px; }
        .choices button { border: 1px solid #ded4ca; border-radius: 12px; padding: 11px 13px; background: white; }
        .choices button.selected, .topping.selected { border-color: #2b211b; background: #2b211b; color: white; }
        input[type="range"] { width: 100%; }
        .toppings { display: grid; gap: 8px; }
        .topping { display: flex; justify-content: space-between; border: 1px solid #ded4ca; border-radius: 12px; padding: 11px 13px; background: white; text-align: left; }
        textarea { width: 100%; resize: vertical; border: 1px solid #ded4ca; border-radius: 12px; padding: 12px; }
        .primary { width: 100%; margin-top: 18px; border: 0; border-radius: 14px; padding: 15px; background: #2b211b; color: white; font-weight: 700; }
        .primary:disabled { opacity: .55; }

        .cartItem { display: flex; align-items: center; justify-content: space-between; gap: 15px; padding: 15px 0; border-bottom: 1px solid #eee7e0; }
        .cartItem small { display: block; margin-top: 5px; color: #7d7067; line-height: 1.4; }
        .quantity { display: flex; align-items: center; gap: 9px; }
        .quantity button { width: 32px; height: 32px; border: 1px solid #ded4ca; border-radius: 50%; background: white; }
        .total { display: flex; justify-content: space-between; padding-top: 20px; font-size: 19px; }

        @media (max-width: 600px) {
          .heading { align-items: flex-start; }
          .heading p { font-size: 13px; }
          .cartButton { padding: 10px 12px; font-size: 12px; }
          .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .photo { height: 150px; }
          .info { padding: 13px; }
          .name { font-size: 18px; }
          .description { min-height: 52px; font-size: 12px; }
          .addButton { width: 36px; height: 36px; }
          .bottomBar { padding: 10px; }
          .staffButton, .bottomCart { padding: 12px 14px; font-size: 12px; }
        }
      `}</style>
    </>
  )
}
