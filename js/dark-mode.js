(function () {
    'use strict';

    var STORAGE_KEY = 'matery-theme';
    var TRANSITION_DURATION = 1900;
    var root = document.documentElement;
    var script = document.currentScript;
    var animationEnabled = !script || script.getAttribute('data-animation') !== 'false';
    var toggles;
    var activeTransition = null;

    function saveTheme(theme) {
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch (e) {
            // 隐私模式或禁用 localStorage 时仍然允许本次切换。
        }
    }

    function setTheme(theme) {
        var isDark = theme === 'dark';
        root.setAttribute('data-theme', isDark ? 'dark' : 'light');

        toggles.forEach(function (toggle) {
            var icon = toggle.querySelector('i');
            var label = toggle.querySelector('span');
            if (icon) {
                icon.classList.toggle('fa-moon', isDark);
                icon.classList.toggle('fa-sun', !isDark);
            }
            if (label) {
                label.textContent = isDark ? '夜间模式' : '日间模式';
            }
            var action = isDark ? '切换日间模式' : '切换夜间模式';
            toggle.setAttribute('aria-label', action);
            toggle.setAttribute('title', action);
            toggle.setAttribute('aria-pressed', String(isDark));
        });
    }

    function currentTheme() {
        return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    function clearTransition() {
        if (!activeTransition) {
            return;
        }
        window.clearTimeout(activeTransition.commitTimer);
        window.clearTimeout(activeTransition.cleanupTimer);
        activeTransition.layer.remove();
        activeTransition = null;
        toggles.forEach(function (toggle) {
            toggle.removeAttribute('aria-busy');
        });
    }

    function switchTheme(theme) {
        // 合并动画期间的重复点击，避免主题、按钮和存储状态不同步。
        if (activeTransition) {
            return;
        }
        saveTheme(theme);

        var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!animationEnabled || reducedMotion) {
            setTheme(theme);
            return;
        }

        var layer = document.createElement('div');
        layer.className = 'theme-transition';
        layer.setAttribute('data-to', theme);
        layer.setAttribute('aria-hidden', 'true');
        layer.style.setProperty('--theme-transition-duration', TRANSITION_DURATION + 'ms');

        // 用弦长和弓高求圆的半径，宽屏与竖屏都保持真正的圆弧。
        var width = window.innerWidth;
        var height = window.innerHeight;
        var orbSize = Math.min(180, Math.max(90, Math.min(width, height) * 0.14));
        var halfChord = Math.max(1, (width - orbSize) / 2 - 16);
        var arcHeight = Math.max(1, Math.min(halfChord, height * 0.38, 320));
        var radius = (halfChord * halfChord + arcHeight * arcHeight) / (2 * arcHeight);
        var angle = Math.asin(Math.min(1, halfChord / radius)) * 180 / Math.PI;
        layer.style.setProperty('--theme-orbit-radius', radius + 'px');
        layer.style.setProperty('--theme-orbit-height', arcHeight + 'px');
        layer.style.setProperty('--theme-orbit-angle', angle + 'deg');
        ['day', 'night', 'stars', 'sun', 'moon'].forEach(function (part) {
            var element = document.createElement('div');
            element.className = 'theme-transition__' + part;
            layer.appendChild(element);
        });

        var transition = { layer: layer };
        activeTransition = transition;
        toggles.forEach(function (toggle) {
            toggle.setAttribute('aria-busy', 'true');
        });
        layer.addEventListener('animationend', function (event) {
            if (event.target === layer && activeTransition === transition) {
                setTheme(theme);
                clearTransition();
            }
        });
        document.body.appendChild(layer);

        // 天空完全遮住页面后再换主题，避免底层内容闪变。
        transition.commitTimer = window.setTimeout(function () {
            setTheme(theme);
        }, TRANSITION_DURATION * 0.45);
        // 后台标签页或禁用 CSS 动画时也能完成切换并清理遮罩。
        transition.cleanupTimer = window.setTimeout(function () {
            if (activeTransition === transition) {
                setTheme(theme);
                clearTransition();
            }
        }, TRANSITION_DURATION + 200);
    }

    function init() {
        toggles = document.querySelectorAll('[data-dark-mode-toggle]');
        setTheme(currentTheme());

        toggles.forEach(function (toggle) {
            toggle.addEventListener('click', function (event) {
                event.preventDefault();
                switchTheme(currentTheme() === 'dark' ? 'light' : 'dark');
            });
        });

        window.addEventListener('storage', function (event) {
            if (event.key === STORAGE_KEY && (event.newValue === 'dark' || event.newValue === 'light')) {
                clearTransition();
                setTheme(event.newValue);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
