const Shoply = (() => {
  const keys = {
    users: "shoply_users",
    products: "shoply_products",
    orders: "shoply_orders",
    currentUser: "shoply_currentUser",
    favorites: "favorites",
  };

  const adminUser = {
    id: "admin-1",
    name: "System Administrator",
    email: "admin@shoply.com",
    password: "admin123",
    role: "admin",
    status: "active",
    createdAt: new Date().toISOString(),
  };

  const demoSeller = {
    id: "seller-demo",
    name: "Shoply Demo Seller",
    email: "seller@shoply.com",
    password: "seller123",
    role: "seller",
    status: "active",
    createdAt: new Date().toISOString(),
  };

  const starterProducts = [
    ["Cool Shoes", "Lightweight everyday sneakers with clean street style.", 25, "Shoes", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600", 18],
    ["Smart Watch Pro", "Fitness tracking, notifications, and all-day battery.", 55, "Electronics", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600", 12],
    ["Sneakers", "Comfort sneakers built for long walks and quick errands.", 70, "Shoes", "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600", 8],
    ["Smartphone", "Bright display, fast camera, and dependable storage.", 300, "Devices", "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600", 7],
    ["Tablet", "Portable tablet for study, streaming, and light work.", 200, "Devices", "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600", 9],
    ["Smart TV", "Crisp home entertainment display with streaming support.", 500, "Electronics", "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=600", 5],
    ["Bluetooth Speaker", "Compact speaker with rich sound and easy pairing.", 60, "Electronics", "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600", 14],
    ["Gaming Mouse", "Responsive mouse with programmable buttons.", 45, "Electronics", "https://images.unsplash.com/photo-1527814050087-3793815479db?w=600", 15],
    ["Smart Watch", "A simple smartwatch for everyday reminders and steps.", 40, "Electronics", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600", 10],
    ["Headphones", "Comfortable over-ear headphones with full sound.", 30, "Electronics", "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600", 11],
    ["Backpack", "Durable daypack with room for laptop and daily gear.", 20, "Fashion", "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600", 16],
    ["Camera", "Beginner-friendly camera for travel and product photos.", 120, "Devices", "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600", 6],
  ].map(([name, description, price, category, image, stock], index) => ({
    id: `prod-${index + 1}`,
    name,
    description,
    price,
    category,
    image,
    stock,
    sellerId: demoSeller.id,
    sellerName: demoSeller.name,
    createdAt: new Date(Date.now() - index * 86400000).toISOString(),
  }));

  function read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function uuid(prefix) {
    if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function seed() {
    const users = read(keys.users, []);
    if (!users.some((user) => user.id === adminUser.id)) users.unshift(adminUser);
    if (!users.some((user) => user.id === demoSeller.id)) users.push(demoSeller);
    write(keys.users, users);

    if (!localStorage.getItem(keys.products)) write(keys.products, starterProducts);
    if (!localStorage.getItem(keys.orders)) write(keys.orders, []);
    if (!localStorage.getItem(keys.favorites)) write(keys.favorites, []);
  }

  function getCurrentUser() {
    return read(keys.currentUser, null);
  }

  function setCurrentUser(user) {
    write(keys.currentUser, user);
  }

  function logout() {
    localStorage.removeItem(keys.currentUser);
    toast("Logged out successfully.", "success");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 350);
  }

  function cartKey(userId) {
    return `shoply_cart_${userId}`;
  }

  function getCart(userId = getCurrentUser()?.id) {
    if (!userId) return [];
    return read(cartKey(userId), []);
  }

  function saveCart(cart, userId = getCurrentUser()?.id) {
    if (!userId) return;
    write(cartKey(userId), cart);
    updateCartCount();
  }

  function getUsers() {
    return read(keys.users, []);
  }

  function saveUsers(users) {
    write(keys.users, users);
  }

  function getProducts() {
    return read(keys.products, []);
  }

  function saveProducts(products) {
    write(keys.products, products);
  }

  function getOrders() {
    return read(keys.orders, []);
  }

  function saveOrders(orders) {
    write(keys.orders, orders);
  }

  function formatMoney(value) {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function toast(message, type = "info") {
    let wrap = document.querySelector(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    const item = document.createElement("div");
    item.className = `toast ${type}`;
    item.textContent = message;
    wrap.appendChild(item);
    setTimeout(() => item.remove(), 3000);
  }

  function updateCartCount() {
    const currentUser = getCurrentUser();
    const count = currentUser?.role === "buyer"
      ? getCart(currentUser.id).reduce((sum, item) => sum + item.quantity, 0)
      : 0;
    document.querySelectorAll("[data-cart-count]").forEach((node) => {
      node.textContent = count;
    });
  }

  function buildNavbar() {
    const nav = document.querySelector("[data-nav]");
    if (!nav) return;

    const currentUser = getCurrentUser();
    const links = [{ href: "index.html", label: "Home" }];

    if (!currentUser) {
      links.push({ href: "login.html", label: "Login" }, { href: "register.html", label: "Register" });
    } else if (currentUser.role === "buyer") {
      links.push({ href: "orders.html", label: "My Orders" }, { href: "cart.html", label: `Cart (${getCart(currentUser.id).reduce((sum, item) => sum + item.quantity, 0)})`, cart: true });
    } else if (currentUser.role === "seller") {
      links.push({ href: "seller-dashboard.html", label: "My Products" }, { href: "seller-stats.html", label: "Sales Stats" });
    } else if (currentUser.role === "admin") {
      links.push({ href: "admin-users.html", label: "User Management" });
    }

    nav.innerHTML = `
      <div class="nav-links">
        ${links.map((link) => `<a href="${link.href}"${link.cart ? " class=\"cart-pill\"" : ""}>${link.label.replace(/\((\d+)\)/, '(<span data-cart-count>$1</span>)')}</a>`).join("")}
      </div>
      <div class="user-menu">
        ${currentUser ? `<span>${escapeHtml(currentUser.role === "admin" ? "Admin" : currentUser.name)} v</span><button type="button" data-logout>Logout</button>` : ""}
      </div>
    `;
    nav.querySelector("[data-logout]")?.addEventListener("click", logout);
  }

  function renderShell() {
    buildNavbar();
    updateCartCount();
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;",
    }[char]));
  }

  function requireRole(roles) {
    const currentUser = getCurrentUser();
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (!currentUser || !allowed.includes(currentUser.role)) {
      toast("Please log in with the correct account to view this page.", "error");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 500);
      return null;
    }
    return currentUser;
  }

  function addToCart(productId) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      toast("Please log in as a buyer before adding items to your cart.", "error");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 650);
      return;
    }
    if (currentUser.role !== "buyer") {
      toast("Only buyers can add products to cart.", "error");
      return;
    }

    const product = getProducts().find((item) => item.id === productId);
    if (!product || product.stock <= 0) {
      toast("This product is out of stock.", "error");
      return;
    }

    const cart = getCart(currentUser.id);
    const existing = cart.find((item) => item.productId === productId);
    if (existing) {
      if (existing.quantity >= product.stock) {
        toast("You reached the available stock for this product.", "error");
        return;
      }
      existing.quantity += 1;
    } else {
      cart.push({ productId, quantity: 1 });
    }
    saveCart(cart, currentUser.id);
    buildNavbar();
    toast(`${product.name} added to cart.`, "success");
  }

  function addToFav(productId) {
    const favorites = read(keys.favorites, []);
    if (!favorites.includes(productId)) favorites.push(productId);
    write(keys.favorites, favorites);
    toast("Added to favorites.", "success");
  }

  function renderProducts() {
    const container = document.querySelector("[data-products]");
    if (!container) return;
    const searchInput = document.querySelector("[data-product-search]");
    const categoryButtons = document.querySelectorAll("[data-category]");
    let activeCategory = "All";

    function render() {
      const query = searchInput?.value.trim().toLowerCase() || "";
      const products = getProducts().filter((product) => {
        const categoryMatch = activeCategory === "All" || product.category === activeCategory;
        const text = `${product.name} ${product.description} ${product.sellerName}`.toLowerCase();
        return categoryMatch && text.includes(query);
      });

      container.innerHTML = products.length ? products.map((product) => `
        <article class="product">
          <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}">
          <div class="product-body">
            <p class="product-name">${escapeHtml(product.name)}</p>
            <p class="muted">${escapeHtml(product.description)}</p>
            <p class="muted">Sold by ${escapeHtml(product.sellerName)}</p>
            <p class="price">${formatMoney(product.price)}</p>
            <p class="stock">${product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</p>
            <div class="actions">
              <button class="button" type="button" data-add-cart="${product.id}" ${product.stock <= 0 ? "disabled" : ""}>Add to Cart</button>
              <button class="button secondary" type="button" data-favorite="${product.id}">Favorite</button>
            </div>
          </div>
        </article>
      `).join("") : `<div class="empty-state"><h2>No products found</h2><p>Try another search or category.</p></div>`;
    }

    searchInput?.addEventListener("input", render);
    categoryButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activeCategory = button.dataset.category;
        categoryButtons.forEach((item) => item.classList.toggle("active", item === button));
        render();
      });
    });
    container.addEventListener("click", (event) => {
      const cartButton = event.target.closest("[data-add-cart]");
      const favButton = event.target.closest("[data-favorite]");
      if (cartButton) addToCart(cartButton.dataset.addCart);
      if (favButton) addToFav(favButton.dataset.favorite);
    });
    render();
  }

  return {
    keys,
    seed,
    uuid,
    read,
    write,
    toast,
    escapeHtml,
    formatMoney,
    getCurrentUser,
    setCurrentUser,
    getUsers,
    saveUsers,
    getProducts,
    saveProducts,
    getOrders,
    saveOrders,
    getCart,
    saveCart,
    updateCartCount,
    renderShell,
    renderProducts,
    requireRole,
  };
})();

Shoply.seed();

document.addEventListener("DOMContentLoaded", () => {
  Shoply.renderShell();
  Shoply.renderProducts();
});
