document.querySelectorAll('.accordion-trigger').forEach(btn => {
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    const body     = document.getElementById(btn.getAttribute('aria-controls'));
    const icon     = btn.querySelector('.trigger-icon');

    btn.setAttribute('aria-expanded', String(!expanded));
    icon.textContent = expanded ? '+' : '−';

    if (expanded) {
      body.classList.remove('open');
    } else {
      body.classList.add('open');
    }
  });
});
