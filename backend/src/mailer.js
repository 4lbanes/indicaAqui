const sendPasswordResetEmail = async (to, code) => {
  console.log('[Password Reset] Código para %s: %s', to, code);
};

module.exports = {
  sendPasswordResetEmail,
};
