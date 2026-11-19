'use strict';
/* BOOKHUB - Prototipo local de reservas e inventario. Sin backend ni cobros reales. */

const $ = id => document.getElementById(id);
const $$ = selector => Array.from(document.querySelectorAll(selector));
const KEY = 'bookhub_datos_v2';
const CATEGORIES = ['Todos','Libros','Cuadernos','Escritura','Arte','Organización','Otros'];
const CATEGORY_ICONS = {Libros:'📚',Cuadernos:'📓',Escritura:'✏️',Arte:'🖍️',Organización:'📏',Otros:'🎒'};
const CATEGORY_COLORS = {Libros:'#e6e6f8',Cuadernos:'#eaf1ff',Escritura:'#eaf7f5',Arte:'#f6eaff',Organización:'#e8f8ef',Otros:'#fff1e5'};

const defaultProducts = [
  // Seis libros con diferentes precios, nombres y stickers.
  {id:1,name:'Libro de Matemáticas',category:'Libros',price:48,stock:15,emoji:'📘',tag:'Recomendado'},
  {id:2,name:'Libro de Lenguaje',category:'Libros',price:42,stock:12,emoji:'📕',tag:''},
  {id:3,name:'Libro de Ciencias Naturales',category:'Libros',price:55,stock:10,emoji:'📗',tag:'Popular'},
  {id:4,name:'Libro de Historia',category:'Libros',price:46,stock:14,emoji:'📙',tag:''},
  {id:5,name:'Libro de Geografía',category:'Libros',price:50,stock:9,emoji:'📖',tag:''},
  {id:6,name:'Diccionario escolar',category:'Libros',price:38,stock:16,emoji:'📚',tag:''},
  {id:7,name:'Cuaderno universitario',category:'Cuadernos',price:18,stock:35,emoji:'📓',tag:'Popular'},
  {id:8,name:'Cuaderno pequeño',category:'Cuadernos',price:9.5,stock:42,emoji:'📒',tag:''},
  {id:9,name:'Bolígrafo azul',category:'Escritura',price:2.5,stock:80,emoji:'🖊️',tag:''},
  {id:10,name:'Lápiz HB',category:'Escritura',price:1.5,stock:100,emoji:'✏️',tag:''},
  {id:11,name:'Caja de colores',category:'Arte',price:15,stock:20,emoji:'🖍️',tag:'Recomendado'},
  {id:12,name:'Marcadores de colores',category:'Arte',price:12,stock:16,emoji:'🖌️',tag:''},
  {id:13,name:'Regla de 30 cm',category:'Organización',price:4,stock:28,emoji:'📏',tag:''},
  {id:14,name:'Carpeta escolar',category:'Organización',price:7,stock:25,emoji:'🗂️',tag:''},
  {id:15,name:'Borrador blanco',category:'Escritura',price:1.5,stock:65,emoji:'◻️',tag:''},
  {id:16,name:'Tijera escolar',category:'Otros',price:8.5,stock:14,emoji:'✂️',tag:''},
  {id:17,name:'Pegamento en barra',category:'Otros',price:6,stock:22,emoji:'🧴',tag:''},
  {id:18,name:'Hojas tamaño carta (paquete)',category:'Otros',price:22,stock:18,emoji:'📄',tag:''},
  {id:19,name:'Cartulina de color',category:'Arte',price:2,stock:50,emoji:'🟪',tag:''},
  {id:20,name:'Mochila escolar',category:'Otros',price:95,stock:8,emoji:'🎒',tag:'Pocas unidades'},
  {id:21,name:'Sacapuntas',category:'Escritura',price:3,stock:30,emoji:'🔺',tag:''},
  {id:22,name:'Cartuchera',category:'Organización',price:28,stock:12,emoji:'👝',tag:''}
];
const blankData = () => ({users:[],products:defaultProducts.map(p=>({...p})),orders:[],schoolLists:[]});
let db;
try { db = JSON.parse(localStorage.getItem(KEY)) || blankData(); } catch { db = blankData(); }
if (!db || typeof db !== 'object') db=blankData();
for(const field of ['users','products','orders','schoolLists']) if(!Array.isArray(db[field])) db[field]=[];
let currentUser = null;
const cart = new Map();
let activeCategory = 'Todos';
let currentPage = 'home';
let currentAdminPanel = 'overview';
let editingProductId = null;
let latestOrderId = '';
let toastTimer = null;
const money = n => 'Bs ' + Number(n || 0).toFixed(2).replace('.',',');
const escapeHTML = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localDate = value => {let d=value?new Date(value):new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const displayDate = value => {const d=new Date(value); return Number.isFinite(d.getTime()) ? d.toLocaleString('es-BO',{dateStyle:'short',timeStyle:'short'}):'';};
const productById = id => db.products.find(p=>p.id===Number(id));
const isAdmin = () => currentUser?.role==='admin';
const hasClient = () => currentUser?.role==='client';
const save = () => { try{localStorage.setItem(KEY,JSON.stringify(db));return true;}catch(e){toast('No fue posible guardar datos. Revisa el espacio del navegador.');return false;} };
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3000);}
function showAccessError(msg){$('access-error').textContent=msg;$('access-error').classList.remove('hidden');}
function clearAccessError(){$('access-error').textContent='';$('access-error').classList.add('hidden');}
function setAccessRole(role){
  clearAccessError();
  $$('[data-role]').forEach(btn=>btn.classList.toggle('active',btn.dataset.role===role));
  $('client-login-form').classList.toggle('hidden',role!=='client');
  $('admin-login-form').classList.toggle('hidden',role!=='admin');
  $('register-form').classList.add('hidden');
}
function signIn(user){
  currentUser=user;cart.clear();
  $('access-screen').classList.add('hidden');$('app-shell').classList.remove('hidden');
  $('client-area').classList.toggle('hidden',!hasClient());
  $('admin-area').classList.toggle('hidden',!isAdmin());
  $('client-nav').classList.toggle('hidden',!hasClient());
  $('header-cart').classList.toggle('hidden',!hasClient());
  $('current-user').textContent= isAdmin()?'Administración':`Hola, ${user.name.split(' ')[0]}`;
  if(isAdmin()){showAdminPanel('overview');renderAdmin();} else {showPage('home');renderClient();}
}
function signOut(){
  currentUser=null;cart.clear();
  $('app-shell').classList.add('hidden');$('access-screen').classList.remove('hidden');
  $('client-login-form').reset();$('admin-login-form').reset();$('register-form').reset();
  setAccessRole('client');closeCart();$$('.modal-backdrop').forEach(m=>m.classList.add('hidden'));
}
function showPage(page){
  if(!hasClient())return;
  if(!['home','catalog','upload','guide','myorders'].includes(page))return;
  currentPage=page;
  $$('.page-screen').forEach(x=>x.classList.toggle('hidden',x.id!==`page-${page}`));
  $$('[data-page].nav-link').forEach(x=>x.classList.toggle('active',x.dataset.page===page));
  if(page==='catalog')renderProducts();if(page==='myorders')renderMyOrders();
  window.scrollTo(0,0);
}
function renderCategoryControls(){
  $('category-tabs').innerHTML=CATEGORIES.map(c=>`<button type="button" class="category-tab ${activeCategory===c?'active':''}" data-category="${escapeHTML(c)}">${escapeHTML(c)}</button>`).join('');
  $('home-categories').innerHTML=CATEGORIES.filter(c=>c!=='Todos').map(c=>`<button type="button" class="home-category" data-category-home="${escapeHTML(c)}"><span>${CATEGORY_ICONS[c]}</span><b>${escapeHTML(c)}</b><small>Ver productos →</small></button>`).join('');
  $('admin-category-filter').innerHTML=CATEGORIES.map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
  $('product-category').innerHTML=CATEGORIES.filter(c=>c!=='Todos').map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
}
function renderProducts(){
  const q=$('search-products').value.trim().toLocaleLowerCase('es');
  const found=db.products.filter(p=>(activeCategory==='Todos'||p.category===activeCategory) && `${p.name} ${p.category}`.toLocaleLowerCase('es').includes(q));
  $('catalog-count').textContent=`${found.length} producto${found.length===1?'':'s'} en esta selección`;
  $('product-grid').innerHTML=found.map(p=>`
    <article class="product-card">
      <div class="product-visual" style="background:${CATEGORY_COLORS[p.category]||'#eaf1ff'}">
        ${p.tag?`<span class="product-tag">${escapeHTML(p.tag)}</span>`:''}
        <span class="product-emoji" aria-hidden="true">${escapeHTML(p.emoji||'📦')}</span>
      </div>
      <div class="product-info"><span class="product-category">${escapeHTML(p.category)}</span><h3>${escapeHTML(p.name)}</h3>
        <div class="product-bottom"><div class="product-price">${money(p.price)}<small>${p.stock>0?`${p.stock} disponibles`:'Agotado'}</small></div><button type="button" class="add-button" data-add="${p.id}" ${p.stock<=0?'disabled':''} aria-label="Añadir ${escapeHTML(p.name)}">${p.stock>0?'+':'−'}</button></div>
      </div>
    </article>`).join('');
  $('empty-products').classList.toggle('hidden',found.length!==0);
  $('category-tabs').querySelectorAll('[data-category]').forEach(el=>el.classList.toggle('active',el.dataset.category===activeCategory));
}
function renderClient(){renderProducts();renderCart();renderMyOrders();}
function cartQuantity(){return [...cart.values()].reduce((a,n)=>a+n,0);}
function cartTotal(){return [...cart.entries()].reduce((s,[id,qty])=>s+(productById(id)?.price||0)*qty,0);}
function addToCart(id){
  const p=productById(id);if(!p)return;
  if((cart.get(p.id)||0)>=p.stock)return toast('Ya no hay más unidades disponibles.');
  cart.set(p.id,(cart.get(p.id)||0)+1);renderCart();toast(`${p.name} añadido al carrito.`);
}
function changeCartQty(id,delta){
  const p=productById(id);if(!p){cart.delete(Number(id));renderCart();return;}
  const qty=(cart.get(p.id)||0)+delta;
  if(qty<=0)cart.delete(p.id);
  else if(qty<=p.stock)cart.set(p.id,qty);
  else return toast('No hay suficientes unidades disponibles.');
  renderCart();
}
function renderCart(){
  $('cart-count').textContent=cartQuantity();
  $('cart-empty').classList.toggle('hidden',cart.size!==0);
  $('cart-bottom').classList.toggle('hidden',cart.size===0);
  $('cart-items').innerHTML=[...cart.entries()].map(([id,qty])=>{
    const p=productById(id);if(!p)return '';
    return `<div class="cart-row"><div class="cart-product-icon" style="background:${CATEGORY_COLORS[p.category]||'#eaf1ff'}">${escapeHTML(p.emoji||'📦')}</div><div><h4>${escapeHTML(p.name)}</h4><small>${money(p.price)} por unidad</small><div class="quantity-controls"><button type="button" data-cart-id="${p.id}" data-delta="-1">−</button><span>${qty}</span><button type="button" data-cart-id="${p.id}" data-delta="1">+</button></div></div><div class="cart-row-price">${money(p.price*qty)}</div></div>`;
  }).join('');
  $('cart-total').textContent=money(cartTotal());
  $('checkout-summary-items').innerHTML=[...cart.entries()].map(([id,qty])=>{const p=productById(id);return p?`<div class="summary-item"><span>${qty} × ${escapeHTML(p.name)}</span><span>${money(qty*p.price)}</span></div>`:'';}).join('');
  $('checkout-total').textContent=money(cartTotal());
}
function openCart(){if(!hasClient())return;$('cart-drawer').classList.add('open');$('cart-drawer').setAttribute('aria-hidden','false');$('overlay').classList.remove('hidden');document.body.classList.add('no-scroll');}
function closeCart(){$('cart-drawer').classList.remove('open');$('cart-drawer').setAttribute('aria-hidden','true');$('overlay').classList.add('hidden');if(!$$('.modal-backdrop:not(.hidden)').length)document.body.classList.remove('no-scroll');}
function openModal(id){$(id).classList.remove('hidden');document.body.classList.add('no-scroll');}
function closeModal(id){$(id).classList.add('hidden');if(!$('cart-drawer').classList.contains('open')&&!$$('.modal-backdrop:not(.hidden)').length)document.body.classList.remove('no-scroll');}
function openCheckout(){if(!cart.size)return toast('Agrega materiales primero.');closeCart();renderCart();$('checkout-error').classList.add('hidden');openModal('checkout-modal');}
function createOrder(event){
  event.preventDefault();if(!hasClient()||!cart.size)return;
  for(const [id,qty] of cart){const p=productById(id);if(!p||p.stock<qty){$('checkout-error').textContent='Hay menos unidades disponibles. Revisa el carrito.';$('checkout-error').classList.remove('hidden');return;}}
  const items=[...cart.entries()].map(([id,qty])=>{const p=productById(id);return {id:p.id,name:p.name,price:p.price,quantity:qty};});
  const total=items.reduce((sum,p)=>sum+p.price*p.quantity,0);
  const stamp=Date.now();const order={id:`BH-${stamp}-${Math.floor(Math.random()*1000)}`,client:currentUser.name,contact:$('checkout-phone').value.trim(),notes:$('checkout-notes').value.trim(),payment:'QR (demo)',items,total,status:'Pendiente',createdAt:new Date().toISOString(),deliveredAt:null};
  if(!order.contact)return;
  items.forEach(item=>productById(item.id).stock-=item.quantity);db.orders.unshift(order);
  if(!save()){ db.orders.shift();items.forEach(item=>productById(item.id).stock+=item.quantity);return; }
  latestOrderId=order.id;cart.clear();$('checkout-form').reset();closeModal('checkout-modal');renderClient();
  $('payment-order-id').textContent=order.id;$('payment-total').textContent=money(total);openModal('payment-modal');
}
function orderItemsSummary(order){return order.items.map(i=>`${escapeHTML(i.name)} ×${i.quantity}`).join(' · ');}
function orderCard(order,admin){
  const options=['Pendiente','Preparando','Lista','Entregada','Cancelada'];
  return `<article class="reservation-card"><div class="reservation-top"><div><span class="reservation-number">${escapeHTML(order.id)}</span><div class="reservation-date">${displayDate(order.createdAt)}</div></div><span class="order-status ${order.status==='Cancelada'?'cancelled':order.status==='Entregada'?'delivered':''}">${escapeHTML(order.status)}</span></div>
    ${admin?`<p class="reservation-client"><b>Cliente:</b> ${escapeHTML(order.client)} · <b>Contacto:</b> ${escapeHTML(order.contact)}</p>`:''}
    <p class="reservation-products">${orderItemsSummary(order)}</p>
    ${order.notes?`<p class="reservation-notes">Nota: ${escapeHTML(order.notes)}</p>`:''}
    <div class="reservation-bottom"><strong>${money(order.total)}</strong>${admin?`<label class="status-label">Estado <select class="text-field" data-order-status="${escapeHTML(order.id)}" ${order.status==='Cancelada'||order.status==='Entregada'?'disabled':''}>${options.map(s=>`<option value="${s}" ${order.status===s?'selected':''}>${s}</option>`).join('')}</select></label>`:`<span>${escapeHTML(order.payment)}</span>`}</div></article>`;
}
function renderMyOrders(){
  const userOrders=db.orders.filter(o=>o.client===currentUser?.name);
  $('my-orders-list').innerHTML=userOrders.length?userOrders.map(o=>orderCard(o,false)).join(''):'<div class="friendly-empty"><span>📭</span><h3>Aún no tienes reservas</h3><p>Visita la sección Materiales y realiza tu primer pedido.</p><button type="button" class="button button-primary" data-page="catalog">Explorar materiales</button></div>';
}
function showAdminPanel(panel){
  if(!isAdmin()||!['overview','inventory','reservations','lists'].includes(panel))return;
  currentAdminPanel=panel;
  $$('.admin-pane').forEach(el=>el.classList.toggle('hidden',el.id!==`admin-${panel}`));
  $$('.admin-nav-tab').forEach(el=>el.classList.toggle('active',el.dataset.adminPanel===panel));
  renderAdmin();
}
function renderAdmin(){
  if(!isAdmin())return;
  $('metric-products').textContent=db.products.length;
  $('metric-stock').textContent=db.products.reduce((n,p)=>n+p.stock,0);
  $('metric-pending').textContent=db.orders.filter(o=>!['Entregada','Cancelada'].includes(o.status)).length;
  $('metric-sales').textContent=money(db.orders.filter(o=>o.status==='Entregada'&&localDate(o.deliveredAt||o.createdAt)===localDate()).reduce((s,o)=>s+o.total,0));
  $('admin-category-summary').innerHTML=CATEGORIES.filter(c=>c!=='Todos').map(c=>{
    const items=db.products.filter(p=>p.category===c);const stock=items.reduce((s,p)=>s+p.stock,0);
    return `<div class="category-summary-row"><span>${CATEGORY_ICONS[c]} ${escapeHTML(c)}</span><strong>${items.length} artículos · ${stock} unidades</strong></div>`;
  }).join('');
  $('admin-recent-orders').innerHTML=db.orders.length?db.orders.slice(0,4).map(o=>`<div class="recent-row"><div><b>${escapeHTML(o.client)}</b><small>${escapeHTML(o.status)} · ${escapeHTML(o.id)}</small></div><strong>${money(o.total)}</strong></div>`).join(''):'<p class="muted">Todavía no hay reservas.</p>';
  renderInventory();
  $('admin-orders-list').innerHTML=db.orders.length?db.orders.map(o=>orderCard(o,true)).join(''):'<div class="friendly-empty"><span>📭</span><h3>No hay reservas</h3><p>Las reservas de los clientes aparecerán aquí.</p></div>';
  $('admin-school-lists').innerHTML=db.schoolLists.length?db.schoolLists.map(item=>`<div class="reservation-card"><div class="reservation-top"><b>${escapeHTML(item.id)}</b><span class="reservation-date">${displayDate(item.createdAt)}</span></div><p><b>${escapeHTML(item.client)}</b> · ${escapeHTML(item.phone)}</p><p>${escapeHTML(item.notes)}</p><p class="muted">Archivo seleccionado: ${escapeHTML(item.filename||'Ninguno')} (archivo no conservado)</p></div>`).join(''):'<div class="friendly-empty"><span>📋</span><h3>Aún no hay listas registradas</h3></div>';
}
function renderInventory(){
  const q=$('admin-search').value.trim().toLocaleLowerCase('es');const category=$('admin-category-filter').value||'Todos';
  const found=db.products.filter(p=>(category==='Todos'||p.category===category)&&p.name.toLocaleLowerCase('es').includes(q));
  $('inventory-rows').innerHTML=found.length?found.map(p=>`<tr><td><div class="table-product"><span class="table-sticker">${escapeHTML(p.emoji||'📦')}</span><b>${escapeHTML(p.name)}</b></div></td><td>${escapeHTML(p.category)}</td><td>${money(p.price)}</td><td><b>${p.stock}</b></td><td><span class="inventory-state ${p.stock===0?'out':p.stock<=5?'low':''}">${p.stock===0?'Agotado':p.stock<=5?'Stock bajo':'Disponible'}</span></td><td class="table-actions"><button type="button" data-edit-product="${p.id}">Editar</button><button type="button" class="danger" data-delete-product="${p.id}">Quitar</button></td></tr>`).join(''):'<tr><td colspan="6" class="muted">No hay productos para mostrar.</td></tr>';
}
function openProductEditor(id=null){
  if(!isAdmin())return;
  $('product-form').reset();editingProductId=id;
  const p=id===null?null:productById(id);
  $('product-modal-title').textContent=p?'Editar mercadería':'Añadir mercadería';
  if(p){$('product-name').value=p.name;$('product-category').value=p.category;$('product-price').value=p.price;$('product-stock').value=p.stock;$('product-emoji').value=p.emoji;if(!$('product-emoji').value)$('product-emoji').selectedIndex=0;$('product-description').value=p.description||'';}
  else{$('product-category').value='Libros';$('product-emoji').value='📚';}
  openModal('product-modal');
}
function saveProduct(event){
  event.preventDefault();if(!isAdmin())return;
  const name=$('product-name').value.trim();const category=$('product-category').value;
  const price=Number($('product-price').value);const stock=Number($('product-stock').value);
  const emoji=$('product-emoji').value;const description=$('product-description').value.trim();
  if(!name||!CATEGORIES.includes(category)||category==='Todos'||!Number.isFinite(price)||price<=0||!Number.isSafeInteger(stock)||stock<0)return toast('Revisa los datos: precio positivo y cantidad entera no negativa.');
  if(editingProductId!==null){const p=productById(editingProductId);if(!p)return;Object.assign(p,{name,category,price,stock,emoji,description});}
  else{db.products.push({id:Date.now()+Math.floor(Math.random()*1000),name,category,price,stock,emoji,description,tag:''});}
  save();closeModal('product-modal');renderAdmin();renderProducts();toast('Mercadería guardada correctamente.');
}
function deleteProduct(id){
  if(!isAdmin())return;const p=productById(id);if(!p)return;
  if(!confirm(`¿Quitar "${p.name}" del catálogo? Las reservas anteriores se conservarán.`))return;
  db.products=db.products.filter(item=>item.id!==id);cart.delete(id);save();renderAdmin();renderProducts();toast('Producto quitado del catálogo.');
}
function updateStatus(id,newStatus){
  if(!isAdmin())return;
  const o=db.orders.find(r=>r.id===id);if(!o)return;
  const states=['Pendiente','Preparando','Lista','Entregada','Cancelada'];
  if(!states.includes(newStatus)||['Entregada','Cancelada'].includes(o.status))return renderAdmin();
  if(newStatus==='Cancelada'){
    o.items.forEach(item=>{const p=productById(item.id);if(p)p.stock+=item.quantity;});
  }
  if(newStatus==='Entregada')o.deliveredAt=new Date().toISOString();
  o.status=newStatus;save();renderAdmin();toast('Estado de reserva actualizado.');
}
function submitSchoolList(event){
  event.preventDefault();if(!hasClient())return;
  const f=$('school-list-file').files[0];
  if(f&&(!['image/jpeg','image/png','application/pdf'].includes(f.type)||f.size>8*1024*1024))return toast('Formato no válido. Usa JPG, PNG o PDF de máximo 8 MB.');
  const phone=$('list-phone').value.trim();const notes=$('list-notes').value.trim();if(!phone||!notes)return toast('Completa tus datos y los materiales que necesitas.');
  const row={id:`LS-${Date.now()}`,client:currentUser.name,phone,notes,filename:f?.name||'',createdAt:new Date().toISOString()};
  db.schoolLists.unshift(row);save();$('list-form').reset();$('file-label').textContent='Elegir foto o PDF';toast(`Solicitud ${row.id} guardada en este navegador.`);
}
function attachEvents(){
  $$('[data-role]').forEach(b=>b.addEventListener('click',()=>setAccessRole(b.dataset.role)));
  $('go-register').addEventListener('click',()=>{clearAccessError();$('client-login-form').classList.add('hidden');$('register-form').classList.remove('hidden');});
  $('back-to-login').addEventListener('click',()=>{clearAccessError();$('register-form').classList.add('hidden');$('client-login-form').classList.remove('hidden');});
  $('register-form').addEventListener('submit',e=>{
    e.preventDefault();const name=$('reg-name').value.trim(),password=$('reg-password').value,confirm=$('reg-confirm').value;
    if(name.length<3||password.length<4)return showAccessError('Escribe un nombre y una contraseña de al menos 4 caracteres.');
    if(password!==confirm)return showAccessError('Las contraseñas no coinciden.');
    if(db.users.some(u=>u.name.toLocaleLowerCase('es')===name.toLocaleLowerCase('es')))return showAccessError('Ese nombre ya está registrado.');
    db.users.push({name,password});if(save())signIn({role:'client',name});
  });
  $('client-login-form').addEventListener('submit',e=>{
    e.preventDefault();const name=$('login-name').value.trim(),password=$('login-password').value;
    const u=db.users.find(u=>u.name.toLocaleLowerCase('es')===name.toLocaleLowerCase('es')&&u.password===password);
    if(!u)return showAccessError('Datos incorrectos. Revisa tu cuenta o crea una nueva.');signIn({role:'client',name:u.name});
  });
  $('admin-login-form').addEventListener('submit',e=>{
    e.preventDefault();if($('admin-user').value.trim()==='admin'&&$('admin-password').value==='1234')signIn({role:'admin',name:'Administrador'});
    else showAccessError('Usuario o contraseña de administrador incorrectos.');
  });
  $('logout-button').addEventListener('click',signOut);
  $$('[data-home]').forEach(b=>b.addEventListener('click',()=>{if(hasClient())showPage('home');else showAdminPanel('overview');}));
  document.addEventListener('click',e=>{
    const p=e.target.closest('[data-page]');if(p&&hasClient())showPage(p.dataset.page);
    const h=e.target.closest('[data-category-home]');if(h&&hasClient()){activeCategory=h.dataset.categoryHome;showPage('catalog');}
  });
  $('category-tabs').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(b){activeCategory=b.dataset.category;renderProducts();}});
  $('search-products').addEventListener('input',renderProducts);
  $('product-grid').addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(b)addToCart(Number(b.dataset.add));});
  $('header-cart').addEventListener('click',openCart);
  $('close-cart').addEventListener('click',closeCart);
  $('overlay').addEventListener('click',closeCart);
  $('cart-items').addEventListener('click',e=>{const b=e.target.closest('[data-cart-id]');if(b)changeCartQty(Number(b.dataset.cartId),Number(b.dataset.delta));});
  $('continue-shopping').addEventListener('click',()=>{closeCart();showPage('catalog');});
  $('continue-checkout').addEventListener('click',openCheckout);
  $('checkout-form').addEventListener('submit',createOrder);
  $('finish-order').addEventListener('click',()=>{closeModal('payment-modal');showPage('myorders');});
  $('copy-order-id').addEventListener('click',()=>{const id=$('payment-order-id').textContent;if(navigator.clipboard?.writeText)navigator.clipboard.writeText(id).then(()=>toast('Referencia copiada.')).catch(()=>toast(id));else toast(id);});
  $$('[data-close-modal]').forEach(b=>b.addEventListener('click',()=>closeModal(b.closest('.modal-backdrop').id)));
  $$('.modal-backdrop').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id);}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeCart();$$('.modal-backdrop:not(.hidden)').forEach(m=>closeModal(m.id));}});
  $('school-list-file').addEventListener('change',()=>{const f=$('school-list-file').files[0];if(!f){$('file-label').textContent='Elegir foto o PDF';return;}if(!['image/jpeg','image/png','application/pdf'].includes(f.type)||f.size>8*1024*1024){$('school-list-file').value='';toast('Archivo no válido o mayor a 8 MB.');return;}$('file-label').textContent=f.name;});
  $('list-form').addEventListener('submit',submitSchoolList);
  $$('.admin-nav-tab').forEach(b=>b.addEventListener('click',()=>showAdminPanel(b.dataset.adminPanel)));
  $('admin-search').addEventListener('input',renderInventory);
  $('admin-category-filter').addEventListener('change',renderInventory);
  $('add-product').addEventListener('click',()=>openProductEditor());
  $('inventory-rows').addEventListener('click',e=>{const edit=e.target.closest('[data-edit-product]'),del=e.target.closest('[data-delete-product]');if(edit)openProductEditor(Number(edit.dataset.editProduct));if(del)deleteProduct(Number(del.dataset.deleteProduct));});
  $('product-form').addEventListener('submit',saveProduct);
  $('admin-orders-list').addEventListener('change',e=>{const select=e.target.closest('[data-order-status]');if(select)updateStatus(select.dataset.orderStatus,select.value);});
}
renderCategoryControls();attachEvents();setAccessRole('client');
