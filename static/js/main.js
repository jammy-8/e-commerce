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
  // internal state for transition handling
  let _navCloseTimeout = null
  function _onNavTransitionEnd(e){
    if(!navMenu) return
    if(e.target !== navMenu) return
    // only hide when we're closing (i.e., open class is NOT present)
    if(navMenu.classList.contains('open')) return
    navMenu.setAttribute('hidden','')
    navMenu.removeEventListener('transitionend', _onNavTransitionEnd)
    if(_navCloseTimeout){ clearTimeout(_navCloseTimeout); _navCloseTimeout = null }
  }

  function openNav(){
    if(!navToggle || !navMenu) return
    console.log('[NAV] openNav called')
    // ensure any pending close cleanup is cleared
    if(_navCloseTimeout){ clearTimeout(_navCloseTimeout); _navCloseTimeout = null }
    navMenu.removeEventListener('transitionend', _onNavTransitionEnd)

    navToggle.classList.add('open')
    navToggle.setAttribute('aria-expanded','true')
    // make visible, force reflow, then add open class to trigger transition
    navMenu.removeAttribute('hidden')
    // force reflow so transition always runs
    void navMenu.offsetWidth
    navMenu.classList.add('open')
    navMenu.setAttribute('aria-hidden','false')
    document.documentElement.style.overflow = 'hidden'
  }

  function closeNav(){
    if(!navToggle || !navMenu) return
    console.log('[NAV] closeNav called')
    navToggle.classList.remove('open')
    navToggle.setAttribute('aria-expanded','false')
    // start closing animation
    navMenu.classList.remove('open')
    navMenu.setAttribute('aria-hidden','true')
    document.documentElement.style.overflow = ''
    // wait for transition to finish before setting hidden to preserve animation
    navMenu.addEventListener('transitionend', _onNavTransitionEnd)
    // fallback in case transitionend doesn't fire
    _navCloseTimeout = setTimeout(()=>{
      try{ if(navMenu && !navMenu.classList.contains('open')) navMenu.setAttribute('hidden','') }catch(e){}
      if(navMenu) navMenu.removeEventListener('transitionend', _onNavTransitionEnd)
      _navCloseTimeout = null
    }, 350)
  }

  if(navToggle && navMenu){
    navToggle.addEventListener('click', (e)=>{
      e.stopPropagation()
      console.log('[NAV] navToggle clicked', navToggle, 'menu open?', navMenu.classList.contains('open'))
      if(!navMenu.classList.contains('open')) openNav(); else closeNav()
    })

    navMenu.addEventListener('click', (e)=>{
      if(e.target.tagName === 'A') closeNav()
    })

    document.addEventListener('keydown', (e)=>{
      if(e.key === 'Escape') closeNav()
    })

    // mark as initialized to avoid duplicate listeners when initNavbar runs
    navToggle.dataset.navInited = 'true'
  }

  // indicate whether we're showing/storing the cart locally or using the server
  let cartSource = 'local'

  function getCSRF(){ const v = document.cookie.match('(^|;)\\s*csrftoken\\s*=\\s*([^;]+)'); return v ? v.pop() : '' }

  function loadCart(){
    try{ return JSON.parse(localStorage.getItem(cartKey))||[] }catch(e){return[]}
  }
  function saveCart(cart){ localStorage.setItem(cartKey, JSON.stringify(cart)); renderCartFromList(cart) }

  function addToCart(id, title, price){
    // local update
    const cart = loadCart()
    const found = cart.find(i=>i.id===id)
    if(found){ found.qty += 1 } else { cart.push({id,title,price,qty:1}) }
    saveCart(cart)

    // if we're using server-backed cart, push the full cart to server
    if(cartSource === 'server'){
      fetch('/api/cart/sync/', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRF() }, body: JSON.stringify({cart}) }).catch(()=>{})
    }
  }

  async function removeFromCart(id){
    if(cartSource === 'server'){
      try{
        const res = await fetch('/api/cart/')
        if(!res.ok) return
        const data = await res.json()
        const newCart = data.cart.filter(i=>String(i.id)!==String(id))
        await fetch('/api/cart/sync/', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRF() }, body: JSON.stringify({cart: newCart}) })
        renderCartFromList(newCart)
      }catch(e){ console.error(e) }
    } else {
      const cart = loadCart().filter(i=>i.id!==id); saveCart(cart)
    }
  }

  function clearCart(){ localStorage.removeItem(cartKey); renderCart(); if(cartSource === 'server'){ fetch('/api/cart/sync/', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRF() }, body: JSON.stringify({cart: []}) }).catch(()=>{}) } }

  function renderCartFromList(cart){
    if(!cartItemsEl || !cartCountEl || !cartTotalEl) return
    cartItemsEl.innerHTML = ''
    let total = 0
    cart.forEach(item=>{
      total += item.price * item.qty
      const li = document.createElement('li')
      li.innerHTML = `<span>${item.title} × ${item.qty}</span><button class=\"btn\" data-remove=\"${item.id}\">$${(item.price*item.qty).toFixed(2)}</button>`
      cartItemsEl.appendChild(li)
    })
    cartCountEl.textContent = cart.reduce((s,i)=>s+i.qty,0)
    cartTotalEl.textContent = total.toFixed(2)
  }

  function renderCart(){ renderCartFromList(loadCart()) }

  // Attempt to sync cart to server (works only when the user is authenticated)
  (function trySyncCart(){
    const cart = loadCart()
    if(!cart || !cart.length) return
    // send but don't block UI
    try{
      fetch('/api/cart/sync/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRF()
        },
        body: JSON.stringify({cart})
      }).catch(()=>{})
    }catch(e){/* ignore */}
  })();

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
  if (cartBtn) cartBtn.addEventListener('click', ()=>{ if (cartModal) { cartModal.classList.remove('hidden'); cartModal.setAttribute('aria-hidden','false') } })
  if (closeCart) closeCart.addEventListener('click', ()=>{ if (cartModal) { cartModal.classList.add('hidden'); cartModal.setAttribute('aria-hidden','true') } })
  if (clearCartBtn) clearCartBtn.addEventListener('click', ()=>{ clearCart() })

  // Checkout button in the cart modal should open the checkout page
  const checkoutBtn = document.getElementById('checkout')
  if (checkoutBtn) checkoutBtn.addEventListener('click', ()=>{ window.location.href = '/checkout/' })

  // remove item by clicking price button
  cartItemsEl.addEventListener('click', e=>{
    const removeId = e.target.dataset.remove
    if(removeId) removeFromCart(removeId)
  })

