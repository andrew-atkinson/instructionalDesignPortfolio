document.querySelectorAll('.accordion-trigger').forEach(btn => {
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    const body     = document.getElementById(btn.getAttribute('aria-controls'));
    const icon     = btn.querySelector('.trigger-icon');

    // Snapshot the trigger's distance from the top of the viewport before any DOM changes.
    const triggerTop = btn.getBoundingClientRect().top;

    // Close every other open section.
    document.querySelectorAll('.accordion-trigger').forEach(other => {
      if (other === btn) return;
      if (other.getAttribute('aria-expanded') !== 'true') return;
      const otherBody = document.getElementById(other.getAttribute('aria-controls'));
      const otherIcon = other.querySelector('.trigger-icon');
      other.setAttribute('aria-expanded', 'false');
      otherIcon.textContent = '+';
      otherBody.classList.remove('open');
    });

    // Toggle the clicked section.
    btn.setAttribute('aria-expanded', String(!expanded));
    icon.textContent = expanded ? '+' : '−';
    if (expanded) {
      body.classList.remove('open');
    } else {
      body.classList.add('open');
    }

    // Restore the trigger's viewport position by compensating for any layout shift.
    const shift = btn.getBoundingClientRect().top - triggerTop;
    if (shift !== 0) window.scrollBy({ top: shift, behavior: 'instant' });
  });
});
