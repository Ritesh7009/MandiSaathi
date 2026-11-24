import React, { createContext, useContext, useState, useCallback, forwardRef } from 'react';
import { Link as RouterLink, type LinkProps as RouterLinkProps } from 'react-router-dom';
import { Theme } from '@astryxdesign/core/theme';
import { LinkProvider } from '@astryxdesign/core/Link';
import { mandisaathiTheme } from '../themes/mandisaathi/mandisaathi';
import { useTheme } from '../context/ThemeContext';
import { AgrarianCommandPalette } from './AgrarianCommandPalette';

interface CommandSpotlightContextValue {
  isOpen: boolean;
  openSpotlight: () => void;
  closeSpotlight: () => void;
}

const CommandSpotlightContext = createContext<CommandSpotlightContextValue>({
  isOpen: false,
  openSpotlight: () => undefined,
  closeSpotlight: () => undefined,
});

export const useCommandSpotlight = () => useContext(CommandSpotlightContext);

interface AstryxLinkAdapterProps extends Omit<RouterLinkProps, 'to'> {
  href?: string;
}

const AstryxRouterLink = forwardRef<HTMLAnchorElement, AstryxLinkAdapterProps>(
  ({ href = '#', target, rel, ...rest }, ref) => {
    const isExternal =
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:');

    if (isExternal || href.startsWith('#')) {
      return (
        <a
          ref={ref}
          href={href}
          target={target}
          rel={target === '_blank' ? rel || 'noopener noreferrer' : rel}
          {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        />
      );
    }

    return <RouterLink ref={ref} to={href} target={target} rel={rel} {...rest} />;
  }
);

AstryxRouterLink.displayName = 'AstryxRouterLink';

export const AstryxRootProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const openSpotlight = useCallback(() => setIsOpen(true), []);
  const closeSpotlight = useCallback(() => setIsOpen(false), []);

  return (
    <Theme theme={mandisaathiTheme} mode={theme}>
      <LinkProvider component={AstryxRouterLink}>
        <CommandSpotlightContext.Provider value={{ isOpen, openSpotlight, closeSpotlight }}>
          {children}
          <AgrarianCommandPalette isOpen={isOpen} onOpenChange={setIsOpen} />
        </CommandSpotlightContext.Provider>
      </LinkProvider>
    </Theme>
  );
};

