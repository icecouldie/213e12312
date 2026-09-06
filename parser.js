const fs = require('fs');
const puppeteer = require('puppeteer');

async function scrapeValues() {
  console.log('🚀 Запуск браузера для парсинга Elvebredd...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    console.log('📄 Переходим на elvebredd.com...');
    await page.goto('https://elvebredd.com/', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });

    // Ждем, пока прогрузятся карточки питомцев на странице
    console.log('⏳ Ожидание загрузки элементов...');
    await new Promise(r => setTimeout(r, 5000)); // небольшая пауза на отрисовку скриптов

    console.log('🔍 Извлекаем данные о питомцах...');

    const scrapedData = await page.evaluate(() => {
      const pets = [];
      // Универсальный поиск карточек или элементов с именами и ценами на Elvebredd
      const items = document.querySelectorAll('div, span, a'); 
      
      // Поскольку структура React-приложений сложная, пройдемся по тексту или поищем блоки с ценами
      // Здесь мы собираем все видимые текстовые блоки, содержащие структуру питомцев
      const cards = document.querySelectorAll('[class*="pet"], [class*="item"], [class*="value"]');
      
      cards.forEach(card => {
        const text = card.innerText;
        if (text && text.includes('\n')) {
          const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          if (lines.length >= 2) {
            // Ищем строку с числом (ценой)
            for (let i = 0; i < lines.length; i++) {
              const potentialVal = parseFloat(lines[i].replace(/[^0-9.]/g, ''));
              if (!isNaN(potentialVal) && potentialVal > 0 && potentialVal < 10000) {
                // Если рядом есть имя питомца
                const name = lines[i - 1];
                if (name && name.length > 2 && !name.includes('Value') && !name.includes('Demand')) {
                  pets.push({
                    name: name,
                    image: `image pets/${name}.png`,
                    tier: "Legendary",
                    base: potentialVal,
                    reg: potentialVal.toFixed(2),
                    neon: (potentialVal * 3.9).toFixed(2),
                    mega: (potentialVal * 15.8).toFixed(2),
                    demand: "High Demand 🔥"
                  });
                  break;
                }
              }
            }
          }
        }
      });

      // Убираем дубликаты по имени
      return Array.from(new Map(pets.map(p => [p.name, p])).values());
    });

    if (scrapedData.length > 0) {
      scrapedData.sort((a, b) => b.base - a.base);
      fs.writeFileSync('./pets-data.json', JSON.stringify(scrapedData, null, 2), 'utf-8');
      console.log(`✅ Успешно сохранено питомцев с Elvebredd: ${scrapedData.length}`);
    } else {
      console.warn('⚠️ Не удалось извлечь данные, структура сайта защищена или изменилась.');
    }

  } catch (error) {
    console.error('❌ Ошибка парсинга Elvebredd:', error);
  } finally {
    await browser.close();
  }
}

scrapeValues();
