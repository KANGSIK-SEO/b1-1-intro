// ===== 설정값 (README에도 명시) =====
const GITHUB_USER = "KANGSIK-SEO";
const NAV_SCROLL_THRESHOLD = 60;      // px: 이 이상 스크롤하면 네비게이션 배경 변경
const TOP_BTN_THRESHOLD = 300;        // px: 이 이상 스크롤하면 맨 위 버튼 표시
const OBSERVER_THRESHOLD = 0.2;       // Intersection Observer 임계값
const THEME_KEY = "theme";

// ===== 요소 선택 =====
const header = document.querySelector("#header");
const navMenu = document.querySelector("#nav-menu");
const hamburger = document.querySelector("#hamburger");
const themeToggle = document.querySelector("#theme-toggle");
const scrollTopBtn = document.querySelector("#scroll-top");

// ===== 1. 다크 모드: 이벤트 → theme 상태 → 화면 =====
const getSavedTheme = () => {
  try { return localStorage.getItem(THEME_KEY); } catch { return null; }
};
const saveTheme = (theme) => {
  try { localStorage.setItem(THEME_KEY, theme); } catch { /* 저장 불가 시 무시 */ }
};

const themeState = {
  // 저장값 → 없으면 시스템 설정(prefers-color-scheme) → 기본 light
  current: getSavedTheme()
    ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
};

const renderTheme = () => {
  const { current } = themeState;
  document.documentElement.dataset.theme = current;
  themeToggle.textContent = current === "dark" ? "☀️" : "🌙";
  themeToggle.setAttribute("aria-label", current === "dark" ? "라이트 모드 전환" : "다크 모드 전환");
};

themeToggle.addEventListener("click", () => {
  themeState.current = themeState.current === "dark" ? "light" : "dark";
  saveTheme(themeState.current);
  renderTheme();
});
renderTheme();

// ===== 2. 햄버거 메뉴 =====
hamburger.addEventListener("click", () => {
  const isOpen = navMenu.classList.toggle("active");
  hamburger.setAttribute("aria-expanded", String(isOpen));
  hamburger.textContent = isOpen ? "✕" : "☰";
});

// 메뉴 링크 클릭 시 닫기 (부드러운 스크롤은 CSS scroll-behavior + 아래 핸들러)
document.querySelectorAll(".nav-menu a").forEach((link) => {
  link.addEventListener("click", () => {
    navMenu.classList.remove("active");
    hamburger.setAttribute("aria-expanded", "false");
    hamburger.textContent = "☰";
  });
});

// 앵커 링크 부드러운 스크롤
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const target = document.querySelector(anchor.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth" });
  });
});

// ===== 3. 스크롤: 네비 배경 + 맨 위 버튼 =====
const onScroll = () => {
  const { scrollY } = window;
  header.classList.toggle("scrolled", scrollY > NAV_SCROLL_THRESHOLD);
  scrollTopBtn.classList.toggle("show", scrollY > TOP_BTN_THRESHOLD);
};
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

scrollTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ===== 4. 스크롤 애니메이션 (Intersection Observer) =====
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: OBSERVER_THRESHOLD }
);
document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));

// ===== 5. 타이핑 효과 (보너스) =====
const typingEl = document.querySelector("#typing");
const phrases = ["AI와 웹을 배우는 개발자", "미술 위작 검증 AI를 만듭니다", "양자컴퓨팅에도 관심이 많아요"];
let phraseIdx = 0;
let charIdx = 0;
let deleting = false;

const type = () => {
  const phrase = phrases[phraseIdx];
  charIdx += deleting ? -1 : 1;
  typingEl.textContent = phrase.slice(0, charIdx);

  let delay = deleting ? 40 : 90;
  if (!deleting && charIdx === phrase.length) {
    deleting = true;
    delay = 1500;
  } else if (deleting && charIdx === 0) {
    deleting = false;
    phraseIdx = (phraseIdx + 1) % phrases.length;
    delay = 400;
  }
  setTimeout(type, delay);
};
type();

// ===== 6. GitHub API: 이벤트 → projectsState → renderProjects =====
const statusEl = document.querySelector("#projects-status");
const gridEl = document.querySelector("#projects-grid");
const filtersEl = document.querySelector("#filters");

const projectsState = {
  status: "loading", // loading | success | error | empty
  repos: [],
  filter: "All",
  errorMessage: "",
};

