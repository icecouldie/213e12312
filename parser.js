const fs = require('fs');

async function updateData() {
  console.log('🚀 Синхронизация базы данных питомцев ElveTrack...');

  try {
    // Читаем список питомцев из твоего index.html, где гарантированно нет мусора и ников
    const htmlContent = fs.readFileSync('./index.html', 'utf-8');
    const match = htmlContent.match(/const PETS_DATABASE = \[([\s\S]*?)\];/);
    
    if (!match || !match[1]) {
      throw new Error('Не удалось найти PETS_DATABASE в index.html');
    }

    const jsonString = '[' + match[1].replace(/,\s*([\]}])/g, '$1') + ']';
    const petsData = eval('(' + jsonString + ')');

    if (Array.isArray(petsData) && petsData.length > 0) {
      // Сортируем по убыванию базовой стоимости
      petsData.sort((a, b) => b.base - a.base);

      // Сохраняем чистый файл для сайта
      fs.writeFileSync('./pets-data.json', JSON.stringify(petsData, null, 2), 'utf-8');
      console.log(`✅ База данных успешно обновлена! Актуальных позиций: ${petsData.length}`);
    } else {
      console.warn('⚠️ Ошибка: массив пуст.');
    }

  } catch (error) {
    console.error('❌ Ошибка синхронизации:', error);
    process.exit(1);
  }
}

updateData();
