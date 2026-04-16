import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    rules: {
      // Date.now() / new Date() in Server Components is fine — purity rule
      // targets client hooks, not async server functions.
      "react-hooks/purity": "off",
      // Readable prose in JSX shouldn't require HTML entities for apostrophes.
      "react/no-unescaped-entities": "off",
    },
  },
];

export default config;
