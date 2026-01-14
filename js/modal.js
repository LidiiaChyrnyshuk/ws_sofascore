import {
	getApiConfiguration,
	redirectToTDS,
	registrationProcess,
} from "./global-params-utils.js";

let notyf;
let startY = 0;

const refs = {
	openBtns: document.querySelectorAll("[data-modal-open]"),
	closeBtn: document.querySelector("[data-modal-close]"),
	backdrop: document.querySelector("[data-modal]"),
	form: document.getElementById("registrationForm"),
	email: document.querySelector("input[name='email']"),
	password: document.querySelector("input[name='password']"),
	checkbox: document.querySelector("input[name='terms']"),
	submitBtn: document.getElementById("submitBtn"),
	passwordInput: document.querySelector(".modal-input.password"),
	toggleBtn: document.querySelector(".toggle-password"),
	hintBox: document.getElementById("passwordHint"),
	hintItems: {
		length: document.querySelector('[data-check="length"] img'),
		uppercase: document.querySelector('[data-check="uppercase"] img'),
		digit: document.querySelector('[data-check="digit"] img'),
	},
	errorText: document.querySelector(".error-text"),
	captchaContainer: document.getElementById("captcha-container"),
};

// Валідації форми
function validateForm() {
	const emailValue = refs.email.value.trim();
	const passwordValue = refs.password.value.trim();

	const emailValid = emailValue !== "" && validateEmail(emailValue);
	const passValid = passwordValue !== "" && validatePasswordRaw(passwordValue);
	const isChecked = refs.checkbox.checked;

	const allValid = emailValid && passValid && isChecked;

	refs.submitBtn.disabled = !allValid;
	refs.submitBtn.classList.toggle("disabled", !allValid);
}

function validateEmail(value) {
	const emailRegex = /^[\p{L}0-9._%+-]+@[\p{L}0-9.-]+\.[\p{L}]{2,}$/u;
	return emailRegex.test(value);
}

function validateEmailOnBlur() {
	const email = refs.email.value.trim();
	const regex = /^[\p{L}0-9._%+-]+@[\p{L}0-9.-]+\.[\p{L}]{2,}$/u;
	if (email === "") {
		refs.email.classList.remove("error");
		refs.errorText.style.display = "none";
		return false;
	}
	const isValid = regex.test(email);
	refs.email.classList.toggle("error", !isValid);
	refs.errorText.style.display = isValid ? "none" : "block";
	return isValid;
}

function validateEmailOnInput() {
	const email = refs.email.value.trim();
	const regex = /^[\p{L}0-9._%+-]+@[\p{L}0-9.-]+\.[\p{L}]{2,}$/u;
	if (email === "" || regex.test(email)) {
		refs.email.classList.remove("error");
		refs.errorText.style.display = "none";
	}
}

function validatePasswordRaw(value) {
	return value.length >= 6 && /[A-ZА-Я]/.test(value) && /\d/.test(value);
}

function setupPasswordValidation() {
	const ICON_VALID = "images/form/status-successfull.svg";
	const ICON_ERROR = "images/form/status_error.svg";

	refs.passwordInput.addEventListener("input", () => {
		const value = refs.passwordInput.value;
		const hasLength = value.length >= 6;
		const hasUpper = /[A-ZА-Я]/.test(value);
		const hasDigit = /\d/.test(value);

		refs.hintItems.length.src = hasLength ? ICON_VALID : ICON_ERROR;
		refs.hintItems.uppercase.src = hasUpper ? ICON_VALID : ICON_ERROR;
		refs.hintItems.digit.src = hasDigit ? ICON_VALID : ICON_ERROR;

		refs.hintBox.classList.toggle(
			"active",
			!(hasLength && hasUpper && hasDigit)
		);
		validateForm();
	});

	refs.passwordInput.addEventListener("focus", () => {
		const value = refs.passwordInput.value;
		if (!validatePasswordRaw(value)) {
			refs.hintBox.classList.add("active");
		}
	});
	refs.passwordInput.addEventListener("blur", () => {
		refs.hintBox.classList.remove("active");
	});

	refs.toggleBtn.addEventListener("click", () => {
		const isVisible = refs.passwordInput.type === "text";
		refs.passwordInput.type = isVisible ? "password" : "text";
		refs.toggleBtn.querySelector("img").src = isVisible
			? "images/form/eye-closed.svg"
			: "images/form/eye-open.svg";
	});
}

