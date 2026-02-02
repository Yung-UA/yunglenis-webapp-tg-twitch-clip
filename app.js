// ========================================
// КОНФІГУРАЦІЯ
// ========================================

// ВАЖЛИВО: Вставте сюди URL вашого N8N webhook
const N8N_WEBHOOK_URL = 'https://n8n.yunglenis.com/webhook/9c5e7b3d-fe10-4f9d-afd9-bc88bc8317df';

// ========================================
// ІНІЦІАЛІЗАЦІЯ TELEGRAM WEB APP
// ========================================

// Отримуємо об'єкт Telegram Web App
const tg = window.Telegram.WebApp;

// Розгортаємо додаток на весь екран
tg.expand();

// Встановлюємо кольори теми
tg.setHeaderColor('#1a1a2e');
tg.setBackgroundColor('#1a1a2e');

// ========================================
// ОТРИМАННЯ ЕЛЕМЕНТІВ ФОРМИ
// ========================================

const form = document.getElementById('clipForm');
const clipUrlInput = document.getElementById('clipUrl');
const descriptionInput = document.getElementById('description');
const twitchUsernameInput = document.getElementById('twitchUsername');

const clipUrlError = document.getElementById('clipUrlError');
const descriptionError = document.getElementById('descriptionError');
const twitchUsernameError = document.getElementById('twitchUsernameError');

const charCount = document.getElementById('charCount');
const loadingIndicator = document.getElementById('loadingIndicator');
const statusMessage = document.getElementById('statusMessage');
const submitButton = document.getElementById('submitButton');

// ========================================
// ПАРСИНГ TWITCH URL
// ========================================

// Глобальна змінна для збереження нікнейму стрімера
let extractedStreamerName = null;

// Функція для парсингу Twitch URL та витягування інформації
function parseTwitchUrl(url) {
    try {
        const urlObj = new URL(url.trim());
        const hostname = urlObj.hostname.toLowerCase();
        const pathname = urlObj.pathname;

        // Перевіряємо чи це Twitch домен
        if (!hostname.includes('twitch.tv')) {
            return {
                isValid: false,
                streamerName: null,
                clipSlug: null,
                error: 'Тільки посилання з Twitch дозволені'
            };
        }

        // Варіант 1: twitch.tv/username/clip/SlugHere
        const clipPattern1 = /^\/([^\/]+)\/clip\/([^\/]+)/;
        const match1 = pathname.match(clipPattern1);
        if (match1) {
            return {
                isValid: true,
                streamerName: match1[1],
                clipSlug: match1[2],
                error: ''
            };
        }

        // Варіант 2: clips.twitch.tv/SlugHere
        if (hostname === 'clips.twitch.tv') {
            const clipSlug = pathname.replace('/', '');
            if (clipSlug) {
                return {
                    isValid: true,
                    streamerName: null, // Не можемо витягти з clips.twitch.tv URL
                    clipSlug: clipSlug,
                    error: ''
                };
            }
        }

        // Варіант 3: twitch.tv/clip/SlugHere
        const clipPattern2 = /^\/clip\/([^\/]+)/;
        const match2 = pathname.match(clipPattern2);
        if (match2) {
            return {
                isValid: true,
                streamerName: null,
                clipSlug: match2[1],
                error: ''
            };
        }

        return {
            isValid: false,
            streamerName: null,
            clipSlug: null,
            error: 'Невірний формат Twitch кліпу. Приклад: https://www.twitch.tv/username/clip/SlugHere'
        };

    } catch (e) {
        return {
            isValid: false,
            streamerName: null,
            clipSlug: null,
            error: 'Невірний формат URL'
        };
    }
}

// ========================================
// ВАЛІДАЦІЯ
// ========================================

// Функція для автоматичного витягування URL з тексту
function extractUrlFromText(text) {
    // Шукаємо URL в тексті (може бути з текстом перед ним)
    const urlPattern = /(https?:\/\/[^\s]+)/;
    const match = text.match(urlPattern);

    if (match) {
        return match[1].trim();
    }

    return text.trim();
}

// Функція для валідації URL
function validateUrl(url) {
    if (!url.trim()) {
        return { valid: false, error: 'Поле обов\'язкове для заповнення' };
    }

    // Автоматично витягуємо URL якщо є зайвий текст
    const cleanUrl = extractUrlFromText(url);

    // Якщо URL відрізняється від введеного тексту, оновлюємо поле
    if (cleanUrl !== url) {
        clipUrlInput.value = cleanUrl;
    }

    // Парсимо Twitch URL
    const parsedUrl = parseTwitchUrl(cleanUrl);

    if (!parsedUrl.isValid) {
        return { valid: false, error: parsedUrl.error };
    }

    // Зберігаємо нікнейм стрімера якщо знайдено
    extractedStreamerName = parsedUrl.streamerName;

    // Показуємо повідомлення якщо знайшли нікнейм
    if (extractedStreamerName) {
        return {
            valid: true,
            error: '',
            info: `✓ Знайдено стрімера: ${extractedStreamerName}`
        };
    }

    return { valid: true, error: '' };
}

