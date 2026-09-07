const fs = require('fs');
const puppeteer = require('puppeteer');

async function scrapeElvebreddCalculator() {
  console.log('🚀 Переход на калькулятор Elvebredd...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    // Открываем именно страницу калькулятора, а не главную
    await page.goto('https://elvebredd.com/adopt-me-calculator', { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });

    console.log('⏳ Ожидание отрисовки сетки питомцев...');
    await new Promise(r => setTimeout(r, 10000));

    // Извлекаем карточки питомцев из модального окна/каталога калькулятора
    const livePets = await page.evaluate(() => {
      const results = [];
      
      // Перебираем элементы, похожие на карточки в каталоге
      const items = document.querySelectorAll('div, button');
      items.forEach(el => {
        const text = el.innerText || '';
        const lines = text.split('\n').map(t => t.trim()).filter(Boolean);
        
        // В калькуляторе блок обычно содержит имя и число цены
        if (lines.length >= 2) {
          const name = lines[0];
          const valStr = lines[1].replace(/[^0-9.]/g, '');
          const val = parseFloat(valStr);

          // Проверяем, что это не системные кнопки и число адекватное
          if (
            !isNaN(val) && 
            val > 0 && 
            val < 20000 &&
            name.length > 2 && 
            name.length < 35 &&
            !name.toLowerCase().includes('shark') &&
            !name.toLowerCase().includes('frost') &&
            !name.toLowerCase().includes('offer') &&
            !name.toLowerCase().includes('value')
          ) {
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
      console.log(`✅ Спарсено питомцев из калькулятора: ${livePets.length}`);
    } else {
      console.warn('⚠️ Элементы калькулятора не найдены (возможно, требуется клик по кнопке добавления питомца).');
    }

  } catch (error) {
    console.error('❌ Ошибка парсинга калькулятора:', error);
  } finally {
    await browser.close();
  }
}

scrapeElvebreddCalculator();
