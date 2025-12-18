const ALLOWED_SYMBOLS = "!@#$%^&*()";

function validatePassword(pwd) {
  if (!pwd || pwd.length < 12)
    return "Password must be at least 12 characters.";
  if (!/[a-z]/.test(pwd))
    return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(pwd))
    return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(pwd))
    return "Password must include a digit.";

  const symRegex = new RegExp(
    "[" + ALLOWED_SYMBOLS.replace(/[\^\-\]\\]/g, "\\$&") + "]"
  );
  if (!symRegex.test(pwd))
    return "Password must include a symbol from !@#$%^&*().";

  return null;
}
