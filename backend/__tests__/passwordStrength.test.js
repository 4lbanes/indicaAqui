const request = require('supertest');
const bcrypt = require('bcryptjs');

jest.mock('../src/mailer.js', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(),
}));

const app = require('../src/index.js');
const { run, db } = require('../src/db.js');
const { sendPasswordResetEmail } = require('../src/mailer.js');

beforeEach(async () => {
  await run('DELETE FROM password_resets');
  await run('DELETE FROM users');
});

describe('POST /api/password-strength', () => {
  test('returns weak classification for simple password', async () => {
    const response = await request(app)
      .post('/api/password-strength')
      .send({ password: 'abc123' })
      .expect(200);

    expect(response.body.strength).toBe('weak');
    expect(response.body.score).toBeLessThan(45);
    expect(Array.isArray(response.body.issues)).toBe(true);
  });

  test('returns strong classification for complex password', async () => {
    const response = await request(app)
      .post('/api/password-strength')
      .send({ password: 'Abc123!@#xyzLMN' })
      .expect(200);

    expect(response.body.strength).toBe('strong');
    expect(response.body.score).toBeGreaterThanOrEqual(70);
    expect(response.body.issues.length).toBeLessThanOrEqual(1);
    expect(typeof response.body.recommendedPassword).toBe('string');
    expect(response.body.recommendedPassword.length).toBeGreaterThanOrEqual(12);
  });

  test('detects reused password stored in database', async () => {
    const email = 'tester@example.com';
    const password = 'ReuseMe123!';
    const hash = await bcrypt.hash(password, 10);
    const referralCode = Date.now().toString(36).slice(-6).toUpperCase();
    await run(
      'INSERT INTO users (name, email, password_hash, referral_code) VALUES (?, ?, ?, ?)',
      ['Tester', email, hash, referralCode],
    );

    const response = await request(app)
      .post('/api/password-strength')
      .send({ password })
      .expect(200);

    expect(response.body.reused).toBe(true);
  });

});

describe('POST /api/password-reset', () => {
  const email = 'reset@example.com';
  const originalPassword = 'Original123!';

  beforeEach(async () => {
    const hash = await bcrypt.hash(originalPassword, 10);
    const referralCode = Date.now().toString(36).slice(-6).toUpperCase();
    await run(
      'INSERT INTO users (name, email, password_hash, referral_code) VALUES (?, ?, ?, ?)',
      ['Reset User', email, hash, referralCode],
    );
  });

  test('sends reset email for known user', async () => {
    sendPasswordResetEmail.mockClear();

    await request(app)
      .post('/api/password-reset/request')
      .send({ email })
      .expect(200);

    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      email,
      expect.any(String),
    );
  });

  test('completes password reset flow', async () => {
    sendPasswordResetEmail.mockClear();

    await request(app)
      .post('/api/password-reset/request')
      .send({ email })
      .expect(200);

    const latestCall = sendPasswordResetEmail.mock.calls.at(-1);
    const code = latestCall ? latestCall[1] : null;
    expect(code).toBeTruthy();

    const newPassword = 'NovaSenha123!';
    await request(app)
      .post('/api/password-reset/confirm')
      .send({ email, code, password: newPassword })
      .expect(200);

    await request(app)
      .post('/api/login')
      .send({ email, password: newPassword })
      .expect(200);
  });
});

afterAll(() => {
  db.close();
});
