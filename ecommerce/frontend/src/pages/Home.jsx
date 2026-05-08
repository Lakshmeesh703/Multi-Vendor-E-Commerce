import React, { useEffect, useMemo, useState } from 'react'

export default function Home({ featuredProducts = [], categories = [] }){
  const [products, setProducts] = useState([])
  const displayProducts = useMemo(() => (products.length ? products : featuredProducts), [products, featuredProducts])
  useEffect(()=>{
    fetch('/api/products').then(r=>r.json()).then(setProducts).catch(()=>setProducts([]))
  },[])
  return (
    <div className="home-layout">
      <div className="home-spotlight">
        <div>
          <span className="eyebrow">Trending now</span>
          <h2>Fast-moving offers, curated categories, and vendor-backed deals.</h2>
          <p>Marketplace homepage styled for the scale and clarity people expect from major retail platforms.</p>
        </div>
        <div className="spotlight-badges">
          <span>Lightning deals</span>
          <span>Verified sellers</span>
          <span>Easy returns</span>
        </div>
      </div>
      <div className="home-category-row">
        {categories.map(item => <div key={item.name} className="home-category-pill">{item.icon} {item.name}</div>)}
      </div>
      <div className="home-product-section">
        {displayProducts.length===0 ? <p>No products available yet.</p> : (
          displayProducts.map(p => (
            <article key={p.id || p._id} className="home-product-card">
              <div className="home-product-image" style={{ background: p.gradient || 'linear-gradient(135deg,#f8d66d,#ff7a59)' }} />
              <strong>{p.title}</strong>
              <span>{p.subtitle || p.description}</span>
              <div className="home-product-meta">
                <b>{p.price}</b>
                <small>{p.rating || 4.6} ★</small>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  )
}
