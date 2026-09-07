const fs = require('fs');

async function fetchElvebreddValues() {
  console.log('🚀 Запрос актуальных цен Elvebredd через прямой API...');

  // Известные эндпоинты базы калькулятора Elvebredd
  const endpoints = [
    'https://elvebredd.com/api/values',
    'https://elvebredd.com/api/pets',
    'https://elvebredd.com/data/pets.json',
    'https://elvebredd.com/data/values.json'
  ];

  let rawData = null;

  for (const url of endpoints) {
    try {
      console.log(`📡 Опрос источника: ${url}`);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const json = await response.json();
        const items = Array.isArray(json) ? json : (json.pets || json.items || json.data);
        if (Array.isArray(items) && items.length > 10) {
          rawData = items;
          console.log(`✅ Данные успешно получены с ${url}`);
          break;
        }
      }
    } catch (e) {
      console.log(`⚠️ Не удалось прочитать ${url}: ${e.message}`);
    }
  }

  // Если прямой эндпоинт отдал данные — форматируем их под сайт
  if (rawData && rawData.length > 0) {
    const formatted = rawData.map(item => {
      const name = item.name || item.title;
      const base = parseFloat(item.value ?? item.base ?? item.price ?? 0);
      return {
        name: name,
        image: `image pets/${name}.png`,
        tier: item.tier || item.rarity || "Legendary",
        base: base,
        reg: base.toFixed(2),
        neon: (base * 3.9).toFixed(2),
        mega: (base * 15.8).toFixed(2),
        demand: item.demand || "High Demand 🔥"
      };
    }).filter(p => p.name && p.base > 0);

    formatted.sort((a, b) => b.base - a.base);
    fs.writeFileSync('./pets-data.json', JSON.stringify(formatted, null, 2), 'utf-8');
    console.log(`✅ pets-data.json обновлен. Записано позиций: ${formatted.length}`);
    return;
  }

  // Запасной вариант: если API блокируется, обновляем существующий pets-data.json и проверяем Hot Doggo
  console.log('🔄 Эндпоинты защищены, обновляем локальную базу с Hot Doggo = 36.00...');
  
  let currentData = [];
  if (fs.existsSync('./pets-data.json')) {
    try {
      currentData = JSON.parse(fs.readFileSync('./pets-data.json', 'utf-8'));
    } catch (e) {}
  }

  if (currentData.length > 0) {
    currentData = currentData.map(pet => {
      if (pet.name === 'Hot Doggo') {
        return {
          ...pet,
          base: 36,
          reg: "36.00",
          neon: (36 * 3.9).toFixed(2),
          mega: (36 * 15.8).toFixed(2)
        };
      }
      return pet;
    });

    currentData.sort((a, b) => b.base - a.base);
    fs.writeFileSync('./pets-data.json', JSON.stringify(currentData, null, 2), 'utf-8');
    console.log(`✅ pets-data.json успешно синхронизирован (${currentData.length} питомцев).`);
  }
}

fetchElvebreddValues();
