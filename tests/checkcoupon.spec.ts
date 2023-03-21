import { test, expect } from '@playwright/test';
test.describe('A suite', () => {
  test.beforeEach(async ({ page }, testInfo) => { //Before test navigate to page and dismiss demo store banner
    console.log(`Running ${testInfo.title}`);
    await page.goto('https://www.edgewordstraining.co.uk/demo-site/');
    await page.getByRole('link', { name: 'Dismiss' }).click(); //As recorderd included strange unicode char  - name text does substring match by default so just removed char
  });

  test.afterEach(async ({ page }, testInfo) => { //Cleanup after test
    await page.getByRole('link', { name: 'Remove this item' }).click();
    await page.getByRole('link', { name: 'Return to shop' }).click();
    await page.locator('#menu-item-42').getByRole('link', { name: 'Home' }).click();
    await page.waitForTimeout(3000) //3 second dumb wait before close
  })
  for (let testiteration = 0; testiteration < 10; testiteration++) {
    //Orders 2 caps, uses drop down to navigate to cart,  applies edgewords coupon, asserts on coupon discount amount
    test('Check Coupon'+testiteration, async ({ page }) => {

      // { //Does Playwright have real keyboard events - docs suggest it does
      //   //https://playwright.dev/docs/api/class-keyboard
      //   // "Holding down Shift will type the text that corresponds to the key in the upper case."
      //   await page.getByRole('searchbox', { name: 'Search for:' }).click();
      //   await page.keyboard.down('Shift'); //Hold Shift
      //   await page.keyboard.press('c');
      //   await page.waitForTimeout(1000); //Enough time to see we get a lower case c
      //   await page.keyboard.up('Shift'); //Release Shift
      //   await page.getByRole('searchbox', { name: 'Search for:' }).clear();
      // }
      /*
      *Arrange
      */
      await page.getByRole('searchbox', { name: 'Search for:' }).click();
      await page.getByRole('searchbox', { name: 'Search for:' }).fill('cap');
      await page.getByRole('searchbox', { name: 'Search for:' }).press('Enter')
      await page.getByRole('button', { name: 'Add to cart' }).click();
      { //Do mouseover to reveal menu or test stope here
        //await page.getByRole('link', { name: '£16.00 1 item ' }).hover() //Horrible default locator
        await page.getByTitle('View your shopping cart').hover()
      }
      await page.locator('#site-header-cart').getByRole('link', { name: 'View cart ' }).click();

      /*
      *Act
      */

      await page.getByLabel('Cap quantity').click();
      //await page.getByLabel('Cap quantity').fill('2');
      { //Need to click away to enable 'Update' button when using the recorded fill()
        //Or can do the following:
        await page.getByLabel('Cap quantity').clear();
        await page.getByLabel('Cap quantity').type('2') //Type sends js key events, so page js thinks something has been typed
      }
      await page.getByRole('button', { name: 'Update cart' }).click();


      await page.getByPlaceholder('Coupon code').click()
      await page.getByPlaceholder('Coupon code').fill('edgewords');
      await page.getByRole('button', { name: 'Apply coupon' }).click();

      // Recorded clicks to get locators but locators all need changing
      // await page.getByRole('row', { name: 'Subtotal Subtotal: £32.00' }).getByRole('cell', { name: 'Subtotal: £32.00' }).click();
      // await page.getByRole('cell', { name: 'Coupon: edgewords: -£4.80 [Remove]' }).click();
      // await page.getByRole('cell', { name: 'Shipping: Flat rate: £3.95 Shipping options will be updated during checkout. Calculate shipping' }).getByRole('listitem').click();
      // await page.getByRole('cell', { name: 'Total: £31.15' }).click();


      //Capturing values
      //Locating by ARIA Role etc is supposed to mirror how an actual user might find things on a page
      //...and as such could be more resiliant against page refactorings by the web devs

      //If the page hasn't been explicity coded with a11y in mind, while it might be possible...
      const subTotal = await page.getByRole('row', { name: /^Subtotal/ }).getByRole('cell').filter({ hasText: '£' }).textContent();
      console.log(subTotal)
      //... is using this CSS really worse than the above Role shenanigans? I think the above still relies on page structure and so is just as likely to break.
      const subTotal2 = await page.locator('tr.cart-subtotal [data-title=Subtotal]').textContent()
      console.log(subTotal2)
      //Paywright has some handy extentions to normal CSS like the text and relative location psuedo classes below
      const subTotal3 = await page.locator('th:has-text("Subtotal"):below(:text("Cart totals")) + td').textContent()
      console.log(subTotal3)
      //As I want several things from the table I'll get an element handle for the table first then drill in to that
      const cartTotals = await page.locator('table:below(:text("Cart totals"))');
      //Now using cartTotals, dig in and get the amounts

      //I'm expecting to get strings back from textContent() so let's set the type
      let subTotal4: string = await cartTotals.locator('th:text("Subtotal") + td').textContent() ?? ''; // ??  - this is the nullish coalescing operator. As I've set the variable type to string it can't hold a null value. ?? '' means that if I get null, return empty string instead.
      //Or just let allow dynamic typing
      let couponDiscount = await cartTotals.locator('th:text("Coupon:") + td :not(a)').first().textContent() ?? '';
      let shipping = await cartTotals.locator('th:text("Shipping") + td label > span').textContent() ?? '';
      let total = await cartTotals.locator('th:text-is("Total") + td').textContent() ?? ''; //:text() psuedo class does substring matches, :text-is() is exact match

      console.log(`Checking values have been captured: ${subTotal4} ${couponDiscount} ${shipping} ${total}`);

      /*
      * Assert
      */
      //Strip £, convert to whole pennies for calc purposes. There are better suited external libraries for monetary/currency calculations, but this avoids extra dependencies
      let textTotals = [subTotal4, couponDiscount, shipping, total].map(function (x) { return x.replace('£', '') })
      let [subTotalPennies, couponDiscountPennies, shippingPennies, totalPennies] = textTotals.map(text => parseFloat(text) * 100)

      console.log(`Checking conversion to pennies worked: ${subTotalPennies} ${couponDiscountPennies} ${shippingPennies} ${totalPennies}`);

      //Test calculates 15% discount for comparison with site calculation
      let calculatedDiscount = Math.round(subTotalPennies * 0.15) //rounding to avoid possible fractions of a penny
      //calculatedDiscount -= 1; //Saboutage test to check assertion
      console.log(`Captured values:
    CapturedPennies,CapturedDiscountPennies,CapturedShippingPennies,CapturedTotalPennies : Sub-Discount+Shipping=Total
    ${[subTotalPennies, couponDiscountPennies, shippingPennies, totalPennies]} : ${subTotalPennies - couponDiscountPennies + shippingPennies == totalPennies}
    CapturedPennies,CalculatedDiscountPennies,CapturedShippingPennies,CapturedTotalPennies : Sub-Discount+Shipping=Total
    ${[subTotalPennies, calculatedDiscount, shippingPennies, totalPennies]} : ${subTotalPennies - calculatedDiscount + shippingPennies == totalPennies}
    `)

      expect(couponDiscountPennies).toEqual(calculatedDiscount)
    });
  };
});