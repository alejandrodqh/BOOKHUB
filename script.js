'use strict';

/* BOOKHUB: tienda de materiales escolares de demostración. */

const products = [
  { id: 1, name: 'Cuaderno universitario', category: 'Cuadernos', price: 18, stock: 35, emoji: '📓', bg: '#eaf1ff', tag: 'Popular' },
  { id: 2, name: 'Cuaderno pequeño', category: 'Cuadernos', price: 9.5, stock: 42, emoji: '📒', bg: '#fff1e5', tag: '' },
  { id: 3, name: 'Bolígrafo azul', category: 'Escritura', price: 2.5, stock: 80, emoji: '🖊️', bg: '#eaf7f5', tag: '' },
  { id: 4, name: 'Lápiz HB', category: 'Escritura', price: 1.5, stock: 100, emoji: '✏️', bg: '#fff5d9', tag: '' },
  { id: 5, name: 'Caja de colores', category: 'Arte', price: 15, stock: 20, emoji: '🖍️', bg: '#f6eaff', tag: 'Recomendado' },
  { id: 6, name: 'Marcadores de colores', category: 'Arte', price: 12, stock: 16, emoji: '🖌️', bg: '#ffeaf0', tag: '' },
  { id: 7, name: 'Regla de 30 cm', category: 'Organización', price: 4, stock: 28, emoji: '📏', bg: '#e8f8ef', tag: '' },
  { id: 8, name: 'Carpeta escolar', category: 'Organización', price: 7, stock: 25, emoji: '🗂️', bg: '#eaf1ff', tag: '' },
  { id: 9, name: 'Borrador blanco', category: 'Escritura', price: 1.5, stock: 65, emoji: '◻️', bg: '#f1f4f8', tag: '' },
  { id: 10, name: 'Tijera escolar', category: 'Otros', price: 8.5, stock: 14, emoji: '✂️', bg: '#fff0e8', tag: '' },
  { id: 11, name: 'Pegamento en barra', category: 'Otros', price: 6, stock: 22, emoji: '🧴', bg: '#eaf7ff', tag: '' },
  { id: 12, name: 'Hojas tamaño carta (paquete)', category: 'Otros', price: 22, stock: 18, emoji: '📄', bg: '#f1f4f8', tag: '' },
  { id: 13, name: 'Cartulina de color', category: 'Arte', price: 2, stock: 50, emoji: '🟪', bg: '#f6eaff', tag: '' },
  { id: 14, name: 'Mochila escolar', category: 'Otros', price: 95, stock: 8, emoji: '🎒', bg: '#eaf1ff', tag: 'Pocas unidades' },
  { id: 15, name: 'Sacapuntas', category: 'Escritura', price: 3, stock: 30, emoji: '🔺', bg: '#fff5d9', tag: '' },
  { id: 16, name: 'Cartuchera', category: 'Organización', price: 28, stock: 12, emoji: '👝', bg: '#ffeaf0', tag: '' }
];

const cart = new Map();
const orders = [];

let activeCategory = 'Todos';
let latestOrderId = '';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function money(value) {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    minimumFractionDigits: 2
  }).format(value);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function getProduct(id) {
  return products.find(product => product.id === Number(id));
}

function cartQuantity() {
  return [...cart.values()].reduce((sum, quantity) => sum + quantity, 0);
}

function cartTotal() {
  return [...cart.entries()].reduce((sum, [id, quantity]) => {
    return sum + getProduct(id).price * quantity;
  }, 0);
}

function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('show');

  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove('show'), 2600);
}

/* CATÁLOGO */