function clearForm() {
	refs.email.value = "";
	refs.password.value = "";
	refs.checkbox.checked = false;
	refs.submitBtn.disabled = true;
	refs.submitBtn.classList.add("disabled");

	Object.values(refs.hintItems).forEach((img) => {
		if (img) img.src = "images/form/status_error.svg";
	});

	if (refs.passwordInput && refs.passwordInput.type === "text") {
		refs.passwordInput.type = "password";
		const icon = refs.toggleBtn.querySelector("img");
		if (icon) icon.src = "images/form/eye-closed.svg";
	}

	refs.hintBox?.classList.remove("active");
	refs.email.classList.remove("error");
	if (refs.errorText) refs.errorText.style.display = "none";
}

// функції відкриття і закриття модального вікна
 export function openModal() {
	refs.backdrop.classList.remove("is-hidden");
	document.body.style.overflow = "hidden";
	window.history.pushState({ modalOpen: true }, "");
	validateForm();
}

function closeModal() {
	refs.backdrop.classList.add("is-hidden");
	document.body.style.overflow = "";
	clearForm();
	if (window.history.state?.modalOpen) window.history.back();
}

function handleEscClose(event) {
	if (event.key === "Escape" || event.target === refs.backdrop) closeModal();
}

function onTouchStart(e) {
	startY = e.touches[0].clientY;
}

function onTouchMove(e) {
	if (e.touches[0].clientY - startY > 100) closeModal();
}

// Парсить конфігурацію, шукає siteKey і providerName
function getCaptchaSettings(config) {
	const siteKey =
		config?.captchaConfiguration?.siteKey ||
		config?.captchaSettings?.siteKey ||
		config?.captchaSiteKey ||
		config?.siteKey ||
		null;

	const rawProvider =
		config?.captchaConfiguration?.providerName ||
		config?.captchaSettings?.providerName ||
		null;

	const providerName = rawProvider ? rawProvider.toUpperCase() : null;

	const validProviders = ["GOOGLE", "CLOUD_FLARE"];
	if (!validProviders.includes(providerName)) {
		throw new Error("Invalid CAPTCHA provider");
	}

	return { siteKey, providerName };
}

function renderTurnstile(siteKey) {
	refs.captchaContainer.innerHTML = `
    <div
      id="turnstile-widget"
      class="cf-turnstile"
      data-sitekey="${siteKey}"
      data-theme="light"
      data-size="invisible"
      data-action="register"
    ></div>
  `;
}

