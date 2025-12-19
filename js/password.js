function validatePassword(pwd) {
  if (!pwd) return "Password required";
  if (pwd.length < 12) return "Password must be at least 12 characters";
  if (!/[a-z]/.test(pwd)) return "Password must include a lowercase letter";
  if (!/[A-Z]/.test(pwd)) return "Password must include an uppercase letter";
  if (!/[0-9]/.test(pwd)) return "Password must include a digit";
  if (!/[!@#$%^&*()]/.test(pwd)) return "Password must include one symbol from !@#$%^&*()";
  return "";
}
