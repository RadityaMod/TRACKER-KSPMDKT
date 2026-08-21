import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const TEST_PIN = "24681012";

async function expectPath(page: Page, pathname: string) {
  await expect.poll(() => new URL(page.url()).pathname).toBe(pathname);
}

async function unlock(page: Page) {
  await page.goto("/");
  await expectPath(page, "/pin");
  await page.getByLabel("PIN dashboard").fill(TEST_PIN);
  await page.getByLabel("PIN dashboard").press("Enter");
  await expectPath(page, "/");
  await expect(
    page.getByRole("strong").filter({ hasText: "KSP MENDEKAT TRACKER" }),
  ).toBeVisible();
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}

test("anonymous visitors are redirected to the PIN gate", async ({ page }) => {
  await page.goto("/?q=banjir");
  await expectPath(page, "/pin");
  expect(new URL(page.url()).searchParams.get("redirectTo")).toBe("/?q=banjir");
  await expect(page.getByRole("heading", { name: "KSP MENDEKAT" })).toBeVisible();
});

test("wrong PIN shows a useful error", async ({ page }) => {
  await page.goto("/pin");
  await page.getByLabel("PIN dashboard").fill("00000000");
  await page.getByLabel("PIN dashboard").press("Enter");
  await expect(page.getByText("PIN belum cocok. Coba masukkan ulang.")).toBeVisible();
});

test("valid PIN opens the dashboard without a manual lock button", async ({ page }) => {
  await unlock(page);
  // Header tak lagi menampilkan label sumber data, jadi bukti bahwa CSV
  // fallback benar-benar termuat diambil dari caption tabel.
  await expect(
    page.getByRole("table", { name: /Daftar pelapor KSP Mendekat.*2 dari 2 hasil/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Kunci dashboard di perangkat ini" }),
  ).toHaveCount(0);
});

test("PIN, dashboard, and detail dialog pass axe checks", async ({ page }) => {
  await page.goto("/pin");
  await expectNoAxeViolations(page);

  await page.getByLabel("PIN dashboard").fill(TEST_PIN);
  await page.getByLabel("PIN dashboard").press("Enter");
  await expectPath(page, "/");
  await expectNoAxeViolations(page);

  await page.getByRole("button", { name: /Detail Siti Rahma/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const dataLink = dialog.getByRole("link", { name: "Buka tautan data laporan di tab baru" });
  await expect(dataLink).toHaveAttribute("href", "https://contoh.go.id/data/1");
  await expect(dataLink).toHaveAttribute("target", "_blank");
  await expectNoAxeViolations(page);
});

test("mobile interactive targets are at least 44 pixels", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pin");
  await expect(page.getByRole("button", { name: "Buka dashboard" })).toBeVisible();
  await unlock(page);

  const undersized = await page
    .locator("button:visible, input:not([type=hidden]):visible, select:visible, summary:visible")
    .evaluateAll((elements) =>
      elements
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            label:
              element.getAttribute("aria-label") ||
              element.textContent?.trim() ||
              element.tagName,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        })
        .filter(({ label, width, height }) =>
          label !== "Open Next.js Dev Tools" && (width < 44 || height < 44)),
    );

  expect(undersized).toEqual([]);
});
