/* eslint-disable import/prefer-default-export */
export const currentProvider = (state) => {
  if (state.session.provider === 'metamask') {
    return window.web3.currentProvider;
  }
  return state.session.web3Provider;
};

export default currentProvider;
