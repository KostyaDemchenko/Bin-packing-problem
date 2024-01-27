function potpack(boxes) {
    // Обчислити загальну площу блоків та максимальну ширину блока
    let area = 0;
    let maxWidth = 0;

    for (const box of boxes) {
        area += box.w * box.h;
        maxWidth = Math.max(maxWidth, box.w);
    }

    // Відсортувати блоки за висотою у порядку спадання
    boxes.sort((a, b) => b.h - a.h);

    // Робимо наш контейнер для блоків приблизно квадратним
    const startWidth = Math.max(Math.ceil(Math.sqrt(area / 0.95)), maxWidth);

    // Починаємо з порожнього простору, необмеженого знизу
    const spaces = [{ x: 0, y: 0, w: startWidth, h: Infinity }];

    let width = 0;
    let height = 0;

    for (const box of boxes) {
        // Переглядаємо доступний простір, щоб спочатку перевірити менші простори
        for (let i = spaces.length - 1; i >= 0; i--) {
            const space = spaces[i];

            // Пошук порожніх просторів, які можуть вмістити поточний блок
            if (box.w > space.w || box.h > space.h)
                continue;

            // Якщо знайдено простір; 
            // додати блок в його верхній лівий кут
            // ┌───────┬───────┐
            // │ блок  │       │
            // ├───────┘       │
            // │       простір │
            // └───────────────┘
            box.x = space.x;
            box.y = space.y;

            height = Math.max(height, box.y + box.h);
            width = Math.max(width, box.x + box.w);

            if (box.w === space.w && box.h === space.h) {
                // простір точно відповідає блоку; видаляємо його
                const last = spaces.pop();
                if (i < spaces.length)
                    spaces[i] = last;
            } else if (box.h === space.h) {
                // простір відповідає висоті блоку; оновляємо його
                // ┌───────┬───────────────┐
                // │  блок │оновлений про. │
                // └───────┴───────────────┘
                space.x += box.w;
                space.w -= box.w;
            } else if (box.w === space.w) {
                // простір відповідає ширині блоку; оновляємо його
                // ┌───────────────┐
                // │      Блок     │
                // ├───────────────┤
                // │ оновлений про.│
                // └───────────────┘
                space.y += box.h;
                space.h -= box.h;
            } else {
                // в іншому випадку блок розділяє простір на два простори
                // ┌───────┬───────────┐
                // │  блок │ новий про.│
                // ├───────┴───────────┤
                // │ оновлений про.    │
                // └───────────────────┘
                spaces.push({
                    x: space.x + box.w,
                    y: space.y,
                    w: space.w - box.w,
                    h: box.h,
                });
                space.y += box.h;
                space.h -= box.h;
            }
            break;
        }
    }

    return {
        w: width, // ширина контейнера
        h: height, // висота контейнера
        fill: (area / (width * height)) || 0, // використання простору
    };
}

// Загрузка розмірів блоків з файлу
async function readBlockDimensionsFromFile() {
    const filePath = './blocks.json';
    try {
        const response = await fetch(filePath);
        const dimensions = await response.json();
        return dimensions;
    } catch (error) {
        console.error("Помилка зчитування розмірів блоків з файлу:", error);
        throw error;
    }
}

// Головна функція основної логіки
async function main() {
    const DRAW_TEXT = true;

    // Масив для збереження інформації про блоки
    const boxes = [];

    // Зчитування розмірів блоків з файлу
    const blockDimensions = await readBlockDimensionsFromFile();

    // Об'єкт для відстеження кольорів блоків за їхнім розміром
    const colorMap = {};

    // Кількість блоків
    const N = blockDimensions.length;

    // Цикл для обробки кожного блоку
    for (let i = 0; i < N; i++) {
        // Отримання розмірів для поточного блоку
        const { width, height } = blockDimensions[i];

        // Створення об'єкта блока та додавання його до масиву
        const box = { w: width, h: height, i: i + 1 };

        // Визначення кольору блока відповідно до його розміру
        if (!(width in colorMap) || !(height in colorMap[width])) {
            const c = `hsl(${Math.random() * 360 | 0}, 45%, 75%)`;
            colorMap[width] = { ...colorMap[width], [height]: c };
            box.c = c;
        } else {
            box.c = colorMap[width][height];
        }

        // Додавання блока до масиву
        boxes.push(box);

        // Вимірювання часу виконання алгоритму упаковки
        const result = potpack(boxes);

        // Розміри та використання простору контейнера
        const { w, h } = result;

        // Визначення відношення ширини до висоти для забезпечення адекватного відображення
        const aspect = w / h;

        // Налаштування розмірів та стилів container для відображення
        container.width = w * dpr;
        container.height = h * dpr;
        container.style.cssText = `
            width: 256px;
            height: ${256 / aspect}px;
            width: ${w}px;
            height: ${h}px;
            outline: 1px solid var(--white);
        `;

        // Налаштування контексту малювання блоків
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = '';
        ctx.textAlign = 'center';
        ctx.font = '8px';

        // Перебір блоків та їх відображення
        for (const box of boxes) {
            ctx.save();
            ctx.translate(box.x, box.y);
            ctx.fillStyle = box.c;
            ctx.fillRect(0, 0, box.w, box.h);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(box.w, 0);
            ctx.lineTo(box.w, box.h);
            ctx.lineTo(0, box.h);
            ctx.lineTo(box.w, box.h);
            ctx.stroke();

            // Виведення номеру блока
            if (DRAW_TEXT) {
                ctx.fillStyle = 'black';
                ctx.font = `${Math.min(box.w, box.h) * 0.5}px`;
                ctx.fillText(
                    box.i.toString(),
                    box.w / 2,
                    box.h / 2
                );
            }

            ctx.restore();
        }

        ctx.restore();

        // Оновлення вмісту елементу HTML з інформацією про виконання
        document.getElementById('fullnes').textContent = `Fullnes: ${(result.fill * 100).toFixed(0)}%`;

        // Затримка для створення анімації та очікування завершення кадру
        await new Promise((r) => requestAnimationFrame(() => { r(); }));
    }
}

// Отримання розміру пікселя пристрою та створення контексту малювання
let dpr = window.devicePixelRatio;
const ctx = container.getContext('2d');

// Визиваємо головну функцію та обробляємо результати
main()
    .then(() => {
        console.log('Перемога, все спрацювало!');
    })
    .catch((error) => {
        console.error(error.name, error.message);
    });