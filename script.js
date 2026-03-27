const yearElement = document.getElementById('year');
if (yearElement) {
    yearElement.textContent = `Updated ${new Date().getFullYear()}`;
}

const revealTargets = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(
    entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    },
    { threshold: 0.15 }
);

revealTargets.forEach(target => observer.observe(target));
