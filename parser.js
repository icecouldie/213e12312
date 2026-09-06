const fs = require('fs');
const puppeteer = require('puppeteer');

async function scrapeElvebredd() {
  console.log('🚀 Запуск чистого парсера Elvebredd...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    // Переходим на страницу со списком цен, где нет лишних чатов и профилей
    console.log('📄 Переходим на elvebredd.com...');
    await page.goto('https://elvebredd.com/', { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });

    console.log('⏳ Ждем прогрузку элементов...');
    await new Promise(r => setTimeout(r, 7000));

    const scrapedData = await page.evaluate(() => {
      const pets = [];
      
      // Ищем блоки, которые содержат цены на элементы
      const elements = document.querySelectorAll('div');
      
      elements.forEach(el => {
        const text = el.innerText;
        if (text && text.includes('\n')) {
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          
          if (lines.length >= 2) {
            for (let i = 0; i < lines.length; i++) {
              const val = parseFloat(lines[i].replace(/[^0-9.]/g, ''));
              
              if (!isNaN(val) && val > 0 && val < 10000) {
                const name = lines[i - 1];
                
                // СТРОГИЙ ЧЕРНЫЙ СПИСОК: отсекаем абсолютно весь мусор интерфейса
                const isBadName = !name || 
                  name.length < 2 || 
                  name.length > 35 ||
                  name.toLowerCase() === 'you' ||
                  name.toLowerCase() === 'since 2020' ||
                  name.toLowerCase() === 'world records' ||
                  name.includes('ago') || 
                  name.includes('?') || 
                  name.includes('Value') ||
                  name.includes('Demand') ||
                  name.includes('Trade') ||
                  /^\d/.test(name);

                if (!isBadName) {
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

      return Array.from(new Map(pets.map(p => [p.name, p])).values());
    });

    if (scrapedData.length > 0) {
      scrapedData.sort((a, b) => b.base - a.base);
      fs.writeFileSync('./pets-data.json', JSON.stringify(scrapedData, null, 2), 'utf-8');
      console.log(`✅ Успешно сохранено чистых позиций: ${scrapedData.length}`);
    } else {
      console.warn('⚠️ Ничего не найдено.');
    }

  } catch (error) {
    console.error('❌ Ошибка парсинга:', error);
  } finally {
    await browser.close();
  }
}

scrapeElvebredd();
