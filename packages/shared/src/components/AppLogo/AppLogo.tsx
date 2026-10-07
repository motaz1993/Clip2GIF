import Clip2GIFLogo from '@shared/assets/clip2gif-logo.svg?react';

import css from './AppLogo.module.css';

interface AppLogoProps {
  className?: string;
}

export function AppLogo({ className: _className, ...restProps }: AppLogoProps) {
  return (
    <span className={css.appLogo} {...restProps}>
      <Clip2GIFLogo className={css.logo} />
    </span>
  );
}
