document.addEventListener("DOMContentLoaded", () => {
  const sharedPages = collectPageData(document.querySelector("[data-viewer-pages]"));

  initScrollReveal();
  initBookViewer(sharedPages);
});

function collectPageData(root) {
  if (!root) return [];
  return Array.from(root.querySelectorAll("span"))
    .map(span => ({
      src: span.dataset.src,
      alt: span.dataset.alt || ""
    }))
    .filter(page => page.src);
}

function initScrollReveal() {
  const targets = document.querySelectorAll("[data-animate]");
  if (!targets.length) return;

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    targets.forEach(target => observer.observe(target));
  } else {
    targets.forEach(target => target.classList.add("in-view"));
  }
}

function initBookViewer(sharedPages = []) {
  document.querySelectorAll(".book-viewer").forEach(section => {
    const pagesRoot = section.querySelector("[data-viewer-pages]");
    const leftImg = section.querySelector(".book-page-left img");
    const rightImg = section.querySelector(".book-page-right img");
    const rightPage = section.querySelector(".book-page-right");
    const prevBtn = section.querySelector(".book-nav.prev");
    const nextBtn = section.querySelector(".book-nav.next");
    const mobileGrid = section.querySelector("[data-mobile-grid]");
    if (!pagesRoot || !leftImg || !rightImg || !rightPage || !prevBtn || !nextBtn) return;

    const indicator = section.querySelector("[data-book-current]");
    const thumbsRoot = section.querySelector("[data-viewer-thumbs]");
    let thumbs = [];

    const pages = sharedPages.length ? sharedPages : collectPageData(pagesRoot);
    if (!pages.length) return;

    const mobileMedia = typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 900px)") : null;
    let mobileGridPopulated = false;

    const isWhiteImage = (img) => {
            return new Promise(resolve => {
                const check = () => {
                    try {
                        const canvas = document.createElement("canvas");
                        const size = 30;
                        canvas.width = size;
                        canvas.height = size;
                        const ctx = canvas.getContext("2d");
                        ctx.drawImage(img, 0, 0, size, size);
                        const data = ctx.getImageData(0, 0, size, size).data;
                        let whiteCount = 0;
                        const total = size * size;
                        for (let i = 0; i < data.length; i += 4) {
                            if (data[i] > 235 && data[i + 1] > 235 && data[i + 2] > 235) {
                                whiteCount++;
                            }
                        }
                        resolve(whiteCount / total > 0.88);
                    } catch (e) {
                        resolve(false);
                    }
                };
                if (img.complete && img.naturalWidth > 0) {
                    check();
                } else {
                    img.onload = check;
                    img.onerror = () => resolve(false);
                }
            });
        };

        let mobileTotal = 0;
        let mobileLoaded = 0;
        let progressEl = null;

        const updateProgress = () => {
            if (!progressEl) return;
            progressEl.textContent = mobileLoaded + " / " + mobileTotal;
            if (mobileLoaded >= mobileTotal) {
                setTimeout(() => { if (progressEl) progressEl.style.opacity = "0"; }, 1200);
            }
        };

        const populateMobileGrid = () => {
            if (!mobileGrid || mobileGridPopulated) return;
            mobileGridPopulated = true;

            progressEl = document.createElement("div");
            progressEl.className = "mobile-progress";
            document.body.appendChild(progressEl);

            const mobileObserver = new IntersectionObserver(
                entries => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add("mobile-visible");
                            mobileObserver.unobserve(entry.target);
                        }
                    });
                },
                { threshold: 0.05, rootMargin: "200px" }
            );

            mobileTotal = pages.length - 2;
            updateProgress();

            pages.slice(2).forEach(page => {
                const wrapper = document.createElement("div");
                wrapper.style.cssText = "width:100%;overflow:hidden;";
                const img = document.createElement("img");
                img.alt = page.alt;
                img.loading = "lazy";
                img.decoding = "async";
                img.style.cssText = "width:100%;display:block;max-width:100vw;";
                img.src = page.src;
                wrapper.appendChild(img);
                mobileGrid.appendChild(wrapper);

                isWhiteImage(img).then(isWhite => {
                    if (isWhite) {
                        wrapper.remove();
                        mobileTotal--;
                    } else {
                        mobileObserver.observe(img);
                    }
                    mobileLoaded++;
                    updateProgress();
                });
            });
        };

    const handleMobileChange = event => {
      if (event.matches) {
        populateMobileGrid();
      }
    };

    if (!mobileMedia) {
      populateMobileGrid();
    } else if (mobileMedia.matches) {
      populateMobileGrid();
    }

    if (mobileGrid && mobileMedia) {
      if (typeof mobileMedia.addEventListener === "function") {
        mobileMedia.addEventListener("change", handleMobileChange);
      } else if (typeof mobileMedia.addListener === "function") {
        mobileMedia.addListener(handleMobileChange);
      }
    }

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
