"use client"

import { useState } from "react"

type Product = {
  category: string
  name: string
  price: number
  image: string
  description: string
}

type CartItem = {
  name: string
  price: number
  size: string
  sugar: string
  ice: string
}

const PRODUCTS: Product[] = [
  {category:"Cà phê",name:"Cà phê sữa",price:39000,image:"https://images.unsplash.com/photo-1461023058943-07cb3f5b9c4a?auto=format&fit=crop&w=700&q=80",description:"Đậm vị cà phê, dịu ngọt sữa."},
  {category:"Cà phê",name:"Americano",price:39000,image:"https://images.unsplash.com/photo-1497515114629-f71d768fd07c?auto=format&fit=crop&w=700&q=80",description:"Thanh, sạch và thơm."},
  {category:"Trà sữa",name:"Trà sữa truyền thống",price:49000,image:"https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=700&q=80",description:"Béo nhẹ, thơm trà, trân châu."},
  {category:"Trà sữa",name:"Matcha latte",price:55000,image:"https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=700&q=80",description:"Matcha xanh, sữa mịn."},
  {category:"Trà",name:"Trà đào cam sả",price:49000,image:"https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=700&q=80",description:"Tươi mát, thơm đào và sả."},
  {category:"Bánh & Đồ ăn",name:"Croissant bơ",price:42000,image:"https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=700&q=80",description:"Giòn ngoài, mềm thơm."}
]

const CATEGORIES=["Tất cả","Cà phê","Trà sữa","Trà","Bánh & Đồ ăn"]
const SUGAR_OPTIONS=["0%","30%","50%","70%","100%"]
const ICE_OPTIONS=["Không đá","30%","50%","70%","100%"]
const SIZE_OPTIONS=["M","L"]

function formatMoney(value:number){return `${value.toLocaleString("vi-VN")}đ`}

export default function Home(){
  const [category,setCategory]=useState("Tất cả")
  const [cart,setCart]=useState<CartItem[]>([])
  const [selectedProduct,setSelectedProduct]=useState<Product|null>(null)
  const [size,setSize]=useState("M")
  const [sugar,setSugar]=useState("50%")
  const [ice,setIce]=useState("50%")

  const table=typeof window==="undefined"?"07":new URLSearchParams(window.location.search).get("table")||"07"
  const filteredProducts=category==="Tất cả"?PRODUCTS:PRODUCTS.filter(p=>p.category===category)
  const total=cart.reduce((sum,item)=>sum+item.price,0)

  function openProduct(product:Product){
    setSelectedProduct(product);setSize("M");setSugar("50%");setIce("50%")
  }

  function addToCart(){
    if(!selectedProduct)return
    const finalPrice=selectedProduct.price+(size==="L"?10000:0)
    setCart(current=>[...current,{name:selectedProduct.name,price:finalPrice,size,sugar,ice}])
    setSelectedProduct(null)
  }

  function showCart(){
    if(cart.length===0){window.alert("Giỏ hàng đang trống.");return}
    const detail=cart.map((item,index)=>`${index+1}. ${item.name} • Size ${item.size} • ${item.sugar} đường • ${item.ice} đá • ${formatMoney(item.price)}`).join("\n")
    window.alert(`BÀN ${table}\n\n${detail}\n\nTỔNG: ${formatMoney(total)}\n\nThanh toán: Tiền mặt / Chuyển khoản`)
  }

  return <main className="wrap">
    <section className="hero">
      <div className="logo">OMELY COFFEE</div>
      <div className="pill">BÀN {table}</div>
      <div><h1>Chậm một chút.<br/>Thưởng thức nhiều hơn.</h1><p>Coffee • Tea • Bakery • Slow moments</p></div>
    </section>

    <section className="content">
      <h2>Thực đơn hôm nay</h2>
      <div className="cats">{CATEGORIES.map(item=><button type="button" key={item} className={`cat ${category===item?"active":""}`} onClick={()=>setCategory(item)}>{item}</button>)}</div>
      <div className="grid">{filteredProducts.map(product=><article className="card" key={product.name}>
        <div className="photo" style={{backgroundImage:`url("${product.image}")`}}/>
        <div className="info"><div className="tag">{product.category}</div><div className="name">{product.name}</div><div className="desc">{product.description}</div><div className="row"><b>{formatMoney(product.price)}</b><button type="button" className="add" onClick={()=>openProduct(product)}>+</button></div></div>
      </article>)}</div>
    </section>

    <div className="bar">
      <button type="button" className="staff" onClick={()=>window.alert(`🔔 Đã gọi nhân viên đến Bàn ${table}`)}>🔔 GỌI NHÂN VIÊN</button>
      <button type="button" className="cart" onClick={showCart}>🛍 GIỎ HÀNG {formatMoney(total)}</button>
    </div>

    {selectedProduct&&<div className="modal" style={{display:"flex"}}>
      <div className="sheet">
        <button type="button" onClick={()=>setSelectedProduct(null)}>×</button>
        <h2>{selectedProduct.name}</h2><p className="meta">{selectedProduct.description}</p>
        <b>Size</b><div>{SIZE_OPTIONS.map(item=><button type="button" key={item} className={`choice ${size===item?"selected":""}`} onClick={()=>setSize(item)}>{item}</button>)}</div><br/>
        <b>Đường</b><div>{SUGAR_OPTIONS.map(item=><button type="button" key={item} className={`choice ${sugar===item?"selected":""}`} onClick={()=>setSugar(item)}>{item}</button>)}</div><br/>
        <b>Đá</b><div>{ICE_OPTIONS.map(item=><button type="button" key={item} className={`choice ${ice===item?"selected":""}`} onClick={()=>setIce(item)}>{item}</button>)}</div><br/>
        <button type="button" className="primary" onClick={addToCart}>THÊM VÀO GIỎ</button>
      </div>
    </div>}
  </main>
}
