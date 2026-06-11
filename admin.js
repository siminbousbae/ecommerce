document.addEventListener("DOMContentLoaded", () => {
  renderAdminUsers();
});

function renderAdminUsers() {
  const table = document.querySelector("[data-admin-users]");
  if (!table) return;
  const admin = Shoply.requireRole("admin");
  if (!admin) return;
  const search = document.querySelector("[data-user-search]");
  const roleFilter = document.querySelector("[data-role-filter]");
  const counts = document.querySelector("[data-user-counts]");

  function draw() {
    const query = search?.value.trim().toLowerCase() || "";
    const role = roleFilter?.value || "all";
    const users = Shoply.getUsers();
    const managed = users.filter((user) => user.role !== "admin");
    const filtered = managed.filter((user) => {
      const text = `${user.name} ${user.email}`.toLowerCase();
      return text.includes(query) && (role === "all" || user.role === role);
    });

    if (counts) {
      counts.innerHTML = `
        <div class="stat"><span>Total</span><strong>${managed.length}</strong></div>
        <div class="stat"><span>Sellers</span><strong>${managed.filter((user) => user.role === "seller").length}</strong></div>
        <div class="stat"><span>Buyers</span><strong>${managed.filter((user) => user.role === "buyer").length}</strong></div>
      `;
    }

    table.innerHTML = filtered.length ? `
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Created Date</th><th>Actions</th></tr></thead>
        <tbody>
          ${filtered.map((user) => `
            <tr>
              <td>${Shoply.escapeHtml(user.name)}</td>
              <td>${Shoply.escapeHtml(user.email)}</td>
              <td>${Shoply.escapeHtml(user.role)}</td>
              <td>${Shoply.escapeHtml(user.status)}</td>
              <td>${new Date(user.createdAt).toLocaleDateString()}</td>
              <td class="actions">
                <button class="btn ${user.status === "active" ? "danger" : "success"}" type="button" data-toggle="${user.id}">${user.status === "active" ? "Disable" : "Enable"}</button>
                <button class="btn secondary" type="button" data-reset="${user.id}">Reset Password</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    ` : `<div class="empty-state"><h2>No users found</h2><p>Try another search or filter.</p></div>`;
  }

  table.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-toggle]");
    const reset = event.target.closest("[data-reset]");
    if (!toggle && !reset) return;
    const users = Shoply.getUsers();
    const user = users.find((item) => item.id === (toggle?.dataset.toggle || reset?.dataset.reset));
    if (!user || user.role === "admin") return;
    if (toggle) {
      user.status = user.status === "active" ? "disabled" : "active";
      Shoply.toast(`User ${user.status === "active" ? "enabled" : "disabled"}.`, "success");
    }
    if (reset) {
      user.password = "Password123";
      Shoply.toast("Password reset to Password123.", "success");
    }
    Shoply.saveUsers(users);
    draw();
  });

  search?.addEventListener("input", draw);
  roleFilter?.addEventListener("change", draw);
  draw();
}
