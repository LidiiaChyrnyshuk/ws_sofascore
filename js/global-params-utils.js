export const DOMAIN_NOT_DEFINED = "DOMAIN_NOT_DEFINED";
export const UNDEFINED_ERROR = "UNDEFINED_ERROR";

// Глобальні параметри
export const getGlobalParams = () => {
	return (
		window.globalParams ||
		(typeof globalParams !== "undefined" && globalParams) ||
		null
	);
};

// Генерує посилання з урахуванням параметрів
export const createDomainLink = (path) => {
	const gp = getGlobalParams();
	const domain = gp?.DOMAIN;
	if (!domain) throw new Error(DOMAIN_NOT_DEFINED);

	const url = new URL(path, domain);
	if (gp?.TRACK) url.searchParams.set("track_id", gp.TRACK);
	if (gp?.PID) url.searchParams.set("pid", gp.PID);
	if (gp?.PARAM1) url.searchParams.set("param1", gp.PARAM1);
	if (gp?.PARAM2) url.searchParams.set("param2", gp.PARAM2);
	if (gp?.PARAM3) url.searchParams.set("param3", gp.PARAM3);
	if (gp?.PARAM4) url.searchParams.set("param4", gp.PARAM4);
	if (gp?.DL) {
		const redirect = "/" + gp.DL.replace(/^\/+/, "");
		url.searchParams.set("redirect", encodeURIComponent(redirect));
	}

	return url.toString();
};

export const createDomainLinkSafe = (path) => {
	try {
		return createDomainLink(path);
	} catch {
		return null;
	}
};

// API конфігурація
export const getApiConfiguration = async () => {
	const gp = getGlobalParams();
	const domain = gp?.DOMAIN;
	if (!domain) throw new Error(DOMAIN_NOT_DEFINED);

	const response = await fetch(
		new URL("/api/v1/configuration", domain).toString(),
		{
			method: "GET",
			headers: { "Content-Type": "application/json" },
		}
	);
	return await response.json();
};

// Auth конфігурація
export async function getAuthConfiguration() {
	const gp = getGlobalParams();
	const domain = gp && gp.DOMAIN;

	if (!domain) {
		throw ["DOMAIN_NOT_DEFINED"];
	}

	const url = new URL("/api/v1/configuration/auth", domain).toString();

	const response = await fetch(url, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		throw ["FAILED_TO_FETCH_AUTH_CONFIG"];
	}

	const config = await response.json();
	const captchaConfig = config.captchaConfiguration;

	if (captchaConfig && captchaConfig.providerName) {
		const validProviders = ["GOOGLE", "CLOUD_FLARE"];
		if (!validProviders.includes(captchaConfig.providerName)) {
			throw [new Error("INVALID_CAPTCHA_PROVIDER")];
		}
	}

	return config;
}

// Отримати посилання на редірект (TDS)
export const getRedirectLink = () => {
	const link = window.__REDIRECT_LINK;
	return typeof link === "string" && link.startsWith("http") ? link : null;
};

export const redirectToTDS = () => {
	const link = getRedirectLink();
	if (link) {
		window.location.href = link;
	}
};

// Надіслати запит на реєстрацію
export const sendRegistration = ({ email, password, captcha }) => {
	const gp = getGlobalParams();
	const domain = gp?.DOMAIN;
	if (!domain) return Promise.reject([DOMAIN_NOT_DEFINED]);

	const data = {
		email,
		password,
		language: gp?.LANG ?? "en",
		partnerId: gp?.PID ?? null,
		trackId: gp?.TRACK ?? null,
		param1: gp?.PARAM1 ?? null,
		param2: gp?.PARAM2 ?? null,
		param3: gp?.PARAM3 ?? null,
		param4: gp?.PARAM4 ?? null,
	};

	return new Promise((resolve, reject) => {
		fetch(
			new URL(
				`/api/v3/auth/register/partners?captcha-response=${captcha}`,
				domain
			).toString(),
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			}
		)
			.then((res) => res.json())
			.then((data) => {
				if (data.trueplayTokenName) {
					resolve({ token: data.trueplayTokenName, type: "trueplayTokenName" });
				} else if (data.playerToken) {
					resolve({ token: data.playerToken, type: "playerToken" });
				} else if (data.errors) {
					reject(data.errors);
				} else {
					reject([UNDEFINED_ERROR]);
				}
			})
			.catch(() => reject([new Error(UNDEFINED_ERROR)]));
	});
};

// Редірект до авторизації
export const redirectToAuth = ({ token, type }) => {
	const gp = getGlobalParams();
	const domain = gp?.DOMAIN;
	if (!domain) throw [new Error(DOMAIN_NOT_DEFINED)];

	let deeplink = gp?.DL ?? "/";
	deeplink = encodeURIComponent("/" + deeplink.replace(/^\/+/, ""));

	const url = new URL(
		`/api/v3/auth/partners-player-entry?${type}=${token}&deeplink=${deeplink}`,
		domain
	).toString();

	window.location.href = url;
};

// Реєстраційний процес з обробкою помилок і редіректом
export const registrationProcess = async ({ email, password, captcha }) => {
	const result = await sendRegistration({ email, password, captcha }).catch(
		(reason) => {
			const errors = Array.isArray(reason) ? reason : [];

			const redirectErrors = [
				"EMAIL_ALREADY_TAKEN",
				"PHONE_NUMBER_TAKEN",
				"COUNTRY_RESTRICTED",
				UNDEFINED_ERROR,
				DOMAIN_NOT_DEFINED,
			];

			if (
				!Array.isArray(reason) ||
				errors.some((err) => redirectErrors.includes(err))
			) {
				redirectToTDS();
			}

			throw reason;
		}
	);

	redirectToAuth(result);
};
