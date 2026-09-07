const fs = require('fs');
const puppeteer = require('puppeteer');

async function scrapeElvebreddCalculator() {
  console.log('🚀 Переход на калькулятор Elvebredd...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  let interceptedPets = [];

  // Перехватываем сетевые запросы: Elvebredd отдает базу через API / JSON
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('item') || url.includes('pet') || url.includes('value') || url.includes('data') || url.includes('.json')) {
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('application/json')) {
          const json = await response.json();
          const targetArray = Array.isArray(json) ? json : (json.items || json.pets || json.data || []);
          if (Array.isArray(targetArray) && targetArray.length > 5) {
            targetArray.forEach(item => {
              const name = item.name || item.title;
              const val = parseFloat(item.value ?? item.base ?? item.price ?? 0);
              if (name && val > 0) {
                interceptedPets.push({
                  name: name,
                  image: `image pets/${name}.png`,
                  tier: item.tier || item.rarity || "Legendary",
                  base: val,
                  reg: val.toFixed(2),
                  neon: (val * 3.9).toFixed(2),
                  mega: (val * 15.8).toFixed(2),
                  demand: item.demand || "High Demand 🔥"
                });
              }
            });
          }
        }
      } catch (e) {}
    }
  });

  try {
    await page.goto('https://elvebredd.com/adopt-me-calculator', { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });

    console.log('⏳ Проверяем перехваченные сетевые данные...');
    await new Promise(r => setTimeout(r, 5000));

    // Если сеть не отдала массив напрямую, кликаем по координатам центра первого слота сетки
    if (interceptedPets.length === 0) {
      console.log('🖱️ Кликаем по первой ячейке сетки калькулятора...');
      await page.mouse.click(500, 320);
      await new Promise(r => setTimeout(r, 4000));
    }

    // Если перехвачен сетевой JSON
    if (interceptedPets.length > 0) {
      const unique = Array.from(new Map(interceptedPets.map(p => [p.name, p])).values());
      unique.sort((a, b) => b.base - a.base);
      fs.writeFileSync('./pets-data.json', JSON.stringify(unique, null, 2), 'utf-8');
      console.log(`✅ Успешно перехвачено и сохранено питомцев: ${unique.length}`);
      return;
    }

    // Резервный поиск по внутреннему хранилищу window/hydration
    const windowData = await page.evaluate(() => {
      const list = [];
      const keys = Object.keys(window);
      for (const k of keys) {
        if (typeof window[k] === 'object' && window[k] !== null) {
          const cand = window[k].pets || window[k].items;
          if (Array.isArray(cand) && cand.length > 10) {
            cand.forEach(item => {
              if (item.name && (item.value || item.base)) {
                const b = parseFloat(item.value || item.base);
                list.push({
                  name: item.name,
                  image: `image pets/${item.name}.png`,
                  tier: "Legendary",
                  base: b,
                  reg: b.toFixed(2),
                  neon: (b * 3.9).toFixed(2),
                  mega: (b * 15.8).toFixed(2),
                  demand: "High Demand 🔥"
                });
              }
            });
          }
        }
      }
      return list;
    });

    if (windowData.length > 0) {
      windowData.sort((a, b) => b.base - a.base);
      fs.writeFileSync('./pets-data.json', JSON.stringify(windowData, null, 2), 'utf-8');
      console.log(`✅ Успешно извлечено из памяти страницы: ${windowData.length}`);
    } else {
      console.warn('⚠️ Данные не получены. Защита Cloudflare или приватный формат данных.');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await browser.close();
  }
}

scrapeElvebreddCalculator();
