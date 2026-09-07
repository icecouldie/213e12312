const fs = require('fs');
const puppeteer = require('puppeteer');

async function scrapeElvebreddCalculator() {
  console.log('🚀 Переход на калькулятор Elvebredd...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    await page.goto('https://elvebredd.com/adopt-me-calculator', { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });

    console.log('⏳ Ожидание загрузки интерфейса...');
    await new Promise(r => setTimeout(r, 6000));

    // Ищем и нажимаем на кнопку/слот добавления питомца (плюс или пустую ячейку)
    console.log('🖱️ Кликаем на слот добавления питомца (+)...');
    const clicked = await page.evaluate(() => {
      // Ищем элементы с плюсиком, svg или кнопками сетки трейда
      const buttons = Array.from(document.querySelectorAll('button, div'));
      const plusBtn = buttons.find(el => {
        const t = el.innerText ? el.innerText.trim() : '';
        return t === '+' || el.getAttribute('aria-label') === 'Add pet' || el.classList.contains('add-item');
      });

      if (plusBtn) {
        plusBtn.click();
        return true;
      }
      return false;
    });

    console.log(clicked ? '✅ Клик выполнен, ждем открытие каталога...' : '⚠️ Прямая кнопка не найдена, пробуем читать открытые элементы...');
    await new Promise(r => setTimeout(r, 6000));

    // Собираем появившиеся карточки питомцев
    const livePets = await page.evaluate(() => {
      const results = [];
      const cards = document.querySelectorAll('div, button');

      cards.forEach(el => {
        const text = el.innerText || '';
        if (!text.includes('\n')) return;

        const lines = text.split('\n').map(t => t.trim()).filter(Boolean);
        if (lines.length >= 2) {
          const name = lines[0];
          const valStr = lines[1].replace(/[^0-9.]/g, '');
          const val = parseFloat(valStr);

          // Проверяем имя и диапазон цен
          const isInvalidName = 
            !name || 
            name.length < 2 || 
            name.length > 35 ||
            name.toLowerCase().includes('shark') ||
            name.toLowerCase().includes('frost') ||
            name.toLowerCase().includes('their offer') ||
            name.toLowerCase().includes('your offer') ||
            name.toLowerCase().includes('value');

          if (!isNaN(val) && val > 0 && val < 50000 && !isInvalidName) {
            results.push({
              name: name,
              image: `image pets/${name}.png`,
              tier: "Legendary",
              base: val,
              reg: val.toFixed(2),
              neon: (val * 3.9).toFixed(2),
              mega: (val * 15.8).toFixed(2),
              demand: "High Demand 🔥"
            });
          }
        }
      });

      return Array.from(new Map(results.map(p => [p.name, p])).values());
    });

    if (livePets.length > 0) {
      livePets.sort((a, b) => b.base - a.base);
      fs.writeFileSync('./pets-data.json', JSON.stringify(livePets, null, 2), 'utf-8');
      console.log(`✅ Успешно собрано питомцев: ${livePets.length}`);
    } else {
      console.warn('⚠️ Карточки в каталоге не обнаружены.');
    }

  } catch (error) {
    console.error('❌ Ошибка выполнения парсера:', error);
  } finally {
    await browser.close();
  }
}

scrapeElvebreddCalculator();