async function includeHTML() {
  document.querySelectorAll('[data-include]').forEach(async el => {
    const url = el.dataset.include;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.status);
      el.innerHTML = await res.text();
      initNavbar(el); // initialize event handlers inside inserted HTML
    } catch (err) {
      console.error('include failed', url, err);
    }
  });
}

function initNavbar(root = document) {
  const navToggle = root.querySelector('#nav-toggle');
  const navMenu = root.querySelector('#nav-menu');
  if (!navToggle || !navMenu) return;
  if (navToggle.dataset.navInited) return; // avoid adding duplicate listeners

  const openNav = () => {
    navToggle.classList.add('open');
    navToggle.setAttribute('aria-expanded','true');
    navMenu.classList.add('open');
    navMenu.removeAttribute('hidden');
    navMenu.setAttribute('aria-hidden','false');
    document.documentElement.style.overflow = 'hidden';
  };

  const closeNav = () => {
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded','false');
    navMenu.classList.remove('open');
    navMenu.setAttribute('aria-hidden','true');
    navMenu.setAttribute('hidden','');
    document.documentElement.style.overflow = '';
  };

  navToggle.addEventListener('click', e => { e.stopPropagation(); navMenu.classList.contains('open') ? closeNav() : openNav(); });
  navMenu.addEventListener('click', (e) => { if (e.target.tagName === 'A') closeNav(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });

  navToggle.dataset.navInited = 'true';
}

// initialize
includeHTML();
initNavbar();
renderCart();



  const form = loginWrapper.querySelector('form');
  const userInput = document.getElementById('id_username');
  const passInput = document.getElementById('id_password');
  const popup = document.getElementById('login-error-popup');
  if(!loginWrapper) return;

  // only attach validation on actual login forms that have both username and password inputs
  if(!userInput || !passInput) return;

  let autoHideTimer = null;

  function showPopup(msg){
    if(!popup) { alert(msg); return; }
    popup.querySelector('.popup-content').textContent = msg;
    // make visible with transition
    popup.classList.remove('hidden');
    // allow next tick for transition
    requestAnimationFrame(()=> popup.classList.add('visible'));
    popup.setAttribute('aria-hidden','false');
    popup.focus && popup.focus();
    document.addEventListener('keydown', onKeyDown);
    // auto-hide after 4 seconds
    clearTimeout(autoHideTimer);
    autoHideTimer = setTimeout(hidePopup, 4000);
  }

  function hidePopup(){
    if(!popup) return;
    clearTimeout(autoHideTimer);
    popup.classList.remove('visible');
    popup.setAttribute('aria-hidden','true');
    document.removeEventListener('keydown', onKeyDown);
    // after transition ends, add hidden to remove from flow
    setTimeout(()=>{
      if(!popup.classList.contains('visible')) popup.classList.add('hidden');
    }, 350);
  }

  function onKeyDown(e){ if(e.key === 'Escape') hidePopup(); }

  if(popup) popup.addEventListener('click', e => { if(e.target === popup) hidePopup(); });

  if(form){
    form.addEventListener('submit', function(e){
      const u = userInput && userInput.value.trim();
      const p = passInput && passInput.value.trim();
      if(!u || !p){
        e.preventDefault();
        showPopup('requires username or password');
      }
    });
  }
})


