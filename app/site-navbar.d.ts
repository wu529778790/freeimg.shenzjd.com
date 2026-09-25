import 'react'

// site-navbar 为外部 Web Component（site-navbar.wc.js）
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'site-navbar': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >
    }
  }
}
