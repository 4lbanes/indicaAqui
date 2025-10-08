const { test, expect } = require('@playwright/test');

const randomSuffix = () => Math.random().toString(36).slice(2, 8);

const firstUser = {
  name: 'Antonio',
  email: () => `antonio.${randomSuffix()}@test.com`,
  password: 'SenhaForte123!',
};

const secondUser = {
  name: 'Bruna',
  email: () => `bruna.${randomSuffix()}@test.com`,
  password: 'SenhaAindaMais123!',
};

test.describe('Fluxo completo de indicação', () => {
  test('cadastro, login, indicação, reset e exclusão', async ({ page, context }) => {
    const primaryEmail = firstUser.email();
    const secondaryEmail = secondUser.email();
    const newPassword = 'NovaSenha123!';

    // Cadastro do primeiro usuário
    await page.goto('/');
    const registerForm = page.locator('.flip-card-front form');
    await registerForm.locator('input[name="name"]').fill(firstUser.name);
    await registerForm.locator('input[name="email"]').fill(primaryEmail);
    await registerForm.locator('input[name="password"]').fill(firstUser.password);
    await Promise.all([
      page.waitForURL('**/profile'),
      registerForm.locator('button[type="submit"]').click(),
    ]);

    await expect(page.locator('.profile-header h2')).toHaveText(firstUser.name);
    await expect(page.locator('.score strong')).toHaveText('0');

    const referralLinkRaw = (await page.locator('.referral code').innerText()).trim();
    const referralLink = referralLinkRaw.replace('localhost', '127.0.0.1');

    await page.locator('button.ghost', { hasText: 'Sair' }).click();
    await page.waitForURL('**/');

    // Cadastro do segundo usuário via link
    const referralPage = await context.newPage();
    await referralPage.goto(referralLink);
    const referralRegisterForm = referralPage.locator('.flip-card-front form');
    await referralRegisterForm.locator('input[name="name"]').fill(secondUser.name);
    await referralRegisterForm.locator('input[name="email"]').fill(secondaryEmail);
    await referralRegisterForm.locator('input[name="password"]').fill(secondUser.password);
    await Promise.all([
      referralPage.waitForURL('**/profile'),
      referralRegisterForm.locator('button[type="submit"]').click(),
    ]);

    await expect(referralPage.locator('.profile-header h2')).toHaveText(secondUser.name);
    await referralPage.locator('button.ghost', { hasText: 'Sair' }).click();
    await referralPage.close();

    // Login do primeiro usuário e verificação de pontos/histórico
    await page.goto('/?view=login');
    const loginForm = page.locator('.flip-card-back form');
    await loginForm.locator('input[name="email"]').fill(primaryEmail);
    await loginForm.locator('input[name="password"]').fill(firstUser.password);
    await Promise.all([
      page.waitForURL('**/profile'),
      loginForm.locator('button[type="submit"]').click(),
    ]);

    await expect(page.locator('.score strong')).toHaveText('1');
    const referralRow = page.locator('.referral-history tbody tr');
    await expect(referralRow).toHaveCount(1);
    await expect(referralRow.locator('td').nth(1)).toHaveText(secondaryEmail);

    await page.locator('button.ghost', { hasText: 'Sair' }).click();
    await page.waitForURL('**/');

    // Reset de senha
    await page.goto('/?view=login');
    await page.locator('button.forgot-password').click();
    await page.locator('.reset-panel input[name="email"]').first().fill(primaryEmail);

    const [resetResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().endsWith('/api/password-reset/request') && response.status() === 200),
      page.locator('.reset-panel button.primary').click(),
    ]);

    const resetPayload = await resetResponse.json();
    const resetCode = resetPayload.code;
    expect(resetCode, 'Código de redefinição deve estar presente em ambiente de teste').toBeTruthy();

    await page.locator('.reset-panel input[name="code"]').fill(resetCode);
    await page.locator('.reset-panel input[name="password"]').fill(newPassword);
    await page.locator('.reset-panel input[name="confirm"]').fill(newPassword);
    await Promise.all([
      page.waitForResponse((response) => response.url().endsWith('/api/password-reset/confirm') && response.status() === 200),
      page.locator('.reset-panel button.primary').click(),
    ]);

    await page.locator('.reset-panel button.ghost', { hasText: /voltar|back/i }).click();

    // Login com nova senha
    const loginFormAfterReset = page.locator('.flip-card-back form');
    await loginFormAfterReset.locator('input[name="email"]').fill(primaryEmail);
    await loginFormAfterReset.locator('input[name="password"]').fill(newPassword);
    await Promise.all([
      page.waitForURL('**/profile'),
      loginFormAfterReset.locator('button[type="submit"]').click(),
    ]);
    await expect(page.locator('.profile-header h2')).toHaveText(firstUser.name);

    // Exclusão da conta
    await page.locator('.danger-zone button.danger').first().click();
    await page.locator('.danger-form input[name="email"]').fill(primaryEmail);
    await page.locator('.danger-form input[name="password"]').fill(newPassword);
    await Promise.all([
      page.waitForURL('**/'),
      page.locator('.danger-form button.danger').click(),
    ]);
  });
});
