require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');

const { run, get, all } = require('./db');
const { authenticate, JWT_SECRET } = require('./auth');
const { sendPasswordResetEmail } = require('./mailer');

const app = express();
const PORT = process.env.PORT || 4000;
const clientOrigins = (process.env.CLIENT_BASE_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(cors({ origin: clientOrigins, credentials: false }));
app.use(express.json());

const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;


const generateReferralCode = async () => {
  while (true) {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const existing = await get('SELECT id FROM users WHERE referral_code = ?', [code]);
    if (!existing) {
      return code;
    }
  }
};

const generateRecommendedPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789@$!%*?&';
  const bytes = randomBytes(16);
  let password = '';
  for (let i = 0; i < bytes.length; i += 1) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
};

const evaluatePassword = (password = '') => {
  const length = password.length;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const uniqueChars = new Set(password).size;

  let score = Math.min(length, 20) * 2; // up to 40
  if (hasLower) score += 10;
  if (hasUpper) score += 10;
  if (hasNumber) score += 10;
  if (hasSymbol) score += 10;
  if (length >= 12) score += 15;
  else if (length >= 8) score += 8;
  if (uniqueChars >= Math.max(4, Math.floor(length * 0.6))) {
    score += 5;
  }

  score = Math.min(score, 100);

  let strength = 'weak';
  if (score >= 70) {
    strength = 'strong';
  } else if (score >= 45) {
    strength = 'medium';
  }

  const issues = [];
  if (length < 12) issues.push('minLength');
  if (!hasLower) issues.push('lowercase');
  if (!hasUpper) issues.push('uppercase');
  if (!hasNumber) issues.push('number');
  if (!hasSymbol) issues.push('symbol');
  if (uniqueChars < Math.max(4, Math.floor(length * 0.5))) issues.push('diversity');

  return {
    length,
    hasLower,
    hasUpper,
    hasNumber,
    hasSymbol,
    uniqueChars,
    score,
    strength,
    issues,
  };
};

const checkPasswordReuse = async (password) => {
  if (!password) return false;
  const hashes = await all('SELECT password_hash FROM users');
  for (const row of hashes) {
    // eslint-disable-next-line no-await-in-loop
    const match = await bcrypt.compare(password, row.password_hash);
    if (match) {
      return true;
    }
  }
  return false;
};

const buildReferralLink = (code) => {
  const baseUrl = clientOrigins[0] || 'http://localhost:5173';
  return `${baseUrl.replace(/\/$/, '')}/?ref=${code}`;
};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/password-strength', async (req, res) => {
  const { password = '' } = req.body || {};

  const metrics = evaluatePassword(password);
  try {
    const reused = await checkPasswordReuse(password);
    return res.json({
      ...metrics,
      reused,
      recommendedPassword: generateRecommendedPassword(),
    });
  } catch (err) {
    console.error('Erro ao avaliar senha:', err);
    return res.status(500).json({ message: 'Erro ao avaliar senha.' });
  }
});

app.post('/api/password-reset/request', async (req, res) => {
  const { email = '' } = req.body || {};
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
    return res.status(200).json({ message: 'Se o e-mail existir, enviaremos um código.' });
  }

  try {
    const user = await get('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (!user) {
      return res.status(200).json({ message: 'Se o e-mail existir, enviaremos um código.' });
    }

    const code = (`000000${Math.floor(Math.random() * 1_000_000)}`).slice(-6);
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await run('DELETE FROM password_resets WHERE email = ?', [normalizedEmail]);
    await run(
      'INSERT INTO password_resets (email, code_hash, expires_at) VALUES (?, ?, ?)',
      [normalizedEmail, codeHash, expiresAt],
    );

    await sendPasswordResetEmail(normalizedEmail, code);

    return res.json({ message: 'Se o e-mail existir, enviaremos um código.' });
  } catch (err) {
    console.error('Erro ao solicitar redefinição de senha:', err);
    return res.status(500).json({ message: 'Erro ao processar a solicitação.' });
  }
});

