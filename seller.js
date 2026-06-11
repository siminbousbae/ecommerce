document.addEventListener("DOMContentLoaded", () => {
  renderSellerDashboard();
  renderSellerStats();
});

function renderSellerDashboard() {
  const table = document.querySelector("[data-seller-products]");
  const form = document.querySelector("[data-product-form]");
  if (!table || !form) return;
  const user = Shoply.requireRole("seller");
  if (!user) return;
  let editingId = null;

  function resetForm() {
    editingId = null;
    form.reset();
    form.querySelector("button[type='submit']").textContent = "Save Product";
  }

  function draw() {
    const products = Shoply.getProducts().filter((product) => product.sellerId === user.id);
    table.innerHTML = products.length ? `
      <table>
        <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
        <tbody>
          ${products.map((product) => `
            <tr>
              <td><img class="thumb" src="${Shoply.escapeHtml(product.image)}" alt="${Shoply.escapeHtml(product.name)}"></td>
              <td>${Shoply.escapeHtml(product.name)}</td>
              <td>${Shoply.escapeHtml(product.category)}</td>
              <td>${Shoply.formatMoney(product.price)}</td>
              <td>${product.stock}</td>
              <td class="actions">
                <button class="btn secondary" type="button" data-edit="${product.id}">Edit</button>
                <button class="btn danger" type="button" data-delete="${product.id}">Delete</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    ` : `<div class="empty-state"><h2>No products yet</h2><p>Add your first product!</p></div>`;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const product = {
      id: editingId || Shoply.uuid("prod"),
      name: data.get("name").trim(),
      description: data.get("description").trim(),
      price: Number(data.get("price")),
      category: data.get("category").trim(),
      image: data.get("image").trim(),
      stock: Number(data.get("stock")),
      sellerId: user.id,
      sellerName: user.name,
      createdAt: editingId ? undefined : new Date().toISOString(),
    };

    if (!product.name || !product.description || !product.category || !product.image || product.price < 0 || product.stock < 0) {
      Shoply.toast("Please enter valid product details.", "error");
      return;
    }

    const products = Shoply.getProducts();
    const index = products.findIndex((item) => item.id === editingId && item.sellerId === user.id);
    if (index >= 0) {
      product.createdAt = products[index].createdAt;
      products[index] = product;
      Shoply.toast("Product updated.", "success");
    } else {
      products.unshift(product);
      Shoply.toast("Product added.", "success");
    }
    Shoply.saveProducts(products);
    resetForm();
    draw();
  });

  table.addEventListener("click", (event) => {
    const edit = event.target.closest("[data-edit]");
    const remove = event.target.closest("[data-delete]");
    const products = Shoply.getProducts();
    if (edit) {
      const product = products.find((item) => item.id === edit.dataset.edit && item.sellerId === user.id);
      if (!product) return;
      editingId = product.id;
      form.elements.name.value = product.name;
      form.elements.description.value = product.description;
      form.elements.price.value = product.price;
      form.elements.category.value = product.category;
      form.elements.image.value = product.image;
      form.elements.stock.value = product.stock;
      form.querySelector("button[type='submit']").textContent = "Update Product";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (remove && confirm("Delete this product?")) {
      Shoply.saveProducts(products.filter((item) => !(item.id === remove.dataset.delete && item.sellerId === user.id)));
      Shoply.toast("Product deleted.", "success");
      draw();
    }
  });

  document.querySelector("[data-reset-product]")?.addEventListener("click", resetForm);
  draw();
}

function renderSellerStats() {
  const node = document.querySelector("[data-seller-stats]");
  if (!node) return;
  const user = Shoply.requireRole("seller");
  if (!user) return;
  const filter = document.querySelector("[data-date-filter]");

  function inRange(orderDate) {
    const value = filter?.value || "all";
    if (value === "all") return true;
    const days = value === "7" ? 7 : 30;
    return Date.now() - new Date(orderDate).getTime() <= days * 86400000;
  }

  function draw() {
    const sellerLines = [];
    Shoply.getOrders().filter((order) => inRange(order.date)).forEach((order) => {
      const lines = order.items.filter((item) => item.sellerId === user.id);
      if (lines.length) sellerLines.push({ order, lines });
    });
    const revenue = sellerLines.reduce((sum, entry) => sum + entry.lines.reduce((lineSum, item) => lineSum + item.price * item.quantity, 0), 0);
    const productsSold = sellerLines.reduce((sum, entry) => sum + entry.lines.reduce((lineSum, item) => lineSum + item.quantity, 0), 0);
    const totals = {};
    sellerLines.forEach((entry) => entry.lines.forEach((item) => {
      totals[item.name] = (totals[item.name] || 0) + item.quantity;
    }));
    const best = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = Math.max(1, ...best.map((item) => item[1]));

    node.innerHTML = `
      <div class="stats-grid">
        <div class="stat"><span>Total Revenue</span><strong>${Shoply.formatMoney(revenue)}</strong></div>
        <div class="stat"><span>Total Orders</span><strong>${sellerLines.length}</strong></div>
        <div class="stat"><span>Total Products Sold</span><strong>${productsSold}</strong></div>
      </div>
      ${best.length ? `<div class="panel"><h2>Best Selling Products</h2><div class="bar-list">${best.map(([name, qty]) => `<div class="bar-row"><strong>${Shoply.escapeHtml(name)} (${qty})</strong><div class="bar-track"><div class="bar-fill" style="width:${Math.round((qty / max) * 100)}%"></div></div></div>`).join("")}</div></div>` : `<div class="empty-state"><h2>No sales yet</h2><p>Sales statistics will appear after buyers place orders.</p></div>`}
    `;
  }

  filter?.addEventListener("change", draw);
  draw();
}
