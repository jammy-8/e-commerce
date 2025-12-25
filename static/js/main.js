document.addEventListener('DOMContentLoaded', ()=>{
  const cartKey = 'myshop_cart'
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

    const dialog = document.getElementById('myDialog');
    const closeBtn = document.getElementById('closeDialogBtn');
    const openBtn = document.querySelectorAll('#openDialogBtn');

    openBtn.forEach(btn => {
      btn.addEventListener('click', () => {
        dialog.showModal();
      });
    });

    closeBtn.addEventListener('click', () => { dialog.close(); });

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        dialog.close();
      }
    });


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

  // Navbar cart behavior: ensure clicking the navbar cart goes to the checkout page
  (function(){
    const cartControl = document.getElementById('cart-btn');
    if(!cartControl) return;
    // If it's an actual <button> (legacy), redirect explicitly. If it's an <a>, default navigation applies.
    if(cartControl.tagName === 'BUTTON'){
      cartControl.addEventListener('click', ()=>{ window.location.href = '/checkout/'; });
    }
  })();

  // Checkout: render cart from localStorage and submit to `/checkout/` using the same cart format
  (function checkoutIntegration(){
    const itemsEl = document.getElementById('checkout-items');
    const totalEl = document.getElementById('checkout-total');
    if(!itemsEl || !totalEl) return; // not on checkout page

    function loadLocalCart(){
      try{ return JSON.parse(localStorage.getItem('myshop_cart'))||[] }catch(e){ return [] }
    }

    function render(){
      const cart = loadLocalCart();
      itemsEl.innerHTML = '';
      let total = 0;
      cart.forEach(it=>{
        const li = document.createElement('li');
        li.textContent = `${it.title || 'Item'} × ${it.qty} — $${(parseFloat(it.price)||0*it.qty).toFixed(2)}`;
        itemsEl.appendChild(li);
        total += (parseFloat(it.price)||0) * (parseInt(it.qty)||0);
      });
      totalEl.textContent = total.toFixed(2);
      return {cart, total};
    }

    // Re-render when storage changes (other tabs) and after local updates
    window.addEventListener('storage', (e)=>{ if(e.key === 'myshop_cart') render(); });
    render();

    const form = document.getElementById('checkout-form');
    const msg = document.getElementById('checkout-msg');
    if(!form) return;

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      msg.textContent = '';
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const address = document.getElementById('address').value.trim();
      const city = document.getElementById('city').value.trim();
      const postcode = document.getElementById('postcode').value.trim();
      const country = document.getElementById('country').value.trim();

      const current = render();
      if(!current.cart || !current.cart.length){ msg.textContent = 'Your cart is empty.'; return }
      if(!name || !email || !address){ msg.textContent = 'Please provide name, email and address.'; return }

      const payload = { cart: current.cart, customer: {name, email, phone, address, city, postcode, country} };

      msg.textContent = 'Placing order...';
      try{
        const res = await fetch('/checkout/', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': (document.cookie.match('(^|;)\\s*csrftoken\\s*=\\s*([^;]+)')||[]).pop() || '' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if(data.ok){
          // clear local cart and redirect
          localStorage.removeItem('myshop_cart');
          window.location.href = '/checkout/success/';
        } else {
          msg.textContent = data.error || data.message || 'Failed to place order.';
        }
      }catch(err){
        msg.textContent = 'Network error while placing order.';
        console.error(err);
      }
    });
  })();

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
})


