document.addEventListener("DOMContentLoaded", () => {
    initScrollReveal();
    initPassGate();
    initMenu();
    initBookGallery();
    initBookViewer();
});

function initScrollReveal() {
    const targets = document.querySelectorAll("[data-animate]");
    if (!targets.length) return;

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("in-view");
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15 }
        );

        targets.forEach(target => observer.observe(target));
    } else {
        targets.forEach(target => target.classList.add("in-view"));
    }
}

function initPassGate() {
    const toggleBtn = document.querySelector("[data-pass-toggle]");
    const submitBtn = document.querySelector("[data-pass-submit]");
    const panel = document.querySelector(".pass-panel");
    const input = document.querySelector("#gallery-pass");
    const feedback = document.querySelector(".pass-feedback");
    const secret = document.querySelector("[data-secret-gallery]");
    if (!toggleBtn || !submitBtn || !panel || !input || !feedback) return;

    const PASS_CODE = "MASU10";

    toggleBtn.addEventListener("click", () => {
        panel.classList.toggle("visible");
        panel.setAttribute("aria-hidden", panel.classList.contains("visible") ? "false" : "true");
        if (panel.classList.contains("visible")) {
            input.focus();
        } else {
            input.value = "";
            feedback.textContent = "";
        }
    });

    submitBtn.addEventListener("click", () => {
        const value = input.value.trim().toUpperCase();
        if (!value) return;
        if (value === PASS_CODE) {
            feedback.textContent = "Access granted. We will guide you quietly.";
            feedback.style.color = "var(--gold)";
            if (secret) {
                secret.classList.add("open");
            }
        } else {
            feedback.textContent = "Invalid pass. Please check your 10€ pass.";
            feedback.style.color = "#f17373";
        }
        input.value = "";
    });
}

function initBookGallery() {
    const photos = document.querySelectorAll(".book-photo");
    if (!photos.length) return;

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("visible");
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.2 }
        );

        photos.forEach(photo => observer.observe(photo));
    } else {
        photos.forEach(photo => photo.classList.add("visible"));
    }
}

function initBookViewer() {
    document.querySelectorAll(".book-viewer").forEach(section => {
        const pagesRoot = section.querySelector("[data-viewer-pages]");
        const leftImg = section.querySelector(".book-page-left img");
        const rightImg = section.querySelector(".book-page-right img");
        const rightPage = section.querySelector(".book-page-right");
        const prevBtn = section.querySelector(".book-nav.prev");
        const nextBtn = section.querySelector(".book-nav.next");
        if (!pagesRoot || !leftImg || !rightImg || !rightPage || !prevBtn || !nextBtn) return;

        const indicator = section.querySelector("[data-book-current]");
        const thumbsRoot = section.querySelector("[data-viewer-thumbs]");
        let thumbs = [];

        const pages = Array.from(pagesRoot.querySelectorAll("span"))
            .map(span => ({
                src: span.dataset.src,
                alt: span.dataset.alt || ""
            }))
            .filter(page => page.src);

        if (!pages.length) return;

        const initThumbs = () => {
            if (!thumbsRoot) return [];
            let nodes = Array.from(thumbsRoot.querySelectorAll("[data-thumb]"));
            if (!nodes.length) {
                const fragment = document.createDocumentFragment();
                pages.forEach((page, idx) => {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.className = "book-thumb";
                    button.dataset.thumb = "";
                    button.dataset.pageIndex = String(idx);
                    const img = document.createElement("img");
                    img.src = page.src;
                    img.alt = page.alt;
                    img.loading = "lazy";
                    button.appendChild(img);
                    fragment.appendChild(button);
                });
                thumbsRoot.appendChild(fragment);
                nodes = Array.from(thumbsRoot.querySelectorAll("[data-thumb]"));
            } else {
                nodes.forEach((button, idx) => {
                    if (!button.dataset.pageIndex) {
                        button.dataset.pageIndex = String(idx);
                    }
                    const img = button.querySelector("img");
                    if (img && !img.getAttribute("src") && pages[idx]) {
                        img.src = pages[idx].src;
                        img.alt = pages[idx].alt;
                    }
                });
            }
            return nodes;
        };

        thumbs = initThumbs();

        const TURN_UPDATE_DELAY = 260;
        const TURN_RESET_DELAY = 520;
        let index = 0;
        let isAnimating = false;

        const maxIndex = () => {
            if (pages.length <= 1) return 0;
            return pages.length % 2 === 0 ? pages.length - 2 : pages.length - 1;
        };

        const updateIndicator = () => {
            if (!indicator) return;
            const start = index + 1;
            const end = Math.min(index + 2, pages.length);
            indicator.textContent = start === end ? `${start}` : `${start}\u2013${end}`;
        };

        const updateNavState = () => {
            prevBtn.disabled = index <= 0;
            nextBtn.disabled = index >= maxIndex();
        };

        const updateThumbs = () => {
            if (!thumbs.length) return;
            thumbs.forEach(button => {
                const pageIndex = Number(button.dataset.pageIndex);
                const active = pageIndex === index || pageIndex === index + 1;
                button.classList.toggle("is-active", active);
            });
        };

        const render = () => {
            const leftPage = pages[index];
            if (leftPage) {
                leftImg.src = leftPage.src;
                leftImg.alt = leftPage.alt;
            }

            const rightPageData = pages[index + 1];
            if (rightPageData) {
                rightImg.src = rightPageData.src;
                rightImg.alt = rightPageData.alt;
                rightPage.classList.remove("is-empty");
            } else {
                rightImg.removeAttribute("src");
                rightImg.alt = "";
                rightPage.classList.add("is-empty");
            }

            updateIndicator();
            updateNavState();
            updateThumbs();
        };

        const turnForward = () => {
            if (isAnimating || index >= maxIndex()) return;
            isAnimating = true;
            rightPage.classList.remove("turning-back");
            rightPage.classList.add("turning-forward");
            setTimeout(() => {
                index = Math.min(index + 2, pages.length - 1);
                render();
            }, TURN_UPDATE_DELAY);
            setTimeout(() => {
                rightPage.classList.remove("turning-forward");
                isAnimating = false;
            }, TURN_RESET_DELAY);
        };

        const turnBackward = () => {
            if (isAnimating || index <= 0) return;
            isAnimating = true;
            rightPage.classList.remove("turning-forward");
            rightPage.classList.add("turning-back");
            setTimeout(() => {
                index = Math.max(index - 2, 0);
                render();
            }, TURN_UPDATE_DELAY);
            setTimeout(() => {
                rightPage.classList.remove("turning-back");
                isAnimating = false;
            }, TURN_RESET_DELAY);
        };

        prevBtn.addEventListener("click", turnBackward);
        nextBtn.addEventListener("click", turnForward);

        thumbs.forEach(button => {
            button.addEventListener("click", () => {
                if (isAnimating) return;
                const pageIndex = Number(button.dataset.pageIndex);
                if (Number.isNaN(pageIndex)) return;
                const spreadStart = Math.max(0, pageIndex - (pageIndex % 2));
                if (spreadStart === index) return;
                index = spreadStart;
                render();
            });
        });

        render();
    });
}

function initMenu() {
    const toggle = document.querySelector(".menu-toggle");
    const nav = document.querySelector(".site-header nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!expanded));
        toggle.classList.toggle("active");
        nav.classList.toggle("open");
    });

    nav.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            toggle.setAttribute("aria-expanded", "false");
            toggle.classList.remove("active");
            nav.classList.remove("open");
        });
    });
}
