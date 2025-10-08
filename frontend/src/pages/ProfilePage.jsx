import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { deleteAccount } from '../api/client.js';
import { useTranslation } from '../hooks/useTranslation.js';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, loading, logout, token } = useAuth();
  const { t } = useTranslation();
  const [copyState, setCopyState] = useState('');
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteForm, setDeleteForm] = useState({ email: '', password: '' });
  const [deleteErrors, setDeleteErrors] = useState({});
  const [deleteAlert, setDeleteAlert] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const normalizedUserEmail = useMemo(() => user?.email?.trim().toLowerCase() ?? '', [user]);
  const referrals = user?.referrals ?? [];

  useEffect(() => {
    if (!loading && !user) {
      navigate('/', { replace: true });
    }
  }, [loading, user, navigate]);

  const handleCopy = async () => {
    if (!user) return;
    try {
      await navigator.clipboard.writeText(user.referralLink);
      setCopyState(t('profile.copied'));
    } catch (err) {
      console.error('Falha ao copiar link:', err);
      setCopyState(t('profile.copyError'));
    }
    setTimeout(() => setCopyState(''), 3000);
  };

  const toggleDeleteMode = () => {
    setDeleteMode((prev) => {
      const next = !prev;
      if (!next) {
        resetDeleteState();
      }
      return next;
    });
  };

  const resetDeleteState = () => {
    setDeleteForm({ email: '', password: '' });
    setDeleteErrors({});
    setDeleteAlert('');
  };

  const handleDeleteChange = (event) => {
    const { name, value } = event.target;
    setDeleteForm((prev) => ({ ...prev, [name]: value }));
    setDeleteErrors((prev) => ({ ...prev, [name]: '' }));
    setDeleteAlert('');
  };

  const validateDelete = () => {
    if (!user) return false;
    const errors = {};
    let isValid = true;

    const typedEmail = deleteForm.email.trim().toLowerCase();
    if (!typedEmail) {
      errors.email = t('profile.validation.emailRequired');
      isValid = false;
    } else if (typedEmail !== normalizedUserEmail) {
      errors.email = t('profile.validation.emailMismatch');
      isValid = false;
    }

    if (!deleteForm.password) {
      errors.password = t('profile.validation.passwordRequired');
      isValid = false;
    }

    setDeleteErrors(errors);
    return isValid;
  };

  const handleDelete = async (event) => {
    event.preventDefault();
    if (!validateDelete()) return;

    if (!token) {
      setDeleteAlert(t('profile.sessionExpired'));
      return;
    }

    setIsDeleting(true);
    setDeleteAlert('');

    try {
      await deleteAccount({
        email: deleteForm.email.trim(),
        password: deleteForm.password,
      }, token);

      resetDeleteState();
      logout();
      navigate('/', { replace: true, state: { accountDeleted: true } });
    } catch (err) {
      setDeleteAlert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="auth-card">
        <p className="loading">{t('app.loading')}</p>
      </div>
    );
  }

  return (
    <div className="profile-card">
      <div className="profile-header">
        <div>
          <p className="welcome">{t('profile.welcome')}</p>
          <h2>{user.name}</h2>
        </div>
        <button type="button" className="ghost" onClick={logout}>
          {t('profile.logout')}
        </button>
      </div>
      <div className="score">
        <span>{t('profile.scoreLabel')}</span>
        <strong>{user.points}</strong>
      </div>
      <div className="referral">
        <span>{t('profile.referralLabel')}</span>
        <code>{user.referralLink}</code>
        <button type="button" className="primary" onClick={handleCopy}>
          {t('profile.copy')}
        </button>
        {copyState ? <small className="copy-feedback">{copyState}</small> : null}
      </div>
      <p className="hint">
        {t('profile.shareHint')}
      </p>
      <div className="referral-history">
        <h3>{t('profile.referralsTitle')}</h3>
        {referrals.length === 0 ? (
          <p className="hint empty-referrals">{t('profile.referralsEmpty')}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t('profile.referralsDate')}</th>
                <th>{t('profile.referralsEmail')}</th>
                <th>{t('auth.register.nameLabel')}</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((referral) => (
                <tr key={`${referral.email}-${referral.created_at}`}>
                  <td>{new Date(referral.created_at).toLocaleDateString()}</td>
                  <td>{referral.email}</td>
                  <td>{referral.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="danger-zone">
        <h3>{t('profile.dangerTitle')}</h3>
        <p className="hint">{t('profile.dangerDescription')}</p>
        {!deleteMode ? (
          <button type="button" className="danger" onClick={toggleDeleteMode}>
            {t('profile.dangerOpen')}
          </button>
        ) : (
          <form className="danger-form" onSubmit={handleDelete}>
            <label className="field">
              <span>{t('profile.confirmEmail')}</span>
              <input
                type="email"
                name="email"
                value={deleteForm.email}
                onChange={handleDeleteChange}
                autoComplete="email"
              />
              {deleteErrors.email ? <small>{deleteErrors.email}</small> : null}
            </label>
            <label className="field">
              <span>{t('profile.confirmPassword')}</span>
              <input
                type="password"
                name="password"
                value={deleteForm.password}
                onChange={handleDeleteChange}
                autoComplete="current-password"
              />
              {deleteErrors.password ? <small>{deleteErrors.password}</small> : null}
            </label>
            <div className="danger-actions">
              <button type="button" className="ghost" onClick={toggleDeleteMode} disabled={isDeleting}>
                {t('profile.cancel')}
              </button>
              <button type="submit" className="danger" disabled={isDeleting}>
                {isDeleting ? t('profile.deleting') : t('profile.confirmDelete')}
              </button>
            </div>
            {deleteAlert ? <p className="form-alert">{deleteAlert}</p> : null}
          </form>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
