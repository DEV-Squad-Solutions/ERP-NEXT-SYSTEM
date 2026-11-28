const base = { viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true" };

export const Facebook = ({ size = 16 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M13.5 22v-8.2h2.8l.5-3.3h-3.3V8.4c0-.9.4-1.7 1.8-1.7h1.6V3.8S15.6 3.5 14.4 3.5c-2.6 0-4.2 1.6-4.2 4.4v2.6H7.5v3.3h2.7V22h3.3z" />
  </svg>
);
export const Linkedin = ({ size = 16 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M4.5 9h3.7v11.5H4.5V9zm1.9-5.5a2.1 2.1 0 110 4.2 2.1 2.1 0 010-4.2zM10.5 9h3.5v1.6h.1c.5-.9 1.7-1.9 3.5-1.9 3.7 0 4.4 2.4 4.4 5.6v6.2h-3.7v-5.5c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.6h-3.7V9z" />
  </svg>
);
