const fs = require('fs');
const puppeteer = require('puppeteer');

async function scrapeValues() {
  console.log('🚀 Запуск браузера для парсинга цен...');
  
  // Запускаем Puppeteer в headless-режиме (без графического интерфейса)
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // Переходим на сайт (например, adoptmetradingvalues.com или другой)
    await page.goto('https://adoptmetradingvalues.com/', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });

    console.log('📄 Страница загружена, извлекаем данные...');

    // Здесь с помощью page.evaluate мы собираем данные со страницы в массив
    const scrapedData = await page.evaluate(() => {
      const pets = [];
      // Пример поиска карточек питомцев на странице (селекторы зависят от вёрстки сайта-источника)
      const cards = document.querySelectorAll('.pet-card, .value-item'); // Укажи актуальные классы сайта
      
      cards.forEach(card => {
        const name = card.querySelector('.pet-name')?.innerText?.trim();
        const valueText = card.querySelector('.pet-value')?.innerText?.trim();
        
        if (name && valueText) {
          const base = parseFloat(valueText) || 1.0;
          pets.push({
            name: name,
            image: `image pets/${name}.png`,
            tier: "Legendary", // Можно распарсить и редкость
            base: base,
            reg: base.toFixed(2),
            neon: (base * 3.9).toFixed(2),
            mega: (base * 15.8).toFixed(2),
            demand: "Stable"
          });
        }
      });
      return pets;
    });

    // Если парсер по какой-то причине не нашел элементы (например, сайт сменил верстку), 
    // чтобы не затереть рабочий файл пустым массивом, делаем проверку:
    if (scrapedData.length > 0) {
      // Сортируем по убыванию стоимости
      scrapedData.sort((a, b) => b.base - a.base);

      fs.writeFileSync('./pets-data.json', JSON.stringify(scrapedData, null, 2), 'utf-8');
      console.log(`✅ Успешно сохранено питомцев: ${scrapedData.length} в pets-data.json`);
    } else {
      console.warn('⚠️ На странице ничего не найдено, файл не перезаписан.');
    }

  } catch (error) {
    console.error('❌ Ошибка во время парсинга:', error);
  } finally {
    await browser.close();
  }
}

scrapeValues();