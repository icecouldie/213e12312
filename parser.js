const fs = require('fs');
const puppeteer = require('puppeteer');

async function scrapeValues() {
  console.log('🚀 Запуск умного парсера Elvebredd...');
  
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

    console.log('⏳ Ждем прогрузку элементов...');
    await new Promise(r => setTimeout(r, 6000));

    const scrapedData = await page.evaluate(() => {
      const pets = [];
      const cards = document.querySelectorAll('div, span, p');
      
      cards.forEach(card => {
        const text = card.innerText;
        if (text && text.includes('\n')) {
          const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          
          for (let i = 0; i < lines.length; i++) {
            const potentialVal = parseFloat(lines[i].replace(/[^0-9.]/g, ''));
            
            if (!isNaN(potentialVal) && potentialVal > 0 && potentialVal < 50000) {
              const name = lines[i - 1];
              
              // ЖЕСТКИЕ ФИЛЬТРЫ: отсекаем мусор, вопросы, таймеры и интерфейс
              const isGarbage = !name || 
                name.length < 2 || 
                name.length > 30 ||
                name.includes('ago') || 
                name.includes('?') || 
                name.includes('How') || 
                name.includes('You') || 
                name.includes('2020') ||
                name.includes('Value') ||
                name.includes('Demand') ||
                /^\d/.test(name); // если имя начинается с цифры

              if (!isGarbage) {
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
      });

      return Array.from(new Map(pets.map(p => [p.name, p])).values());
    });

    if (scrapedData.length > 0) {
      scrapedData.sort((a, b) => b.base - a.base);
      fs.writeFileSync('./pets-data.json', JSON.stringify(scrapedData, null, 2), 'utf-8');
      console.log(`✅ Успешно отфильтровано и сохранено питомцев: ${scrapedData.length}`);
    } else {
      console.warn('⚠️ Ничего подходящего не найдено после фильтрации.');
    }

  } catch (error) {
    console.error('❌ Ошибка парсинга:', error);
  } finally {
    await browser.close();
  }
}

scrapeValues();
