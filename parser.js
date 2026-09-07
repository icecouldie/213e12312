const fs = require('fs');
const puppeteer = require('puppeteer');

async function scrapeElvebreddCalculator() {
  console.log('🚀 Переход на калькулятор Elvebredd...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  try {
    await page.goto('https://elvebredd.com/adopt-me-calculator', { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });

    console.log('⏳ Ожидание загрузки приложения...');
    await new Promise(r => setTimeout(r, 7000));

    // Кликаем по первой свободной ячейке сетки обмена, чтобы открылось окно со списком питомцев
    console.log('🖱️ Открываем модальное окно выбора питомцев...');
    await page.evaluate(() => {
      // Ищем интерактивные слоты сетки калькулятора
      const elements = Array.from(document.querySelectorAll('div, button, img'));
      const slot = elements.find(el => {
        const text = el.innerText ? el.innerText.trim() : '';
        const cl = typeof el.className === 'string' ? el.className.toLowerCase() : '';
        return text === '+' || cl.includes('grid-item') || cl.includes('slot') || cl.includes('add');
      });

      if (slot) {
        slot.click();
      } else {
        // Запасной вариант: клик по первому квадрату сетки трейда
        const grid = document.querySelector('div[style*="grid"], div[class*="grid"]');
        if (grid && grid.firstElementChild) {
          grid.firstElementChild.click();
        }
      }
    });

    console.log('⏳ Ожидание появления карточек питомцев...');
    await new Promise(r => setTimeout(r, 5000));

    // Извлекаем карточки питомцев
    const pets = await page.evaluate(() => {
      const results = [];
      
      // Ищем все блоки карточек, содержащие имя и цену
      const nodes = document.querySelectorAll('div, button, li');
      nodes.forEach(node => {
        const text = node.innerText;
        if (!text || !text.includes('\n')) return;

        const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
        if (lines.length >= 2) {
          const name = lines[0];
          // Ищем строку с числом
          for (let i = 1; i < lines.length; i++) {
            const rawVal = lines[i].replace(/,/g, '');
            const val = parseFloat(rawVal);

            const isBad = 
              !name || 
              name.length < 2 || 
              name.length > 35 ||
              name.toLowerCase().includes('offer') ||
              name.toLowerCase().includes('shark') ||
              name.toLowerCase().includes('frost') ||
              name.toLowerCase().includes('search') ||
              name.toLowerCase().includes('value') ||
              /^\d+$/.test(name);

            if (!isNaN(val) && val > 0 && val < 50000 && !isBad) {
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
              break;
            }
          }
        }
      });

      return Array.from(new Map(results.map(p => [p.name, p])).values());
    });

    if (pets.length > 0) {
      pets.sort((a, b) => b.base - a.base);
      fs.writeFileSync('./pets-data.json', JSON.stringify(pets, null, 2), 'utf-8');
      console.log(`✅ Успешно спарсено питомцев: ${pets.length}`);
    } else {
      console.warn('⚠️ Список питомцев не распознан в разметке.');
    }

  } catch (error) {
    console.error('❌ Ошибка выполнения:', error.message);
  } finally {
    await browser.close();
  }
}

scrapeElvebreddCalculator();