function renderProducts() {
  const query = $('#search-products').value.trim().toLocaleLowerCase('es');

  const filtered = products.filter(product => {
    const categoryMatches =
      activeCategory === 'Todos' || product.category === activeCategory;

    const queryMatches =
      `${product.name} ${product.category}`
        .toLocaleLowerCase('es')
        .includes(query);

    return categoryMatches && queryMatches;
  });

  $('#product-grid').innerHTML = filtered.map(product => {
    const available = product.stock > 0;
    const tag = product.tag
      ? `<span class="product-tag">${escapeHTML(product.tag)}</span>`
      : '';

    return `
      <article class="product-card">
        <div class="product-visual" style="background:${product.bg}">
          ${tag}
          <span class="product-emoji" aria-hidden="true">${product.emoji}</span>
        </div>
        <div class="product-info">
          <span class="product-category">${escapeHTML(product.category)}</span>
          <h3>${escapeHTML(product.name)}</h3>
          <div class="product-bottom">
            <div class="product-price">
              ${money(product.price)}
              <small>${available ? `${product.stock} disponibles (demo)` : 'Agotado'}</small>
            </div>
            <button class="add-button"
              data-add="${product.id}"
              aria-label="Agregar ${escapeHTML(product.name)}"
              ${available ? '' : 'disabled'}>
              ${available ? '+' : '–'}
            </button>
          </div>
        </div>
      </article>`;
  }).join('');

  $('#empty-products').classList.toggle('hidden', filtered.length > 0);
}

function addToCart(id) {
  const product = getProduct(id);
  const current = cart.get(product.id) || 0;

  if (current >= product.stock) {
    return toast('No hay más unidades disponibles en este ejemplo.');
  }

  cart.set(product.id, current + 1);
  renderCart();
  toast(`${product.name} agregado al carrito.`);
}

function changeQuantity(id, delta) {
  const product = getProduct(id);
  const next = (cart.get(product.id) || 0) + delta;

  if (next <= 0) {
    cart.delete(product.id);
  } else if (next <= product.stock) {
    cart.set(product.id, next);
  } else {
    toast('La cantidad supera el inventario de ejemplo.');
  }

  renderCart();
}

function renderCart() {
  $('#cart-count').textContent = cartQuantity();

  const entries = [...cart.entries()];

  $('#cart-empty').classList.toggle('hidden', entries.length > 0);
  $('#cart-bottom').classList.toggle('hidden', entries.length === 0);

  $('#cart-items').innerHTML = entries.map(([id, quantity]) => {
    const product = getProduct(id);

    return `
      <div class="cart-row">
        <div class="cart-product-icon" style="background:${product.bg}">
          ${product.emoji}
        </div>
        <div>
          <h4>${escapeHTML(product.name)}</h4>
          <small>${money(product.price)} por unidad</small>
          <div class="quantity-controls">
            <button type="button" data-change="${id}" data-delta="-1">−</button>
            <span>${quantity}</span>
            <button type="button" data-change="${id}" data-delta="1">+</button>
          </div>
        </div>
        <div class="cart-row-price">${money(product.price * quantity)}</div>
      </div>`;
  }).join('');

  $('#cart-total').textContent = money(cartTotal());
  $('#admin-products').textContent = products.length;

  renderCheckoutSummary();
  renderAdmin();
}

function openCart() {
  $('#cart-drawer').classList.add('open');
  $('#cart-drawer').setAttribute('aria-hidden', 'false');
  $('#overlay').classList.remove('hidden');
  document.body.classList.add('no-scroll');
}

function closeCart() {
  $('#cart-drawer').classList.remove('open');
  $('#cart-drawer').setAttribute('aria-hidden', 'true');
  $('#overlay').classList.add('hidden');
  document.body.classList.remove('no-scroll');
}

/* PEDIDOS Y PAGO DE DEMOSTRACIÓN */

function estimatePrepTime() {
  const units = cartQuantity();
  const differentItems = cart.size;

  if (!units) return 'Se calculará según tu pedido.';

  let minutes = 8 + units * 2 + differentItems * 2;

  if (units >= 20) minutes += 15;
  if (units >= 40) minutes += 20;

  if (minutes <= 15) return 'Aproximadamente 10–15 minutos.';

  const rounded = Math.ceil(minutes / 5) * 5;

  if (rounded <= 30) {
    return `Aproximadamente ${rounded} minutos.`;
  }

  return `Aproximadamente ${Math.floor(rounded / 60)} h ${String(rounded % 60).padStart(2, '0')} min.`;
}

function renderCheckoutSummary() {
  const container = $('#checkout-summary-items');
  if (!container) return;

  container.innerHTML = [...cart.entries()].map(([id, quantity]) => {
    const product = getProduct(id);

    return `
      <div class="summary-item">
        <span>${quantity} × ${escapeHTML(product.name)}</span>
        <span>${money(product.price * quantity)}</span>
      </div>`;
  }).join('') || '<p class="form-footnote">No hay productos seleccionados.</p>';

  $('#checkout-total').textContent = money(cartTotal());
  $('#prep-estimate').textContent = estimatePrepTime();
}

