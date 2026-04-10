document.addEventListener('DOMContentLoaded', () => {
  // Agar allaqachon tizimga kirgan bo'lsa, admin.html ga o'tkazish
  if (sessionStorage.getItem('adminLoggedIn') === 'true') {
    window.location.href = 'admin.html';
  }

  const loginForm = document.getElementById('login-form');
  const errorMsg = document.getElementById('login-error');

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Xatolik xabarini yashirish
    errorMsg.style.display = 'none';
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    // Oddiy hardcoded admin va parol (hozirgi test holat uchun)
    // Aslida buni bekentda xavfsiz qilish kerak. Lekin Firebase auth bo'lmagani uchun shunday qilinmoqda
    if (username === 'admin' && password === 'admin123') {
      sessionStorage.setItem('adminLoggedIn', 'true');
      window.location.href = 'admin.html';
    } else {
      errorMsg.style.display = 'block';
      // Animatsiya orqali xatolikni ko'rsatish
      errorMsg.classList.add('shake');
      setTimeout(() => errorMsg.classList.remove('shake'), 400);
    }
  });
});
