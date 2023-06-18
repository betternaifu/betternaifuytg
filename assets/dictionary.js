// function to set a given theme/color-scheme
function setTheme(themeName) {
    localStorage.setItem('theme', themeName);
    document.documentElement.className = themeName;
}

// function to toggle between light and dark theme
function toggleTheme() {
    if (localStorage.getItem('theme') === 'theme-dark') {
    setTheme('theme-light');
    } else {
    setTheme('theme-dark');
    }
}

// immediately invoked to set the theme on initial load
function loadTheme() {
    if (localStorage.getItem('theme') === 'theme-light') {
    setTheme('theme-light');
    document.getElementById('slider').checked = true;
    } else {
    setTheme('theme-dark');
    document.getElementById('slider').checked = false;
    }
};

function addToggleListener() {
    document.getElementById('slider').addEventListener('change', toggleTheme);
}

document.addEventListener('DOMContentLoaded', () => {loadTheme(); addToggleListener();});