// Функція для валідації опису
function validateDescription(description) {
    const length = description.trim().length;

    // Поле необов'язкове - якщо пусте, валідація проходить
    if (length === 0) {
        return { valid: true, error: '' };
    }

    // Якщо заповнено, то мінімум 10 символів
    if (length < 10) {
        return { valid: false, error: `Мінімум 10 символів (зараз ${length})` };
    }

    if (length > 500) {
        return { valid: false, error: `Максимум 500 символів (зараз ${length})` };
    }

    return { valid: true, error: '' };
}

// Функція для валідації Twitch нікнейму (опціонально)
function validateTwitchUsername(username) {
    // Якщо поле пусте, валідація проходить (поле необов'язкове)
    if (!username.trim()) {
        return { valid: true, error: '' };
    }

    const length = username.trim().length;

    if (length < 4) {
        return { valid: false, error: 'Мінімум 4 символи' };
    }

    if (length > 25) {
        return { valid: false, error: 'Максимум 25 символів' };
    }

    // Перевірка формату: тільки літери, цифри та підкреслення
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
        return { valid: false, error: 'Тільки літери (a-z), цифри та "_"' };
    }

    return { valid: true, error: '' };
}

// Функція для валідації всієї форми
function validateForm() {
    const urlValidation = validateUrl(clipUrlInput.value);
    const descriptionValidation = validateDescription(descriptionInput.value);
    const twitchValidation = validateTwitchUsername(twitchUsernameInput.value);

    // Оновлюємо UI для URL
    updateFieldValidation(clipUrlInput, clipUrlError, urlValidation);

    // Оновлюємо UI для опису
    updateFieldValidation(descriptionInput, descriptionError, descriptionValidation);

    // Оновлюємо UI для Twitch нікнейму
    updateFieldValidation(twitchUsernameInput, twitchUsernameError, twitchValidation);

    // Форма валідна тільки якщо всі поля валідні
    const isValid = urlValidation.valid && descriptionValidation.valid && twitchValidation.valid;

    // Оновлюємо стан MainButton
    updateMainButton(isValid);

    return isValid;
}

// Функція для оновлення UI валідації поля
function updateFieldValidation(input, errorElement, validation) {
    if (validation.valid) {
        input.classList.remove('invalid');
        input.classList.add('valid');

        // Показуємо інформаційне повідомлення якщо є
        if (validation.info) {
            errorElement.textContent = validation.info;
            errorElement.style.color = '#06ffa5'; // Зелений колір для успіху
        } else {
            errorElement.textContent = '';
            errorElement.style.color = ''; // Скидаємо колір
        }
    } else {
        input.classList.remove('valid');
        errorElement.style.color = ''; // Скидаємо колір
        if (validation.error) {
            input.classList.add('invalid');
            errorElement.textContent = validation.error;
        }
    }
}

// ========================================
// TELEGRAM MAIN BUTTON
// ========================================

// Перевіряємо чи запущено в Telegram
const isInTelegram = tg.initData !== '';

// Налаштовуємо головну кнопку Telegram
if (isInTelegram) {
    tg.MainButton.text = 'Надіслати кліп';
    tg.MainButton.color = '#7b2cbf';
    tg.MainButton.onClick(handleSubmit);

    // Ховаємо звичайну кнопку
    submitButton.classList.add('hidden');
}

// Функція для оновлення стану кнопок
function updateMainButton(isValid) {
    if (isInTelegram) {
        // В Telegram використовуємо MainButton
        if (isValid) {
            tg.MainButton.show();
            tg.MainButton.enable();
        } else {
            tg.MainButton.hide();
        }
    } else {
        // Локально використовуємо звичайну кнопку
        submitButton.disabled = !isValid;
    }
}

// ========================================
// ОБРОБКА ВІДПРАВКИ ФОРМИ
// ========================================

