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
    console.log('[NAV] openNav called')
    navToggle.classList.add('open')
    navToggle.setAttribute('aria-expanded','true')
    navMenu.classList.add('open')
    navMenu.removeAttribute('hidden')
    navMenu.setAttribute('aria-hidden','false')
    document.documentElement.style.overflow = 'hidden'
  }

  function closeNav(){
    if(!navToggle || !navMenu) return
    console.log('[NAV] closeNav called')
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
    if(!cartItemsEl || !cartCountEl || !cartTotalEl) return
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
  if (cartBtn) cartBtn.addEventListener('click', ()=>{ if (cartModal) { cartModal.classList.remove('hidden'); cartModal.setAttribute('aria-hidden','false') } })
  if (closeCart) closeCart.addEventListener('click', ()=>{ if (cartModal) { cartModal.classList.add('hidden'); cartModal.setAttribute('aria-hidden','true') } })
  if (clearCartBtn) clearCartBtn.addEventListener('click', ()=>{ clearCart() })

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

// login form validation popup
(function initLoginValidation(){
  const loginWrapper = document.querySelector('.login-wrapper');
  if(!loginWrapper) return;
  const form = loginWrapper.querySelector('form');
  const userInput = document.getElementById('id_username');
  const passInput = document.getElementById('id_password');
  const popup = document.getElementById('login-error-popup');

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
})();

})