// Завантаження скрипта Google reCAPTCHA v2 invisible
async function loadRecaptchaV2InvisibleScript(lang = "en") {
	return new Promise((resolve, reject) => {
		if (window.grecaptcha?.render) return resolve();

		const script = document.createElement("script");
		script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoaded&render=explicit&hl=${lang}`;
		script.async = true;
		script.defer = true;
		script.onerror = () => reject(new Error("Failed to load reCAPTCHA"));
		document.head.appendChild(script);

		window.onRecaptchaLoaded = () => {
			if (window.grecaptcha?.render) resolve();
			else reject(new Error("reCAPTCHA render not available"));
		};
	});
}

let recaptchaWidgetId = null;
let recaptchaTokenResolver = null;

// Рендер невидимого капчі v2
function renderRecaptchaV2Invisible(siteKey) {
	if (!refs.captchaContainer.querySelector("#recaptcha-widget")) {
		refs.captchaContainer.innerHTML = `<div id="recaptcha-widget" class="g-recaptcha"></div>`;
	}
	recaptchaWidgetId = window.grecaptcha.render("recaptcha-widget", {
		sitekey: siteKey,
		size: "invisible",
		badge: "inline",
		callback: onRecaptchaSuccess,
		"error-callback": onRecaptchaError,
	});
	console.log("Recaptcha rendered with widgetId:", recaptchaWidgetId);
}

// Обробник успішного проходження капчі
function onRecaptchaSuccess(token) {
	if (recaptchaTokenResolver) {
		recaptchaTokenResolver(token);
		recaptchaTokenResolver = null;
	}
}

// Обробник помилки капчі
function onRecaptchaError() {
	notyf.error("Captcha verification failed. Please try again.");
	if (recaptchaTokenResolver) {
		recaptchaTokenResolver(null);
		recaptchaTokenResolver = null;
	}
}

// Підвантаження Cloudflare Turnstile
async function loadTurnstileScript() {
	return new Promise((resolve, reject) => {
		if (window.turnstile) return resolve();

		const existingScript = document.querySelector(
			'script[src*="challenges.cloudflare.com/turnstile"]'
		);
		if (existingScript) {
			const interval = setInterval(() => {
				if (window.turnstile) {
					clearInterval(interval);
					resolve();
				}
			}, 100);
			setTimeout(() => {
				clearInterval(interval);
				reject(new Error("Timeout loading Turnstile"));
			}, 10000);
			return;
		}

		const script = document.createElement("script");
		script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
		script.async = true;
		script.defer = true;
		script.onload = () => {
			const interval = setInterval(() => {
				if (window.turnstile) {
					clearInterval(interval);
					resolve();
				}
			}, 100);
			setTimeout(() => {
				clearInterval(interval);
				reject(new Error("Timeout loading Turnstile"));
			}, 10000);
		};
		script.onerror = () => reject(new Error("Failed to load Turnstile"));
		document.head.appendChild(script);
	});
}

// Ініціалізація капчі (завантаження скрипта)
let captchaReady = false;
let captchaProvider = null;
let captchaSiteKey = null;

async function loadCaptchaScript(siteKey, providerName, lang = "en") {
	if (providerName === "GOOGLE") {
		await loadRecaptchaV2InvisibleScript(lang);
		renderRecaptchaV2Invisible(siteKey);
	} else if (providerName === "CLOUD_FLARE") {
		await loadTurnstileScript();
	} else {
		throw new Error("Unsupported captcha provider");
	}
	captchaReady = true;
	captchaProvider = providerName;
	captchaSiteKey = siteKey;
}

// Отримання токена через ручний виклик капчі (v2 invisible)
async function getRecaptchaToken() {
	if (!window.grecaptcha || recaptchaWidgetId === null) {
		console.warn("Attempted to call reCAPTCHA before it's ready");
		throw new Error("reCAPTCHA not loaded");
	}
	const TIMEOUT = 10000;

	return new Promise((resolve, reject) => {
		let timeoutId = setTimeout(() => {
			reject(new Error("reCAPTCHA timeout"));
		}, TIMEOUT);

		recaptchaTokenResolver = (token) => {
			clearTimeout(timeoutId);
			if (!token) {
				reject(new Error("Empty reCAPTCHA token"));
			} else {
				resolve(token);
			}
		};

		try {
			console.log("Executing grecaptcha");
			window.grecaptcha.execute(recaptchaWidgetId);
		} catch (err) {
			clearTimeout(timeoutId);
			reject(err);
		}
	});
}

// Отримання токена Turnstile
async function getTurnstileToken(action = "register") {
	if (!window.turnstile || !captchaSiteKey) {
		throw new Error("Turnstile not loaded");
	}

	return new Promise((resolve, reject) => {
		window.turnstile
			.execute(captchaSiteKey, { action })
			.then((token) => {
				if (!token) reject(new Error("Turnstile token not received."));
				else resolve(token);
			})
			.catch(() => reject(new Error("Error retrieving Turnstile token.")));
	});
}

export async function initCaptcha() {
	try {
		const lang = (navigator.language.split("-")[0] || "en").toLowerCase();
		const config = await getApiConfiguration();
		const { siteKey, providerName } = getCaptchaSettings(config);

		if (!siteKey || !providerName) {
			throw new Error("Captcha siteKey or providerName missing");
		}

		await loadCaptchaScript(siteKey, providerName, lang);

		if (providerName === "CLOUD_FLARE") {
			renderTurnstile(siteKey);
		}
	} catch (err) {
		notyf.error("Captcha init failed");
		console.error("Captcha init failed:", err);
		redirectToTDS();
	}
}

let currentCaptchaToken = null;
let captchaTokenTimeout = null;

// Оновлення токена капчі з дебаунсом
async function refreshCaptchaToken() {
	if (!captchaReady) return;

	if (currentCaptchaToken) return currentCaptchaToken;

	try {
		if (captchaProvider === "GOOGLE") {
			currentCaptchaToken = await getRecaptchaToken();
		} else if (captchaProvider === "CLOUD_FLARE") {
			currentCaptchaToken = await getTurnstileToken();
		} else {
			throw new Error("Unsupported captcha provider");
		}

		// Токен валідний близько 2 хвилин
		captchaTokenTimeout = setTimeout(() => {
			currentCaptchaToken = null;
		}, 90 * 1000);

		return currentCaptchaToken;
	} catch (err) {
		console.error("Failed to refresh captcha token:", err);
		currentCaptchaToken = null;
	}
}

// Обробник сабміту форми
async function submitForm(e) {
	e.preventDefault();

	if (refs.submitBtn.disabled) return;

	if (!captchaReady) {
		notyf.error("Captcha is not ready yet, please wait.");
		return;
	}

	const email = refs.email.value.trim();
	const password = refs.password.value.trim();

	if (!email || !password) {
		notyf.error("Please fill in all fields.");
		return;
	}

	refs.submitBtn.disabled = true;

	try {
		const captchaToken = await refreshCaptchaToken();

		if (
			!captchaToken ||
			typeof captchaToken !== "string" ||
			captchaToken.length < 10
		) {
			notyf.error("Captcha verification failed. Please try again.");
			refs.submitBtn.disabled = false;
			return;
		}

		await registrationProcess({
			email,
			password,
			captcha: captchaToken,
		});

		currentCaptchaToken = null;
		clearTimeout(captchaTokenTimeout);
		captchaTokenTimeout = null;
	} catch (error) {
		console.error("Registration error:", error);
		const msg =
			Array.isArray(error) && error.length
				? error[0]
				: typeof error === "string"
				? error
				: error?.message || "Something went wrong.";
		notyf.error(msg);
	} finally {
		refs.submitBtn.disabled = false;
	}
}

function setupEvents() {
	refs.openBtns.forEach((btn) => btn.addEventListener("click", openModal));
	refs.closeBtn.addEventListener("click", closeModal);
	document.addEventListener("keydown", handleEscClose);
	document.addEventListener("click", handleEscClose);
	refs.email.addEventListener("blur", validateEmailOnBlur);
	refs.email.addEventListener("input", validateEmailOnInput);
	refs.password.addEventListener("input", validateForm);
	refs.checkbox.addEventListener("change", validateForm);
	refs.form.addEventListener("touchstart", onTouchStart);
	refs.form.addEventListener("touchmove", onTouchMove);
	refs.form.addEventListener("submit", submitForm);
	window.addEventListener("popstate", () => {
		if (!refs.backdrop.classList.contains("is-hidden")) closeModal();
	});
}

async function main() {
	notyf = new Notyf({ duration: 2000, position: { x: "center", y: "top" } });
	setupEvents();
	setupPasswordValidation();
	try {
		await initCaptcha();
	} catch (error) {
		notyf.error("Captcha initialization failed. Please reload the page.");
	}
}

document.addEventListener("DOMContentLoaded", main);
