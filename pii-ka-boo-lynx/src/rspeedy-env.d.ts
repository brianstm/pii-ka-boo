/// <reference types="@lynx-js/rspeedy/client" />

declare namespace JSX {
  interface IntrinsicElements {
    input: {
      className?: string;
      value?: string;
      placeholder?: string;
      type?: string;
      confirmType?: string;
      bindinput?: (e: { detail: { value: string } }) => void;
      bindconfirm?: () => void;
      bindtap?: () => void;
    };
    "text-input": {
      className?: string;
      value?: string;
      placeholder?: string;
      type?: string;
      confirmType?: string;
      bindinput?: (e: { detail: { value: string } }) => void;
      bindconfirm?: () => void;
      bindtap?: () => void;
    };
    image: {
      src?: string;
      className?: string;
      style?: string;
      width?: string | number;
      height?: string | number;
      alt?: string;
    };
  }
}
