// Check for saved theme preference, otherwise use system preference
function getInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Apply theme to document
function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    // Update button icon
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    // Save theme preference
    localStorage.setItem('theme', theme);
}

// Initialize theme
document.addEventListener('DOMContentLoaded', () => {
    const initialTheme = getInitialTheme();
    applyTheme(initialTheme);

    // Add click handler to theme toggle button
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    });
});