function openModal(id) {
  $(id).classList.remove('hidden');
  document.body.classList.add('no-scroll');
}

function closeModal(id) {
  $(id).classList.add('hidden');

  if ($('#cart-drawer').classList.contains('open')) return;

  document.body.classList.remove('no-scroll');
}

function createOrder(event) {
  event.preventDefault();

  if (!cart.size) {
    return toast('Agrega al menos un material antes de continuar.');
  }

  const name = $('#customer-name').value.trim();
  const phone = $('#customer-phone').value.trim();

  if (!name || !phone) {
    $('#checkout-error').textContent = 'Completa tu nombre y número de contacto.';
    $('#checkout-error').classList.remove('hidden');
    return;
  }

  const items = [...cart.entries()].map(([id, quantity]) => {
    const product = getProduct(id);

    return {
      id: product.id,
      name: product.name,
      price: product.price,
      quantity
    };
  });

  const total = items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  const order = {
    id: `PG-${String(Date.now()).slice(-6)}`,
    name,
    phone,
    delivery: $('#delivery-method').value,
    notes: $('#checkout-notes').value.trim(),
    items,
    total,
    prepTime: estimatePrepTime(),
    status: 'Pedido recibido · demo',
    createdAt: new Date().toISOString(),
    demo: true
  };

  orders.unshift(order);
  latestOrderId = order.id;

  cart.clear();
  closeCart();
  closeModal('#checkout-modal');

  renderCart();
  renderAdmin();

  $('#payment-order-id').textContent = order.id;
  $('#payment-total').textContent = money(order.total);
  $('#payment-prep-time').textContent = order.prepTime;

  openModal('#payment-modal');
}

/* PANEL ADMINISTRATIVO */

