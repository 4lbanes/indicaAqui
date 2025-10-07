import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loginUser, registerUser, evaluatePassword } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../hooks/useTranslation.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
const SLIDER_KNOB_SIZE = 64;

const AuthPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get('view') === 'login' ? 'login' : 'register';

  const [mode, setMode] = useState(initialMode);
  const [dragValue, setDragValue] = useState(initialMode === 'login' ? 1 : 0);
  const [dragging, setDragging] = useState(false);
  const sliderRef = useRef(null);
  const [trackWidth, setTrackWidth] = useState(0);

  const [registerValues, setRegisterValues] = useState({ name: '', email: '', password: '' });
  const [registerErrors, setRegisterErrors] = useState({});
  const [registerAlert, setRegisterAlert] = useState('');
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  const [registerShowPassword, setRegisterShowPassword] = useState(false);
  const [passwordMetrics, setPasswordMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const metricsTimeoutRef = useRef(null);

  const [loginValues, setLoginValues] = useState({ email: '', password: '' });
  const [loginErrors, setLoginErrors] = useState({});
  const [loginAlert, setLoginAlert] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginShowPassword, setLoginShowPassword] = useState(false);

  const referralCode = useMemo(() => {
    const code = searchParams.get('ref');
    return code ? code.trim().toUpperCase() : '';
  }, [searchParams]);

  const handleModeChange = useCallback((nextMode) => {
    setMode(nextMode);
    const next = new URLSearchParams(searchParams);
    if (nextMode === 'login') {
      next.set('view', 'login');
    } else {
      next.delete('view');
    }
    if (referralCode) {
      next.set('ref', referralCode);
    } else {
      next.delete('ref');
    }
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [referralCode, searchParams, setSearchParams]);

  useEffect(() => {
    const element = sliderRef.current;
    if (!element) return;

    const updateWidth = () => {
      setTrackWidth(element.offsetWidth || 0);
    };

    updateWidth();

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(updateWidth);
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const updateDrag = useCallback((clientX) => {
    const element = sliderRef.current;
    if (!element) return 0;
    const rect = element.getBoundingClientRect();
    const travel = Math.max(rect.width - SLIDER_KNOB_SIZE, 0);
    if (travel === 0) {
      setDragValue(0);
      return 0;
    }
    const relative = (clientX - rect.left - SLIDER_KNOB_SIZE / 2) / travel;
    const clamped = Math.min(Math.max(relative, 0), 1);
    setDragValue(clamped);
    return clamped;
  }, [dragValue]);

  const handleThumbPointerDown = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(true);
    updateDrag(event.clientX);
  };

  const handleTrackPointerDown = (event) => {
    if (event.target.closest('.mode-slider-thumb')) {
      return;
    }
    event.preventDefault();
    const value = updateDrag(event.clientX);
    handleModeChange(value > 0.5 ? 'login' : 'register');
  };

  useEffect(() => {
    if (!dragging) {
      setDragValue(mode === 'login' ? 1 : 0);
    }
  }, [mode, dragging]);

  useEffect(() => () => {
    if (metricsTimeoutRef.current) {
      clearTimeout(metricsTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (metricsTimeoutRef.current) {
      clearTimeout(metricsTimeoutRef.current);
    }

    if (!registerValues.password) {
      setPasswordMetrics(null);
      setMetricsLoading(false);
      return;
    }

    metricsTimeoutRef.current = setTimeout(async () => {
      try {
        setMetricsLoading(true);
        const result = await evaluatePassword({ password: registerValues.password });
        setPasswordMetrics(result);
      } catch (err) {
        console.error('Erro ao avaliar senha:', err);
        setPasswordMetrics(null);
      } finally {
        setMetricsLoading(false);
      }
    }, 350);
  }, [registerValues.password]);

  useEffect(() => {
    if (!dragging) return undefined;

    const handleMove = (event) => {
      updateDrag(event.clientX);
    };

    const handleUp = (event) => {
      const finalValue = updateDrag(event.clientX);
      setDragging(false);
      handleModeChange(finalValue > 0.5 ? 'login' : 'register');
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragging, handleModeChange, updateDrag]);

  const registerHandleChange = (event) => {
    const { name, value } = event.target;
    setRegisterValues((prev) => ({ ...prev, [name]: value }));
    setRegisterErrors((prev) => ({ ...prev, [name]: '' }));
    setRegisterAlert('');
  };

  const loginHandleChange = (event) => {
    const { name, value } = event.target;
    setLoginValues((prev) => ({ ...prev, [name]: value }));
    setLoginErrors((prev) => ({ ...prev, [name]: '' }));
    setLoginAlert('');
  };

  const handleForgotPassword = () => {
    window.alert(t('auth.login.forgotMessage'));
  };

  const validateRegister = () => {
    const errors = {};
    if (!registerValues.name.trim()) {
      errors.name = t('auth.validation.name');
    }
    if (!emailRegex.test(registerValues.email.trim().toLowerCase())) {
      errors.email = t('auth.validation.email');
    }
    if (!passwordRegex.test(registerValues.password)) {
      errors.password = t('auth.validation.passwordRegister');
    }
    setRegisterErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateLogin = () => {
    const errors = {};
    if (!emailRegex.test(loginValues.email.trim().toLowerCase())) {
      errors.email = t('auth.validation.email');
    }
    if (!loginValues.password) {
      errors.password = t('auth.validation.passwordLogin');
    }
    setLoginErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    if (!validateRegister()) return;

    setRegisterSubmitting(true);
    setRegisterAlert('');

    try {
      const payload = {
        name: registerValues.name.trim(),
        email: registerValues.email.trim(),
        password: registerValues.password,
      };
      if (referralCode) {
        payload.referralCode = referralCode;
      }
      const data = await registerUser(payload);
      login(data.token, data.user);
      navigate('/profile', { replace: true });
    } catch (err) {
      setRegisterAlert(err.message);
    } finally {
      setRegisterSubmitting(false);
    }
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    if (!validateLogin()) return;

    setLoginSubmitting(true);
    setLoginAlert('');

    try {
      const data = await loginUser({
        email: loginValues.email.trim(),
        password: loginValues.password,
      });
      login(data.token, data.user);
      navigate('/profile', { replace: true });
    } catch (err) {
      setLoginAlert(err.message);
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleThumbKeyDown = (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      handleModeChange('login');
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      handleModeChange('register');
    }
  };

  const knobOffset = Math.max(trackWidth - SLIDER_KNOB_SIZE, 0) * dragValue;
  const rotationDegrees = dragValue * 180;

  const registerSideActive = dragValue < 0.5;
  const loginSideActive = dragValue >= 0.5;

  return (
    <div className="auth-card">
      <h1 className="brand">{t('app.name')}</h1>
      <p className="tagline">{t('app.tagline')}</p>
      <div
        className={`mode-slider${dragging ? ' dragging' : ''}`}
        role="group"
        aria-label={t('auth.slider.aria')}
      >
        <div
          className="mode-slider-track"
          ref={sliderRef}
          style={{ '--slider-progress': dragValue, '--knob-offset': `${knobOffset}px` }}
          onPointerDown={handleTrackPointerDown}
        >
          <span className={`mode-slider-label left${mode === 'register' ? ' active' : ''}`}>
            {t('auth.slider.register')}
          </span>
          <span className={`mode-slider-label right${mode === 'login' ? ' active' : ''}`}>
            {t('auth.slider.login')}
          </span>
          <button
            type="button"
            className={`mode-slider-thumb ${mode}`}
            onPointerDown={handleThumbPointerDown}
            onKeyDown={handleThumbKeyDown}
            aria-label={mode === 'register' ? 'Modo cadastro selecionado. Arraste para acessar o login.' : 'Modo login selecionado. Arraste para acessar o cadastro.'}
          >
            <span className="mode-slider-thumb-icon" aria-hidden="true">↔︎</span>
          </button>
        </div>
      </div>
      <div className="flip-card">
        <div
          className={`flip-card-inner${dragging ? ' dragging' : ''}`}
          style={{ transform: `rotateY(${rotationDegrees}deg)` }}
        >
          <div
            className="flip-card-face flip-card-front"
            style={{ pointerEvents: registerSideActive ? 'auto' : 'none' }}
            aria-hidden={!registerSideActive}
          >
            {referralCode ? (
              <div className="referral-banner">
                {t('auth.invitationBanner')}
                {' '}
                <strong>{referralCode}</strong>
              </div>
            ) : null}
            <form className="form" onSubmit={handleRegisterSubmit} noValidate>
              <label className="field">
                <span>{t('auth.register.nameLabel')}</span>
                <input
                  name="name"
                  type="text"
                  placeholder={t('auth.register.namePlaceholder')}
                  value={registerValues.name}
                  onChange={registerHandleChange}
                  autoComplete="name"
                  disabled={registerSubmitting}
                />
                {registerErrors.name ? <small>{registerErrors.name}</small> : null}
              </label>
              <label className="field">
                <span>{t('auth.register.emailLabel')}</span>
                <input
                  name="email"
                  type="email"
                  placeholder={t('auth.register.emailPlaceholder')}
                  value={registerValues.email}
                  onChange={registerHandleChange}
                  autoComplete="email"
                  disabled={registerSubmitting}
                />
                {registerErrors.email ? <small>{registerErrors.email}</small> : null}
              </label>
              <label className="field">
                <span>{t('auth.register.passwordLabel')}</span>
                <div className="password-input">
                  <input
                    name="password"
                    type={registerShowPassword ? 'text' : 'password'}
                    placeholder={t('auth.register.passwordPlaceholder')}
                    value={registerValues.password}
                    onChange={registerHandleChange}
                    autoComplete="new-password"
                    disabled={registerSubmitting}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setRegisterShowPassword((prev) => !prev)}
                    aria-label={registerShowPassword ? t('buttons.hide') : t('buttons.show')}
                    disabled={registerSubmitting}
                  >
                    {registerShowPassword ? t('buttons.hide') : t('buttons.show')}
                  </button>
                </div>
                {registerErrors.password ? <small>{registerErrors.password}</small> : null}
              </label>
              {metricsLoading ? (
                <p className="password-strength-loading">{t('auth.passwordStrength.generating')}</p>
              ) : null}
              {passwordMetrics ? (
                <div className="password-strength">
                  <div className={`password-meter password-${passwordMetrics.strength}`}>
                    <div
                      className="password-meter-bar"
                      style={{ width: `${Math.max(passwordMetrics.score, 8)}%` }}
                    />
                  </div>
                  <div className="password-meter-info">
                    <span className={`password-strength-label password-${passwordMetrics.strength}`}>
                      {t(`auth.passwordStrength.${passwordMetrics.strength}`)}
                    </span>
                  </div>
                  <div className="password-suggestions">
                    <span className="password-suggestions-title">{t('auth.passwordStrength.title')}</span>
                    {passwordMetrics.issues.length ? (
                      <ul>
                        {passwordMetrics.issues.map((issue) => (
                          <li key={issue}>{t(`auth.passwordStrength.issues.${issue}`)}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>{t('auth.passwordStrength.defaultSuggestion')}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="ghost suggestion"
                    onClick={() => setRegisterValues((prev) => ({ ...prev, password: passwordMetrics.recommendedPassword }))}
                    disabled={registerSubmitting}
                  >
                    {t('auth.passwordStrength.recommendation')}
                  </button>
                </div>
              ) : null}
              <button type="submit" className="primary" disabled={registerSubmitting}>
                {registerSubmitting ? t('auth.register.submitting') : t('auth.register.submit')}
              </button>
              {registerAlert ? <p className="form-alert">{registerAlert}</p> : null}
            </form>
            <p className="hint">
              {t('auth.register.hint')}
              {' '}
              <button
                type="button"
                className="link-button"
                onClick={() => handleModeChange('login')}
                disabled={registerSubmitting}
              >
                {t('auth.register.hintAction')}
              </button>
            </p>
          </div>
          <div
            className="flip-card-face flip-card-back"
            style={{ pointerEvents: loginSideActive ? 'auto' : 'none' }}
            aria-hidden={!loginSideActive}
          >
            <form className="form" onSubmit={handleLoginSubmit} noValidate>
              <label className="field">
                <span>{t('auth.login.emailLabel')}</span>
                <input
                  name="email"
                  type="email"
                  placeholder={t('auth.login.emailPlaceholder')}
                  value={loginValues.email}
                  onChange={loginHandleChange}
                  autoComplete="email"
                  disabled={loginSubmitting}
                />
                {loginErrors.email ? <small>{loginErrors.email}</small> : null}
              </label>
              <label className="field">
                <span>{t('auth.login.passwordLabel')}</span>
                <div className="password-input">
                  <input
                    name="password"
                    type={loginShowPassword ? 'text' : 'password'}
                    placeholder={t('auth.login.passwordPlaceholder')}
                    value={loginValues.password}
                    onChange={loginHandleChange}
                    autoComplete="current-password"
                    disabled={loginSubmitting}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setLoginShowPassword((prev) => !prev)}
                    aria-label={loginShowPassword ? t('buttons.hide') : t('buttons.show')}
                    disabled={loginSubmitting}
                  >
                    {loginShowPassword ? t('buttons.hide') : t('buttons.show')}
                  </button>
                </div>
                {loginErrors.password ? <small>{loginErrors.password}</small> : null}
              </label>
              <button
                type="button"
                className="forgot-password"
                onClick={handleForgotPassword}
              >
                {t('auth.login.forgot')}
              </button>
              <button type="submit" className="primary" disabled={loginSubmitting}>
                {loginSubmitting ? t('auth.login.submitting') : t('auth.login.submit')}
              </button>
              {loginAlert ? <p className="form-alert">{loginAlert}</p> : null}
            </form>
            <p className="hint">
              {t('auth.login.hint')}
              {' '}
              <button
                type="button"
                className="link-button"
                onClick={() => handleModeChange('register')}
                disabled={loginSubmitting}
              >
                {t('auth.login.hintAction')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
