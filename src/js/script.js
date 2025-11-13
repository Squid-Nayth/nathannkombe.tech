window.addEventListener('DOMContentLoaded', function() {
  const name = "Nathan Michel";
  const el = document.getElementById('typewriter');
  let i = 0;
  function typeWriter() {
    if (i <= name.length) {
      el.textContent = name.slice(0, i);
      i++;
      setTimeout(typeWriter, 120);
    }
  }
  typeWriter();
});