const escapeHTML = (str = "") =>
  str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const createCard = ({ name, html_url, description, language, stargazers_count, updated_at }) => `
  <article class="card">
    <h3><a href="${html_url}" target="_blank" rel="noopener noreferrer">${escapeHTML(name)}</a></h3>
    <p>${escapeHTML(description ?? "설명이 없습니다.")}</p>
    <div class="card-meta">
      <span>${escapeHTML(language ?? "—")}</span>
      <span>⭐ ${stargazers_count}</span>
      <span>${new Date(updated_at).toLocaleDateString("ko-KR")}</span>
    </div>
  </article>`;

const renderFilters = () => {
  const { repos, filter } = projectsState;
  if (projectsState.status !== "success") {
    filtersEl.innerHTML = "";
    return;
  }
  const languages = ["All", ...new Set(repos.map((r) => r.language).filter(Boolean))];
  filtersEl.innerHTML = languages
    .map((lang) => `<button type="button" class="filter-btn ${lang === filter ? "active" : ""}" data-lang="${escapeHTML(lang)}">${escapeHTML(lang)}</button>`)
    .join("");
};

const renderProjects = () => {
  const { status, repos, filter, errorMessage } = projectsState;
  gridEl.innerHTML = "";
  statusEl.innerHTML = "";

  if (status === "loading") {
    statusEl.innerHTML = `<div class="spinner"></div><p>로딩 중...</p>`;
  } else if (status === "error") {
    statusEl.innerHTML = `
      <p>프로젝트를 불러올 수 없습니다.</p>
      <p>${escapeHTML(errorMessage)}</p>
      <button type="button" class="btn btn-primary" id="retry-btn">다시 시도</button>`;
  } else if (status === "empty") {
    statusEl.innerHTML = `<p>표시할 프로젝트가 없습니다.</p>`;
  } else {
    const visible = repos.filter((r) => filter === "All" || r.language === filter);
    gridEl.innerHTML = visible.map(createCard).join("");
  }
  renderFilters();
};

const loadProjects = async () => {
  projectsState.status = "loading";
  renderProjects();
  try {
    const response = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=30`
    );
    if (!response.ok) {
      throw new Error(
        response.status === 403
          ? "GitHub API 호출 한도(시간당 60회)를 초과했습니다. 잠시 후 다시 시도하세요."
          : `요청 실패 (HTTP ${response.status})`
      );
    }
    const data = await response.json();
    projectsState.repos = data.filter((repo) => !repo.fork);
    projectsState.filter = "All";
    projectsState.status = projectsState.repos.length ? "success" : "empty";
  } catch (error) {
    projectsState.errorMessage = error.message;
    projectsState.status = "error";
  }
  renderProjects();
};

// 이벤트 위임: 재시도 / 필터 버튼
statusEl.addEventListener("click", (event) => {
  if (event.target.closest("#retry-btn")) loadProjects();
});
filtersEl.addEventListener("click", (event) => {
  const btn = event.target.closest(".filter-btn");
  if (!btn) return;
  projectsState.filter = btn.dataset.lang;
  renderProjects();
});
loadProjects();

// ===== 7. 폼 검증: input/submit → 유효성 상태 → 에러 표시 =====
const form = document.querySelector("#contact-form");
const successEl = document.querySelector("#form-success");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validators = {
  name: (v) => (v.trim() ? "" : "이름을 입력해 주세요."),
  email: (v) => {
    if (!v.trim()) return "이메일을 입력해 주세요.";
    return EMAIL_REGEX.test(v) ? "" : "올바른 이메일 형식이 아닙니다.";
  },
  message: (v) => {
    if (!v.trim()) return "메시지를 입력해 주세요.";
    return v.trim().length >= 10 ? "" : "메시지는 10자 이상 입력해 주세요.";
  },
};

const formState = { errors: { name: "", email: "", message: "" } };

const renderFieldError = (field) => {
  const input = form.elements[field];
  const message = formState.errors[field];
  document.querySelector(`#${field}-error`).textContent = message;
  input.closest(".field").classList.toggle("invalid", Boolean(message));
  input.setAttribute("aria-invalid", String(Boolean(message)));
};

const validateField = (field) => {
  formState.errors[field] = validators[field](form.elements[field].value);
  renderFieldError(field);
  return !formState.errors[field];
};

Object.keys(validators).forEach((field) => {
  form.elements[field].addEventListener("input", () => {
    successEl.textContent = "";
    validateField(field);
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const results = Object.keys(validators).map(validateField);
  if (results.every(Boolean)) {
    const { name } = Object.fromEntries(new FormData(form));
    successEl.textContent = `${name}님, 메시지가 전송되었습니다! (데모: 실제 발송은 되지 않습니다)`;
    form.reset();
  } else {
    successEl.textContent = "";
    form.querySelector(".invalid input, .invalid textarea")?.focus();
  }
});