async function handleSubmit() {
    // Перевіряємо форму перед відправкою
    if (!validateForm()) {
        tg.HapticFeedback.notificationOccurred('error');
        return;
    }

    // Вібрація при натисканні
    tg.HapticFeedback.impactOccurred('medium');

    // Показуємо індикатор завантаження
    loadingIndicator.classList.add('active');

    if (isInTelegram) {
        tg.MainButton.showProgress();
        tg.MainButton.disable();
    } else {
        submitButton.disabled = true;
        submitButton.textContent = 'Надсилаю...';
    }

    // Отримуємо дані користувача Telegram
    const tgUser = tg.initDataUnsafe?.user || {};

    // Збираємо дані з форми
    const formData = {
        clip_url: clipUrlInput.value.trim(),
        description: descriptionInput.value.trim(),
        twitch_username: twitchUsernameInput.value.trim() || null,
        streamer_name: extractedStreamerName, // Автоматично витягнутий нікнейм стрімера
        telegram_user: {
            id: tgUser.id || null,
            username: tgUser.username || null,
            first_name: tgUser.first_name || null,
            last_name: tgUser.last_name || null,
            language_code: tgUser.language_code || null
        },
        init_data: tg.initData || null, // Для верифікації на сервері
        timestamp: new Date().toISOString()
    };

    console.log('📤 Відправка даних:', JSON.stringify(formData, null, 2));

    try {
        // Відправляємо дані на N8N webhook
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Успіх!
        tg.HapticFeedback.notificationOccurred('success');

        // Показуємо повідомлення про успіх (випадкове з масиву)
        const message = successMessages[successMessageIndex % successMessages.length];
        showToast(message, 'success');
        successMessageIndex++;

        // Скидаємо форму після успіху (не закриваємо додаток!)
        setTimeout(() => {
            form.reset();
            extractedStreamerName = null;
            updateCharCounter();
            validateForm();
            loadingIndicator.classList.remove('active');

            // Приховуємо клавіатуру на мобільних
            if (document.activeElement) {
                document.activeElement.blur();
            }

            if (isInTelegram) {
                tg.MainButton.hideProgress();
            } else {
                submitButton.textContent = 'Надіслати кліп';
            }

            // Ховаємо повідомлення про успіх через 3 секунди
            setTimeout(() => {
                statusMessage.className = 'status-message';
            }, 3000);
        }, 1500);

    } catch (error) {
        console.error('Помилка відправки:', error);

        // Вібрація при помилці
        tg.HapticFeedback.notificationOccurred('error');

        // Показуємо повідомлення про помилку
        showStatusMessage('Помилка при відправці. Спробуйте ще раз.', 'error');

        // Ховаємо індикатор завантаження
        loadingIndicator.classList.remove('active');

        if (isInTelegram) {
            tg.MainButton.hideProgress();
            tg.MainButton.enable();
        } else {
            submitButton.disabled = false;
            submitButton.textContent = 'Надіслати кліп';
        }
    }
}

// Функція для показу повідомлення про статус
function showStatusMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;

    // Автоматично ховаємо повідомлення через 5 секунд
    setTimeout(() => {
        statusMessage.className = 'status-message';
    }, 5000);
}

