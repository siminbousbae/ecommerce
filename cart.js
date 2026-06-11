document.addEventListener("DOMContentLoaded", () => {
  renderCartPage();
  renderCheckoutPage();
  renderConfirmationPage();
  renderOrdersPage();
});

function hydrateCartItems(userId) {
  const products = Shoply.getProducts();
  return Shoply.getCart(userId).map((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return product ? { ...item, product } : null;
  }).filter(Boolean);
}

function cartTotal(items) {
  return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
}

function renderCartPage() {
  const container = document.querySelector("[data-cart-items]");
  if (!container) return;
  const user = Shoply.requireRole("buyer");
  if (!user) return;

  const items = hydrateCartItems(user.id);
  const summary = document.querySelector("[data-cart-total]");
  const checkout = document.querySelector("[data-checkout]");

  if (!items.length) {
    container.innerHTML = `<div class="empty-state"><h2>Your cart is empty</h2><p>Find something you love and add it here.</p><p><a class="button" href="index.html">Continue Shopping</a></p></div>`;
    if (summary) summary.textContent = Shoply.formatMoney(0);
    if (checkout) checkout.disabled = true;
    return;
  }

  container.innerHTML = items.map((item) => `
    <div class="cart-item">
      <img class="item-image" src="${Shoply.escapeHtml(item.product.image)}" alt="${Shoply.escapeHtml(item.product.name)}">
      <div>
        <p class="product-name">${Shoply.escapeHtml(item.product.name)}</p>
        <p class="muted">${Shoply.formatMoney(item.product.price)} each</p>
      </div>
      <div class="qty-control" aria-label="Quantity controls">
        <button type="button" data-dec="${item.productId}">-</button>
        <span>${item.quantity}</span>
        <button type="button" data-inc="${item.productId}" ${item.quantity >= item.product.stock ? "disabled" : ""}>+</button>
      </div>
      <strong>${Shoply.formatMoney(item.product.price * item.quantity)}</strong>
      <button class="remove-btn" type="button" data-remove="${item.productId}">Remove</button>
    </div>
  `).join("");
  if (summary) summary.textContent = Shoply.formatMoney(cartTotal(items));
  if (checkout) checkout.disabled = false;

  container.onclick = (event) => {
    const inc = event.target.closest("[data-inc]");
    const dec = event.target.closest("[data-dec]");
    const remove = event.target.closest("[data-remove]");
    const cart = Shoply.getCart(user.id);
    const productId = inc?.dataset.inc || dec?.dataset.dec || remove?.dataset.remove;
    const index = cart.findIndex((item) => item.productId === productId);
    if (index < 0) return;

    if (inc) {
      const stock = Shoply.getProducts().find((product) => product.id === productId)?.stock || 0;
      if (cart[index].quantity < stock) cart[index].quantity += 1;
    }
    if (dec) {
      cart[index].quantity -= 1;
      if (cart[index].quantity <= 0) cart.splice(index, 1);
    }
    if (remove) cart.splice(index, 1);
    Shoply.saveCart(cart, user.id);
    Shoply.toast("Cart updated.", "success");
    renderCartPage();
  };
}