app.post('/api/password-reset/confirm', async (req, res) => {
  const { email = '', code = '', password = '' } = req.body || {};
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ message: 'Informe um e-mail válido.' });
  }

  if (!code || code.length !== 6) {
    return res.status(400).json({ message: 'Código inválido.' });
  }

  if (!passwordRegex.test(password)) {
    return res.status(400).json({ message: 'A senha deve ter no mínimo 8 caracteres, incluindo letras e números.' });
  }

  try {
    const reset = await get(
      'SELECT * FROM password_resets WHERE email = ? ORDER BY created_at DESC LIMIT 1',
      [normalizedEmail],
    );

    if (!reset) {
      return res.status(400).json({ message: 'Código inválido ou expirado.' });
    }

    if (new Date(reset.expires_at).getTime() < Date.now()) {
      await run('DELETE FROM password_resets WHERE email = ?', [normalizedEmail]);
      return res.status(400).json({ message: 'Código inválido ou expirado.' });
    }

    const codeMatches = await bcrypt.compare(code, reset.code_hash);
    if (!codeMatches) {
      return res.status(400).json({ message: 'Código inválido ou expirado.' });
    }

    const user = await get('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (!user) {
      return res.status(400).json({ message: 'Usuário não encontrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, user.id]);
    await run('DELETE FROM password_resets WHERE email = ?', [normalizedEmail]);

    return res.json({ message: 'Senha atualizada com sucesso.' });
  } catch (err) {
    console.error('Erro ao confirmar redefinição de senha:', err);
    return res.status(500).json({ message: 'Erro ao redefinir senha.' });
  }
});

app.post('/api/register', async (req, res) => {
  const {
    name,
    email,
    password,
    referralCode: providedReferral,
  } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Nome, e-mail e senha são obrigatórios.' });
  }

  const trimmedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!trimmedName || trimmedName.length > 80 || /[^A-Za-zÀ-ÖØ-öø-ÿ'\s]/.test(trimmedName)) {
    return res.status(400).json({ message: 'Informe um nome válido.' });
  }

  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ message: 'Informe um e-mail válido.' });
  }

  if (!passwordRegex.test(password) || password.length > 128) {
    return res.status(400).json({ message: 'A senha deve ter no mínimo 8 caracteres, incluindo letras e números.' });
  }

  try {
    const existingUser = await get('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
    if (existingUser) {
      return res.status(409).json({ message: 'Já existe um usuário cadastrado com esse e-mail.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newReferralCode = await generateReferralCode();

    let referrer = null;
    if (providedReferral) {
      referrer = await get('SELECT id FROM users WHERE referral_code = ?', [providedReferral.trim().toUpperCase()]);
    }

    const insert = await run(
      'INSERT INTO users (name, email, password_hash, referral_code, referred_by) VALUES (?, ?, ?, ?, ?)',
      [trimmedName, normalizedEmail, hashedPassword, newReferralCode, referrer ? referrer.id : null],
    );

    if (referrer) {
      await run('UPDATE users SET points = points + 1 WHERE id = ?', [referrer.id]);
    }

    const token = jwt.sign({ userId: insert.id }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      token,
      user: {
        id: insert.id,
        name: trimmedName,
        email: normalizedEmail,
        points: 0,
        referralCode: newReferralCode,
        referralLink: buildReferralLink(newReferralCode),
      },
    });
  } catch (err) {
    console.error('Erro no cadastro:', err);
    return res.status(500).json({ message: 'Erro ao cadastrar usuário.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Informe e-mail e senha.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await get('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        points: user.points,
        referralCode: user.referral_code,
        referralLink: buildReferralLink(user.referral_code),
      },
    });
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ message: 'Erro ao realizar login.' });
  }
});

app.get('/api/me', authenticate, async (req, res) => {
  try {
    const user = await get('SELECT id, name, email, points, referral_code FROM users WHERE id = ?', [req.userId]);

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      points: user.points,
      referralCode: user.referral_code,
      referralLink: buildReferralLink(user.referral_code),
    });
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    return res.status(500).json({ message: 'Erro ao buscar dados do usuário.' });
  }
});

app.delete('/api/me', authenticate, async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Informe e-mail e senha para confirmar.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    if (user.email !== normalizedEmail) {
      return res.status(400).json({ message: 'E-mail não corresponde à conta autenticada.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Senha incorreta.' });
    }

    await run('UPDATE users SET referred_by = NULL WHERE referred_by = ?', [user.id]);
    await run('DELETE FROM users WHERE id = ?', [user.id]);

    return res.json({ message: 'Conta excluída com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir conta:', err);
    return res.status(500).json({ message: 'Erro ao excluir conta.' });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor iniciado na porta ${PORT}`);
  });
}

module.exports = app;
