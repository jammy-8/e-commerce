document.addEventListener("DOMContentLoaded", function() {

  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');
  let _navCloseTimeout = null;
  function _onNavTransitionEnd(e){
    if(!navMenu) {
    if(e.target !== navMenu) {
    if(navMenu.classList.contains('open')) {
    navMenu.setAttribute('hidden','');
    navMenu.removeEventListener('transitionend', _onNavTransitionEnd);
    if(_navCloseTimeout){ clearTimeout(_navCloseTimeout); _navCloseTimeout = null; }
        }
        return;
      }
      return;
    }
    return;
  }

  function openNav(){
    if(!navToggle || !navMenu) {return;}
    console.log('[NAV] openNav called');
    if(_navCloseTimeout){ clearTimeout(_navCloseTimeout); _navCloseTimeout = null; }
    navMenu.removeEventListener('transitionend', _onNavTransitionEnd);

    navToggle.classList.add('open');
    navToggle.setAttribute('aria-expanded','true');
    navMenu.removeAttribute('hidden');
    navMenu.classList.add('open');
    navMenu.setAttribute('aria-hidden','false');
    document.documentElement.style.overflow = 'hidden';
    }

  function closeNav(){
    if(!navToggle || !navMenu) {return;}
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded','false');

    navMenu.classList.remove('open');
    navMenu.setAttribute('aria-hidden','true');
    document.documentElement.style.overflow = '';

    navMenu.addEventListener('transitionend', _onNavTransitionEnd);

    _navCloseTimeout = setTimeout(()=>{
      try{ 
        if(navMenu && !navMenu.classList.contains('open')) {
          navMenu.setAttribute('hidden',''); }
        }catch(ignore){}
      if(navMenu) {
        navMenu.removeEventListener('transitionend', _onNavTransitionEnd);
      }
      _navCloseTimeout = null;
      }, 350);
    }

  if(navToggle && navMenu){
    navToggle.addEventListener('click', (e)=>{
      e.stopPropagation();
      console.log('[NAV] navToggle clicked', navToggle, 'menu open?', navMenu.classList.contains('open'));
      if(!navMenu.classList.contains('open')) {
        openNav(); 
      } else {closeNav();}
    });

    navMenu.addEventListener('click', (e)=>{
      if(e.target.tagName === 'A') {closeNav();}
    });

    document.addEventListener('keydown', (e)=>{
      if(e.key === 'Escape') {closeNav();}
    });


    navToggle.dataset.navInited = 'true';
  }

    const dialog = document.getElementById('myDialog');
    const closeBtn = document.getElementById('closeDialogBtn');
    const openBtn = document.querySelectorAll('#openDialogBtn');

    openBtn.forEach((btn) => {
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
  const elements = document.querySelectorAll('[data-include]');
  let res;
  let i;
  for (i = 0; i < elements.length; i+=1) {
    const el = elements[i];
    const url = el.dataset.include;
    try {
       res = await fetch(url);
      if (!res.ok) {
        return new Error(res.status);
      }
      el.innerHTML = await res.text();
      initNavbar(el); // initialize event handlers inside inserted HTML
    } catch (err) {
      console.error('include failed', url, err);
    }
  }
}

function initNavbar(root = document) {
  const navToggle2 = root.querySelector('#nav-toggle');
  const navMenu2 = root.querySelector('#nav-menu');
  if (!navToggle2 || !navMenu2) {return;}
  if (navToggle2.dataset.navInited) {return;}

  const openNav2 = () => {
    navToggle2.classList.add('open');
    navToggle2.setAttribute('aria-expanded','true');
    navMenu2.classList.add('open');
    navMenu2.removeAttribute('hidden');
    navMenu2.setAttribute('aria-hidden','false');
    document.documentElement.style.overflow = 'hidden';
  };

  const closeNav2 = () => {
    navToggle2.classList.remove('open');
    navToggle2.setAttribute('aria-expanded','false');
    navMenu2.classList.remove('open');
    navMenu2.setAttribute('aria-hidden','true');
    navMenu2.setAttribute('hidden','');
    document.documentElement.style.overflow = '';
  };

  navToggle2.addEventListener('click', (e) => { 
    e.stopPropagation(); 
    if (navMenu2.classList.contains('open')) { closeNav2();       
    } else 
      { openNav2(); 
    }
  });
  navMenu2.addEventListener('click', (e) => { if (e.target.tagName === 'A') {closeNav2();} });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') {closeNav2();} });

  navToggle2.dataset.navInited = 'true';
}


includeHTML();
initNavbar();


  function initCartButton(){
    const cartControl = document.getElementById('cart-btn');
    if(!cartControl) {return;}
    if(cartControl.tagName === 'BUTTON'){
      cartControl.addEventListener('click', ()=>{ window.location.href = '/checkout/'; });
    }
  }

  initCartButton();

  // Checkout: render cart from localStorage and submit to `/checkout/` using the same cart format
  function checkoutIntegration(){
    const itemsEl = document.getElementById('checkout-items');
    const totalEl = document.getElementById('checkout-total');
    if(!itemsEl || !totalEl) {return;} // not on checkout page

    function loadLocalCart(){
      try{ 
        return JSON.parse(localStorage.getItem('myshop_cart'))||[]; }
        catch(ignore) {return[];}
         }
    

    function render(){
      const cart = loadLocalCart();
      itemsEl.innerHTML = '';
      let total = 0;


      // cart.forEach((it)=>{
      //   const li = document.createElement('li');
      //   li.textContent = `${it.title || 'Item'} × ${it.qty} — £${((parseFloat(it.price)||0) * (parseInt(it.qty || 0))).toFixed(2)}`;
      //   itemsEl.appendChild(li);
      //   total += (parseFloat(it.price)||0) * (parseInt(it.qty)||0);
      // });

      cart.forEach((it) => {
        const li = document.createElement('li');

        const item = it.title || 'Item';
        const quantity = parseInt(it.qty || 0);
        const pricePerUnit = parseFloat(it.price) || 0;
        const itemTotal = pricePerUnit * quantity;

        total += itemTotal;
        li.textContent = `${item} × ${quantity} — £${itemTotal.toFixed(2)}`;
        itemsEl.appendChild(li);
      });
        
      totalEl.textContent = total.toFixed(2);
      return {cart, total};
    }

    window.addEventListener('storage', (e)=>{ if(e.key === 'myshop_cart') {render();} });
    render();

    const form = document.getElementById('checkout-form');
    const msg = document.getElementById('checkout-msg');
    if(!form) {return;}

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
      if(!current.cart || !current.cart.length) { 
        msg.textContent = 'Your cart is empty.'; 
        return; 
      }
      if(!name || !email || !address) { 
        msg.textContent = 'Please provide name, email and address.'; 
        return; 
      }

      const payload = { 
        cart: current.cart, 
        customer: {name, email, phone, address, city, postcode, country} 
      };

      msg.textContent = 'Placing order...';

      try{
        let csrfToken= '';
        const match = document.cookie.match('(^|;)\\s*csrftoken\\s*=\\s*([^;]+)');
        if(match) { csrfToken = match.pop(); }
        const res = await fetch('/checkout/', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 
            'Content-Type': 'application/json', 
            'X-CSRFToken': csrfToken 
          },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if(data.ok){

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
  }

  document.addEventListener('DOMContentLoaded', checkoutIntegration);

  const userInput = document.getElementById('id_username');
  const passInput = document.getElementById('id_password');
  const popup = document.getElementById('login-error-popup');

  if(!userInput || !passInput) {return;}

  let autoHideTimer = null;

  function showPopup(msg){
    if(!popup) { alert(msg); return; }

    popup.querySelector('.popup-content').textContent = msg;
    popup.classList.remove('hidden');

    popup.requestAnimationFrame(()=> popup.classList.add('visible'));
    popup.setAttribute('aria-hidden','false');
    if (typeof popup.focus === 'function') { 
      popup.focus(); 
    }
    document.addEventListener('keydown', onKeyDown);

    clearTimeout(autoHideTimer);
    autoHideTimer = setTimeout(hidePopup, 4000);
  }

  function hidePopup(){
    if(!popup) {return;}
    clearTimeout(autoHideTimer);
    popup.classList.remove('visible');
    popup.setAttribute('aria-hidden','true');
    document.removeEventListener('keydown', onKeyDown);
    // after transition ends, add hidden to remove from flow
    setTimeout(()=>{
      if(!popup.classList.contains('visible')) {popup.classList.add('hidden');}
    }, 350);
  }

  function onKeyDown(e){ if(e.key === 'Escape') {hidePopup();} }

  if(popup) {popup.addEventListener('click', (e) => { if(e.target === popup) {hidePopup();} });}

  const form = 
    document.getElementById('login-form') || 
    document.getElementById('signup-form');
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
});