function renderCheckoutPage() {
  const form = document.querySelector("[data-checkout-form]");
  if (!form) return;
  const user = Shoply.requireRole("buyer");
  if (!user) return;
  const items = hydrateCartItems(user.id);
  const summary = document.querySelector("[data-order-summary]");

  if (!items.length) {
    summary.innerHTML = `<div class="empty-state"><h3>Your cart is empty</h3><p><a class="button" href="index.html">Continue Shopping</a></p></div>`;
    form.querySelector("button[type='submit']").disabled = true;
    return;
  }

  summary.innerHTML = `
    ${items.map((item) => `<div class="summary-line"><span>${Shoply.escapeHtml(item.product.name)} x ${item.quantity}</span><strong>${Shoply.formatMoney(item.product.price * item.quantity)}</strong></div>`).join("")}
    <div class="summary-line"><span>Total</span><strong>${Shoply.formatMoney(cartTotal(items))}</strong></div>
  `;

  const cardInput = form.elements.cardNumber;
  cardInput?.addEventListener("input", () => {
    cardInput.value = cardInput.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const cardNumber = data.get("cardNumber").replace(/\s/g, "");
    const expiry = data.get("expiry").trim();
    const cvv = data.get("cvv").trim();

    if (!/^\d{16}$/.test(cardNumber) || !/^\d{2}\/\d{2}$/.test(expiry) || !/^\d{3}$/.test(cvv)) {
      Shoply.toast("Please enter valid payment details.", "error");
      return;
    }

    const button = form.querySelector("button[type='submit']");
    button.disabled = true;
    button.innerHTML = `<span class="spinner"></span> Processing`;
    setTimeout(() => {
      const freshItems = hydrateCartItems(user.id);
      const order = {
        id: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
        userId: user.id,
        items: freshItems.map((item) => ({
          productId: item.productId,
          sellerId: item.product.sellerId,
          sellerName: item.product.sellerName,
          name: item.product.name,
          image: item.product.image,
          price: item.product.price,
          quantity: item.quantity,
        })),
        total: cartTotal(freshItems),
        address: {
          name: data.get("shipName").trim(),
          street: data.get("street").trim(),
          city: data.get("city").trim(),
          postalCode: data.get("postalCode").trim(),
          phone: data.get("phone").trim(),
        },
        status: "Paid",
        date: new Date().toISOString(),
      };
      const orders = Shoply.getOrders();
      orders.unshift(order);
      Shoply.saveOrders(orders);
      const products = Shoply.getProducts();
      order.items.forEach((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        if (product) product.stock = Math.max(0, product.stock - item.quantity);
      });
      Shoply.saveProducts(products);
      Shoply.saveCart([], user.id);
      localStorage.setItem("shoply_lastOrderId", order.id);
      window.location.href = "order-confirmation.html";
    }, 2000);
  });
}

function renderConfirmationPage() {
  const node = document.querySelector("[data-confirmation]");
  if (!node) return;
  const user = Shoply.requireRole("buyer");
  if (!user) return;
  const orderId = localStorage.getItem("shoply_lastOrderId");
  const order = Shoply.getOrders().find((item) => item.id === orderId && item.userId === user.id);
  if (!order) {
    node.innerHTML = `<div class="empty-state"><h2>No recent order found</h2><p><a class="button" href="orders.html">View My Orders</a></p></div>`;
    return;
  }
  node.innerHTML = `
    <div class="panel">
      <h1 class="page-title">Payment Successful</h1>
      <p class="muted">Order ${order.id} was placed on ${new Date(order.date).toLocaleString()}.</p>
      ${order.items.map((item) => `<div class="summary-line"><span>${Shoply.escapeHtml(item.name)} x ${item.quantity}</span><strong>${Shoply.formatMoney(item.price * item.quantity)}</strong></div>`).join("")}
      <div class="summary-line"><span>Total</span><strong>${Shoply.formatMoney(order.total)}</strong></div>
      <p class="muted">Shipping to ${Shoply.escapeHtml(order.address.name)}, ${Shoply.escapeHtml(order.address.street)}, ${Shoply.escapeHtml(order.address.city)}.</p>
      <div class="actions">
        <a class="button" href="index.html">Continue Shopping</a>
        <a class="button secondary" href="orders.html">View My Orders</a>
      </div>
    </div>
  `;
}

function renderOrdersPage() {
  const node = document.querySelector("[data-orders]");
  if (!node) return;
  const user = Shoply.requireRole("buyer");
  if (!user) return;
  const orders = Shoply.getOrders().filter((order) => order.userId === user.id);
  if (!orders.length) {
    node.innerHTML = `<div class="empty-state"><h2>No orders yet</h2><p>Your paid orders will appear here.</p><p><a class="button" href="index.html">Continue Shopping</a></p></div>`;
    return;
  }
  node.innerHTML = orders.map((order) => `
    <details>
      <summary>${order.id} - ${new Date(order.date).toLocaleDateString()} - ${Shoply.formatMoney(order.total)} - ${order.status}</summary>
      ${order.items.map((item) => `<div class="order-item"><img class="item-image" src="${Shoply.escapeHtml(item.image)}" alt="${Shoply.escapeHtml(item.name)}"><span>${Shoply.escapeHtml(item.name)}</span><span>${Shoply.formatMoney(item.price)}</span><span>x ${item.quantity}</span><strong>${Shoply.formatMoney(item.price * item.quantity)}</strong></div>`).join("")}
    </details>
  `).join("");
}
