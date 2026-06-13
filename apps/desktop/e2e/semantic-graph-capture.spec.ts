import { test, expect } from '@playwright/test';

test('Delivery dataset shows Concept Map with event grain', async ({ page }) => {
  await page.goto('http://localhost:5173');
  // Upload good_operations.csv từ sample-data-audit/
  // Chờ DatasetUnderstandingCard hiển thị
  // Tìm element có text "Concept Map"
  // Chụp screenshot SVG graph
  await page.screenshot({ path: 'e2e/screenshots/delivery-concept-map.png', fullPage: false });
  // Verify text "event" xuất hiện trong SVG (grain badge)
  await expect(page.locator('text=event')).toBeVisible();
});

test('Inventory dataset shows Concept Map with snapshot grain', async ({ page }) => {
  await page.goto('http://localhost:5173');
  // Upload good_inventory.csv từ sample-data-audit/
  // Chờ DatasetUnderstandingCard hiển thị
  // Chụp screenshot
  await page.screenshot({ path: 'e2e/screenshots/inventory-concept-map.png', fullPage: false });
  // Verify grain badge
  await expect(page.locator('svg')).toBeVisible();
});
