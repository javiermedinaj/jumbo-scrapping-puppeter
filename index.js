import puppeteer from "puppeteer";
import fs from "fs/promises";

async function navigateWebPage() {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 100,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1088, height: 923 });

    await page.goto("https://www.jumbo.com.ar/");

    await page.waitForSelector(".vtex-styleguide-9-x-input");
    const input = await page.$("#downshift-0-input");

    const productName = "yerba";
    await input.type(productName);
    await input.press("Enter");
    // Espera 6 segundos para encontrar los elementos
    await new Promise(resolve => setTimeout(resolve, 6000));

    // Fix scroll
    async function scrollPageToBottom() {
      const previousHeight = await page.evaluate(() => document.body.scrollHeight);

      await page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });

      await new Promise(resolve => setTimeout(resolve, 3000)); // Espera un tiempo después del desplazamiento

      const currentHeight = await page.evaluate(() => document.body.scrollHeight);

      // Verificar si el botón "Mostrar más" sigue presente
      const showMoreButton = await page.$(".vtex-search-result-3-x-buttonShowMore--layout button");
      if (!showMoreButton) {
        console.log("Botón 'Mostrar más' no encontrado. Todos los productos han sido cargados.");
        return false; // Retorna false para detener el proceso de carga
      }

      return currentHeight > previousHeight; // Retorna true si hay nuevos elementos cargados
    }

    // Captura los nombres y precios de todos los productos en la página (incluyendo los que se cargaron con el "Mostrar más")
    const products = [];

    let hasMoreProducts = true;
    while (hasMoreProducts) {
      hasMoreProducts = await scrollPageToBottom();

      const productsData = await page.evaluate(() => {
        const productElements = document.querySelectorAll(".vtex-product-summary-2-x-container");
        const productsData = [];

        productElements.forEach((element) => {
          const nameElement = element.querySelector(".vtex-product-summary-2-x-productBrandName");
          const priceElement = element.querySelector(".jumboargentinaio-store-theme-2HGAKpUDWMGu8a66aeeQ56 div:first-child");
          const linkElement = element.querySelector("a.vtex-product-summary-2-x-clearLink");

          const name = nameElement ? nameElement.innerText.trim() : "Nombre no encontrado";
          const price = priceElement ? priceElement.innerText.trim() : "Precio no encontrado";
          const link = linkElement ? linkElement.getAttribute("href") : "";

          productsData.push({ name, price, link });
        });

        return productsData;
      });

      products.push(...productsData);
    }

    console.log(products);

    await fs.writeFile("jumbo.json", JSON.stringify(products, null, 2));

    console.log("Productos guardados correctamente en jumbo.json");

    await new Promise(resolve => setTimeout(resolve, 10000));

    await browser.close();
  } catch (error) {
    console.error("Error occurred:", error);
    await browser.close();
  }
}

navigateWebPage();