function renderAdmin() {
  const count = orders.length;
  const total = orders.reduce((sum, order) => sum + order.total, 0);

  $('#admin-orders').textContent = count;
  $('#admin-today').textContent = money(total);
  $('#admin-month').textContent = money(total);

  $('#inventory-table').innerHTML = `
    <table class="simple-table">
      <thead>
        <tr><th>Producto</th><th>Unidades demo</th><th>Estado</th></tr>
      </thead>
      <tbody>
        ${products.slice(0, 9).map(product => {
          const status = product.stock === 0
            ? 'Agotado'
            : product.stock <= 10
              ? 'Pocas'
              : 'Disponible';

          const cls = product.stock === 0
            ? 'stock-out'
            : product.stock <= 10
              ? 'stock-low'
              : '';

          return `
            <tr>
              <td>${escapeHTML(product.name)}</td>
              <td>${product.stock}</td>
              <td class="${cls}">${status}</td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;

  $('#admin-order-list').innerHTML = count
    ? `
      <table class="simple-table">
        <thead>
          <tr><th>Pedido</th><th>Cliente</th><th>Total</th></tr>
        </thead>
        <tbody>
          ${orders.slice(0, 6).map(order => `
            <tr>
              <td>${escapeHTML(order.id)}</td>
              <td>${escapeHTML(order.name)}</td>
              <td>${money(order.total)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`
    : '<p class="form-footnote">Todavía no hay pedidos creados en esta sesión.</p>';
}

/* CONSULTAR PEDIDOS */

function lookupOrder(event) {
  event.preventDefault();

  const id = $('#lookup-order-id').value.trim().toUpperCase();
  const order = orders.find(item => item.id.toUpperCase() === id);
  const result = $('#lookup-result');

  result.classList.remove('hidden');

  if (!order) {
    result.textContent = 'No se encontró ese pedido en esta sesión del navegador. En la versión conectada, el seguimiento deberá consultar la base de datos.';
    return;
  }

  result.innerHTML = `
    <b>Pedido ${escapeHTML(order.id)}</b><br>
    Cliente: ${escapeHTML(order.name)}<br>
    Total: <b>${money(order.total)}</b><br>
    Tiempo estimado: ${escapeHTML(order.prepTime)}<br>
    Estado: ${escapeHTML(order.status)}<br>
    <span>Este pedido pertenece a la demostración actual del navegador.</span>`;
}

/* ENVÍO DEMOSTRATIVO DE LISTAS ESCOLARES */

function handleListFile() {
  const file = $('#school-list-file').files[0];

  if (!file) {
    $('#file-label').textContent = 'Elegir archivo';
    return;
  }

  const allowed = ['image/jpeg', 'image/png', 'application/pdf'];

  if (!allowed.includes(file.type) || file.size > 8 * 1024 * 1024) {
    $('#school-list-file').value = '';
    $('#file-label').textContent = 'Elegir archivo';
    toast('Elige JPG, PNG o PDF de máximo 8 MB.');
    return;
  }

  $('#file-label').textContent =
    file.name.length > 28 ? `${file.name.slice(0, 25)}…` : file.name;
}

function submitList(event) {
  event.preventDefault();

  const file = $('#school-list-file').files[0];
  const name = $('#list-customer-name').value.trim();
  const phone = $('#list-customer-phone').value.trim();

  if (!file) return toast('Selecciona una foto o un PDF de tu lista escolar.');
  if (!name || !phone) return toast('Completa tu nombre y número de contacto.');

  const demoId = `LS-${String(Date.now()).slice(-6)}`;

  $('#list-form').reset();
  $('#file-label').textContent = 'Elegir archivo';

  toast(`Lista registrada como ejemplo ${demoId}. No se envió a un servidor.`);

  alert(`Lista escolar recibida en la demostración.

Referencia: ${demoId}
Nombre: ${name}

Importante: el archivo no se ha subido ni guardado. Para que los trabajadores puedan verlo, falta conectar almacenamiento privado y un panel administrativo real.`);
}

/* INICIO DE SESIÓN Y REGISTRO */

const demoUsers = [];
let currentUser = null;
let authMode = 'login';

function showAuthMessage(message, success = false) {
  const node = $('#auth-message');

  node.textContent = message;
  node.classList.remove('hidden', 'success');

  if (success) node.classList.add('success');
}

function setAuthMode(mode) {
  authMode = mode;

  const registering = mode === 'register';

  $('#auth-title').textContent = registering
    ? 'Crea tu cuenta'
    : 'Bienvenido a BOOKHUB';

  $('#auth-intro').textContent = registering
    ? 'Regístrate para tener una experiencia de compra más cómoda.'
    : 'Inicia sesión para continuar con tus compras de materiales escolares.';

  $('#auth-name-wrap').classList.toggle('hidden', !registering);
  $('#auth-confirm-wrap').classList.toggle('hidden', !registering);

  $('#auth-name').required = registering;
  $('#auth-confirm-password').required = registering;

  $('#auth-password').autocomplete = registering
    ? 'new-password'
    : 'current-password';

  $('#auth-submit').textContent = registering
    ? 'Crear cuenta'
    : 'Iniciar sesión';

  $$('[data-auth-mode]').forEach(button => {
    button.classList.toggle('active', button.dataset.authMode === mode);
  });

  $('#auth-message').classList.add('hidden');
}

function updateUserInterface() {
  const button = $('#open-auth');

  button.textContent = currentUser
    ? `Hola, ${currentUser.name.split(' ')[0]}`
    : 'Iniciar sesión';

  button.classList.toggle('signed-in', Boolean(currentUser));

  button.setAttribute(
    'aria-label',
    currentUser
      ? `Sesión iniciada como ${currentUser.name}. Pulsa para cambiar de cuenta`
      : 'Iniciar sesión o crear cuenta'
  );
}

function openAuth() {
  setAuthMode('login');

  if (currentUser) {
    const change = window.confirm(
      `Sesión iniciada como ${currentUser.name}. ¿Quieres cerrar la sesión?`
    );

    if (change) {
      currentUser = null;
      updateUserInterface();
      toast('Sesión cerrada.');
    }

    return;
  }

  openModal('#auth-modal');
}

function handleAuth(event) {
  event.preventDefault();

  const email = $('#auth-email').value.trim().toLowerCase();
  const password = $('#auth-password').value;

  if (authMode === 'register') {
    const name = $('#auth-name').value.trim();
    const confirmPassword = $('#auth-confirm-password').value;

    if (!name) {
      return showAuthMessage('Escribe tu nombre completo.');
    }

    if (password !== confirmPassword) {
      return showAuthMessage('Las contraseñas no coinciden.');
    }

    if (demoUsers.some(user => user.email === email)) {
      return showAuthMessage('Ya existe una cuenta con ese correo en esta sesión.');
    }

    demoUsers.push({ name, email, password });
    currentUser = { name, email };

    updateUserInterface();
    closeModal('#auth-modal');
    $('#auth-form').reset();
    setAuthMode('login');

    toast('Cuenta creada en esta sesión de demostración.');
    return;
  }

  const user = demoUsers.find(item =>
    item.email === email && item.password === password
  );

  if (!user) {
    return showAuthMessage(
      'No encontramos esa cuenta o la contraseña no coincide. Si eres nuevo, crea una cuenta.'
    );
  }

  currentUser = { name: user.name, email: user.email };

  updateUserInterface();
  closeModal('#auth-modal');
  $('#auth-form').reset();

  toast(`¡Bienvenido, ${user.name.split(' ')[0]}!`);
}

/* EVENTOS DE LA PÁGINA */

function initEvents() {
  $('#open-auth').addEventListener('click', openAuth);

  $('#close-auth').addEventListener('click', () => {
    closeModal('#auth-modal');
  });

  $$('[data-auth-mode]').forEach(button => {
    button.addEventListener('click', () => setAuthMode(button.dataset.authMode));
  });

  $('#auth-form').addEventListener('submit', handleAuth);

  $('#product-grid').addEventListener('click', event => {
    const button = event.target.closest('[data-add]');
    if (button) addToCart(button.dataset.add);
  });

  $('#category-tabs').addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (!button) return;

    activeCategory = button.dataset.category;

    $$('.category-tab').forEach(tab => {
      tab.classList.toggle('active', tab === button);
    });

    renderProducts();
  });

  $('#search-products').addEventListener('input', renderProducts);

  $('#open-cart').addEventListener('click', openCart);
  $('#close-cart').addEventListener('click', closeCart);
  $('#overlay').addEventListener('click', closeCart);

  $('#cart-items').addEventListener('click', event => {
    const button = event.target.closest('[data-change]');

    if (button) {
      changeQuantity(button.dataset.change, Number(button.dataset.delta));
    }
  });

  $('#continue-shopping').addEventListener('click', () => {
    closeCart();
    $('#catalogo').scrollIntoView({ behavior: 'smooth' });
  });

  $('#go-catalog').addEventListener('click', () => {
    $('#catalogo').scrollIntoView({ behavior: 'smooth' });
  });

  $('#continue-checkout').addEventListener('click', () => {
    if (!cart.size) return toast('Tu carrito está vacío.');

    closeCart();
    renderCheckoutSummary();
    $('#checkout-error').classList.add('hidden');
    openModal('#checkout-modal');
  });

  $('#checkout-form').addEventListener('submit', createOrder);

  $$('[data-close-modal]').forEach(button => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal-backdrop');
      closeModal(`#${modal.id}`);
    });
  });

  $$('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', event => {
      if (event.target === backdrop) {
        closeModal(`#${backdrop.id}`);
      }
    });
  });

  $('#finish-order').addEventListener('click', () => {
    closeModal('#payment-modal');

    $('#consultar-pedido').scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    $('#lookup-order-id').value = latestOrderId;
    toast('Guarda la referencia para consultar tu pedido de demostración.');
  });

  $('#copy-order-id').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('#payment-order-id').textContent);
      toast('Número de pedido copiado.');
    } catch {
      toast(`Número de pedido: ${$('#payment-order-id').textContent}`);
    }
  });

  $('#lookup-form').addEventListener('submit', lookupOrder);
  $('#school-list-file').addEventListener('change', handleListFile);
  $('#list-form').addEventListener('submit', submitList);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeCart();

      $$('.modal-backdrop').forEach(modal => {
        closeModal(`#${modal.id}`);
      });
    }
  });
}

/* INICIAR LA PÁGINA */

renderProducts();
renderCart();
updateUserInterface();
initEvents();