// Функція для показу легких toast повідомлень
function showToast(message, type = 'error') {
    // Створюємо toast елемент
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.textContent = message;

    // Додаємо до body
    document.body.appendChild(toast);

    // Анімація появи
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Автоматично прибираємо через 4 секунди
    setTimeout(() => {
        toast.classList.remove('show');

        // Видаляємо з DOM після анімації зникнення
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// ========================================
// ЛІЧИЛЬНИК СИМВОЛІВ ДЛЯ ОПИСУ
// ========================================

function updateCharCounter() {
    const count = descriptionInput.value.length;
    charCount.textContent = count;

    // Змінюємо колір коли досягнуто максимуму
    if (count >= 500) {
        charCount.style.color = '#ff006e';
    } else if (count >= 450) {
        charCount.style.color = '#ffbe0b';
    } else {
        charCount.style.color = '#9d4edd';
    }
}

// ========================================
// СЛУХАЧІ ПОДІЙ
// ========================================

// Валідація при введенні тексту
clipUrlInput.addEventListener('input', () => {
    validateForm();
});

clipUrlInput.addEventListener('blur', () => {
    validateForm();
});

descriptionInput.addEventListener('input', () => {
    updateCharCounter();
    validateForm();
});

descriptionInput.addEventListener('blur', () => {
    validateForm();
});

twitchUsernameInput.addEventListener('input', () => {
    validateForm();
});

twitchUsernameInput.addEventListener('blur', () => {
    validateForm();
});

// Запобігаємо стандартній поведінці форми
form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubmit();
});

// ========================================
// ЛОГОТИП
// ========================================

// Обробка помилки завантаження логотипу
const logo = document.getElementById('logo');

// Масив логотипів для циклічної зміни
const logoImages = ['logo.png', 'logo1.png', 'logo2.png'];
let currentLogoIndex = 0;

if (logo) {
    logo.addEventListener('error', function() {
        // Якщо логотип не знайдено, ховаємо контейнер
        const logoContainer = this.parentElement;
        if (logoContainer) {
            logoContainer.style.display = 'none';
        }
    });

    // Циклічна зміна логотипів при кліку
    logo.addEventListener('click', function() {
        // Анімація
        this.style.animation = 'none';
        setTimeout(() => {
            this.style.animation = 'logoEntrance 0.6s ease-out';
        }, 10);

        // Вібрація
        tg.HapticFeedback.impactOccurred('light');

        // Змінюємо логотип по циклу
        currentLogoIndex = (currentLogoIndex + 1) % logoImages.length;
        this.src = logoImages[currentLogoIndex];
    });
}

// ========================================
// РОЖЕВИЙ СКВАД - МЕМНА АНІМАЦІЯ
// ========================================

const squadBadge = document.getElementById('squadBadge');
const memeMessages = [
    'Хулі ти клікаєш? 😤',
    'Воно не кляцається! 🙄',
    'Та не тикай вже! 😡',
    'Серйозно? 🤦',
    'Припини це бака! 😠',
    'Я ж казав - НЕ КЛЯЦАЄТЬСЯ! 💢'
];
let memeClickCount = 0;

// Масив повідомлень про успіх
const successMessages = [
    '✨ Кліп додано! Можеш ще! 💗',
    '🔥 Топчик! Давай ще один! 💜',
    '⭐ Красава! Не зупиняйся! ✨',
    '💯 Жарко! Ще будуть? 🎬',
    '🎉 Прийнято! Чат оцінить! 💗',
    '🚀 Летить! Додавай ще! 💜'
];
let successMessageIndex = 0;

if (squadBadge) {
    squadBadge.addEventListener('click', function() {
        // Вібрація
        tg.HapticFeedback.impactOccurred('medium');

        // Shake анімація через клас (уникає конфліктів)
        this.classList.remove('shake-once');
        // Force reflow
        void this.offsetWidth;
        this.classList.add('shake-once');

        // Показуємо мемне повідомлення
        const message = memeMessages[memeClickCount % memeMessages.length];
        showToast(message);

        memeClickCount++;
    });

    // Видаляємо клас після завершення анімації
    squadBadge.addEventListener('animationend', function(e) {
        if (e.animationName === 'shake') {
            this.classList.remove('shake-once');
        }
    });
}

// ========================================
// ТЕМНИЙ РЕЖИМ - ЛАМПОЧКА
// ========================================

const lightBulb = document.getElementById('lightBulb');
let isDarkMode = false;
let darkModeTimeout = null;

if (lightBulb) {
    lightBulb.addEventListener('click', function() {
        // Якщо вже в темному режимі, ігноруємо клік
        if (isDarkMode) return;

        // Вмикаємо темний режим
        isDarkMode = true;

        // Вібрація
        tg.HapticFeedback.notificationOccurred('warning');

        // Змінюємо лампочку на виключену
        this.textContent = '💀';

        // Додаємо темний режим
        document.body.classList.add('dark-mode');

        // Показуємо тролінговий текст
        showToast('І нахуя ти світло виключив? 😑');

        // Через 20 секунд повертаємо все назад
        darkModeTimeout = setTimeout(() => {
            // Повертаємо лампочку
            lightBulb.textContent = '💡';

            // Вимикаємо темний режим
            document.body.classList.remove('dark-mode');

            // Показуємо повідомлення
            showToast('⚡️ДТЕК повідомляє: електропостачання відновлено 💡', 'success');

            // Скидаємо прапор
            isDarkMode = false;
        }, 20000); // 20 секунд
    });
}

// ========================================
// ІНІЦІАЛІЗАЦІЯ ПРИ ЗАВАНТАЖЕННІ
// ========================================

// Автофокус на першому полі (з затримкою для iOS)
setTimeout(() => {
    clipUrlInput.focus();
}, 300);

// Ховаємо MainButton при завантаженні (без валідації)
updateMainButton(false);

// Ініціалізація лічильника символів
updateCharCounter();

// Повідомляємо Telegram що додаток готовий
tg.ready();

console.log('🚀 Telegram Web App ініціалізовано');
console.log('📋 initData:', tg.initData ? 'є' : 'ПОРОЖНІЙ');
console.log('👤 Користувач:', tg.initDataUnsafe?.user);
console.log('📦 initDataUnsafe:', JSON.stringify(tg.initDataUnsafe));
