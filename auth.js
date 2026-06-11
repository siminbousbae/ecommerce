document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector("[data-login-form]");
  const registerForm = document.querySelector("[data-register-form]");

  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = loginForm.email.value.trim().toLowerCase();
      const password = loginForm.password.value;
      const user = Shoply.getUsers().find((item) => item.email.toLowerCase() === email && item.password === password);

      if (!user) {
        Shoply.toast("Invalid email or password.", "error");
        return;
      }
      if (user.status === "disabled") {
        Shoply.toast("This account has been disabled.", "error");
        return;
      }

      Shoply.setCurrentUser(user);
      Shoply.toast("Login successful.", "success");
      const target = user.role === "admin" ? "admin-users.html" : user.role === "seller" ? "seller-dashboard.html" : "index.html";
      setTimeout(() => {
        window.location.href = target;
      }, 500);
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(registerForm);
      const name = form.get("name").trim();
      const email = form.get("email").trim().toLowerCase();
      const password = form.get("password");
      const confirm = form.get("confirm");
      const role = form.get("role");

      if (!name || !email || !password || !confirm || !role) {
        Shoply.toast("Please complete all fields.", "error");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        Shoply.toast("Please enter a valid email address.", "error");
        return;
      }
      if (password.length < 6) {
        Shoply.toast("Password must be at least 6 characters.", "error");
        return;
      }
      if (password !== confirm) {
        Shoply.toast("Passwords do not match.", "error");
        return;
      }
      if (Shoply.getUsers().some((user) => user.email.toLowerCase() === email)) {
        Shoply.toast("An account with this email already exists.", "error");
        return;
      }

      const user = {
        id: Shoply.uuid("user"),
        name,
        email,
        password,
        role,
        status: "active",
        createdAt: new Date().toISOString(),
      };
      const users = Shoply.getUsers();
      users.push(user);
      Shoply.saveUsers(users);
      Shoply.toast("Registration successful. Please log in.", "success");
      registerForm.reset();
      setTimeout(() => {
        window.location.href = "login.html";
      }, 700);
    });
  }
});
