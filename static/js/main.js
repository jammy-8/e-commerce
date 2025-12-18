document.addEventListener('DOMContentLoaded', ()=>{
  const cartKey = 'myshop_cart_v1'
  const cartBtn = document.getElementById('cart-btn')
  const cartModal = document.getElementById('cart-modal')
  const closeCart = document.getElementById('close-cart')
  const cartItemsEl = document.getElementById('cart-items')
  const cartCountEl = document.getElementById('cart-count')
  const cartTotalEl = document.getElementById('cart-total')
  const clearCartBtn = document.getElementById('clear-cart')

  // Navigation (hamburger / side menu)
  const navToggle = document.getElementById('nav-toggle')
  const navMenu = document.getElementById('nav-menu')

  function openNav(){
    if(!navToggle || !navMenu) return
    navToggle.classList.add('open')
    navToggle.setAttribute('aria-expanded','true')
    navMenu.classList.add('open')
    navMenu.removeAttribute('hidden')
    navMenu.setAttribute('aria-hidden','false')
    document.documentElement.style.overflow = 'hidden'
  }

  function closeNav(){
    if(!navToggle || !navMenu) return
    navToggle.classList.remove('open')
    navToggle.setAttribute('aria-expanded','false')
    navMenu.classList.remove('open')
    navMenu.setAttribute('aria-hidden','true')
    navMenu.setAttribute('hidden','')
    document.documentElement.style.overflow = ''
  }

  if(navToggle && navMenu){
    navToggle.addEventListener('click', (e)=>{
      e.stopPropagation()
      if(!navMenu.classList.contains('open')) openNav(); else closeNav()
    })

    navMenu.addEventListener('click', (e)=>{
      if(e.target.tagName === 'A') closeNav()
    })

    document.addEventListener('keydown', (e)=>{
      if(e.key === 'Escape') closeNav()
    })
  }

  function loadCart(){
    try{ return JSON.parse(localStorage.getItem(cartKey))||[] }catch(e){return[]}
  }
  function saveCart(cart){ localStorage.setItem(cartKey, JSON.stringify(cart)); renderCart() }

  function addToCart(id, title, price){
    const cart = loadCart()
    const found = cart.find(i=>i.id===id)
    if(found){ found.qty += 1 } else { cart.push({id,title,price,qty:1}) }
    saveCart(cart)
  }

  function removeFromCart(id){ const cart = loadCart().filter(i=>i.id!==id); saveCart(cart) }
  function clearCart(){ localStorage.removeItem(cartKey); renderCart() }

  function renderCart(){
    const cart = loadCart();
    cartItemsEl.innerHTML = ''
    let total = 0
    cart.forEach(item=>{
      total += item.price * item.qty
      const li = document.createElement('li')
      li.innerHTML = `<span>${item.title} × ${item.qty}</span><button class="btn" data-remove="${item.id}">$${(item.price*item.qty).toFixed(2)}</button>`
      cartItemsEl.appendChild(li)
    })
    cartCountEl.textContent = cart.reduce((s,i)=>s+i.qty,0)
    cartTotalEl.textContent = total.toFixed(2)
  }

  // product buttons
  document.querySelectorAll('.product').forEach(prod => {
    const btn = prod.querySelector('.add-to-cart')
    btn.addEventListener('click', ()=>{
      const id = prod.dataset.id
      const price = parseFloat(prod.dataset.price)
      const title = prod.querySelector('h3').textContent.trim()
      addToCart(id, title, price)
    })
  })

  // open/close
  cartBtn.addEventListener('click', ()=>{ cartModal.classList.remove('hidden'); cartModal.setAttribute('aria-hidden','false') })
  closeCart.addEventListener('click', ()=>{ cartModal.classList.add('hidden'); cartModal.setAttribute('aria-hidden','true') })
  clearCartBtn.addEventListener('click', ()=>{ clearCart() })

  // remove item by clicking price button
  cartItemsEl.addEventListener('click', e=>{
    const removeId = e.target.dataset.remove
    if(removeId) removeFromCart(removeId)
  })

  // init
  renderCart()
})