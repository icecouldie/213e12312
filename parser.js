const fs = require('fs');
const puppeteer = require('puppeteer');

async function scrapeElvebredd() {
  console.log('🚀 Запуск точного парсера Elvebredd...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    console.log('📄 Переходим на elvebredd.com...');
    await page.goto('https://elvebredd.com/', { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });

    console.log('⏳ Ожидание прогрузки данных страницы...');
    await new Promise(r => setTimeout(r, 7000));

    // Извлекаем скрытые данные Next.js или структурированные блоки цен
    const scrapedData = await page.evaluate(() => {
      const pets = [];

      // 1. Попытка достать данные из системного хранилища Next.js, если оно доступно
      const nextDataEl = document.getElementById('__NEXT_DATA__');
      if (nextDataEl) {
        try {
          const json = JSON.parse(nextDataEl.innerText);
          // Рекурсивно ищем массивы, где есть объекты с именами и ценами
          function scan(obj) {
            if (!obj || typeof obj !== 'object') return;
            if (Array.isArray(obj)) {
              obj.forEach(item => {
                if (item && (item.name || item.title) && (item.value !== undefined || item.base !== undefined)) {
                  const name = item.name || item.title;
                  const base = parseFloat(item.value || item.base || 0);
                  if (name && base > 0) {
                    pets.push({
                      name: name,
                      image: `image pets/${name}.png`,
                      tier: item.tier || item.rarity || "Legendary",
                      base: base,
                      reg: base.toFixed(2),
                      neon: (base * 3.9).toFixed(2),
                      mega: (base * 15.8).toFixed(2),
                      demand: item.demand || "High Demand 🔥"
                    });
                  }
                }
              });
            }
            Object.values(obj.props || obj).forEach(val => scan(val));
          }
          scan(json);
        } catch (e) {
          console.log('Next.js parse fallback');
        }
      }

      // 2. Если через системный JSON не заполнилось, собираем по карточкам каталога цен
      if (pets.length === 0) {
        // Ищем блоки, которые содержат информацию о ценности питомцев
        const cards = document.querySelectorAll('div, tr');
        cards.forEach(card => {
          const text = card.innerText;
          if (text && text.includes('\n')) {
            const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length >= 2) {
              // Ищем строку с числовым значением цены
              for (let i = 0; i < lines.length; i++) {
                const val = parseFloat(lines[i].replace(/[^0-9.]/g, ''));
                if (!isNaN(val) && val > 0 && val < 50000) {
                  const name = lines[i - 1];
                  // Строгая фильтрация: исключаем ники, время, вопросы и технические слова
                  const isServiceText = !name || 
                    name.length < 2 || 
                    name.length > 35 ||
                    name.includes('ago') || 
                    name.includes('?') || 
                    name.includes('http') ||
                    name.includes('Value') ||
                    name.includes('Demand') ||
                    name.includes('Trade') ||
                    /^\d/.test(name);

                  if (!isServiceText) {
                    pets.push({
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
            }
          }
        });
      }

      // Убираем дубликаты
      return Array.from(new Map(pets.map(p => [p.name, p])).values());
    });

    if (scrapedData.length > 0) {
      scrapedData.sort((a, b) => b.base - a.base);
      fs.writeFileSync('./pets-data.json', JSON.stringify(scrapedData, null, 2), 'utf-8');
      console.log(`✅ Успешно спарсено с Elvebredd: ${scrapedData.length} реальных позиций!`);
    } else {
      console.warn('⚠️ Данные не найдены, структура сайта могла измениться.');
    }

  } catch (error) {
    console.error('❌ Ошибка при парсинге Elvebredd:', error);
  } finally {
    await browser.close();
  }
}

scrapeElvebredd();
