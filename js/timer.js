import { openModal } from "./modal.js";

document.addEventListener("DOMContentLoaded", () => {
	function addZero(num, digits = 2) {
		return num.toString().padStart(digits, "0");
	}

	const minutesEl = document.getElementById("minutes");
	const secondsEl = document.getElementById("seconds");
	const hundredthsEl = document.getElementById("hundredths");

	// Встановлюємо час завершення: зараз + 10 хв
	const endTime = Date.now() + 10 * 60 * 1000;

	const interval = setInterval(() => {
		const now = Date.now();
		const timeLeft = endTime - now;

		if (timeLeft <= 0) {
			clearInterval(interval);
			minutesEl.textContent = "00";
			secondsEl.textContent = "00";
			hundredthsEl.textContent = "00";
			openModal();
			return;
		}

		const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
		const seconds = Math.floor((timeLeft / 1000) % 60);
		const hundredths = Math.floor((timeLeft % 1000) / 10);

		minutesEl.textContent = addZero(minutes);
		secondsEl.textContent = addZero(seconds);
		hundredthsEl.textContent = addZero(hundredths);
	}, 33); 
});
