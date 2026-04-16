import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    rules: {
      // Date.now() / new Date() in Server Components is fine — purity rule
      // targets client hooks, not async server functions.
      "react-hooks/purity": "off",
      // Marketing copy legitimately contains apostrophes; escaping every one
      // makes the source harder to read without any runtime benefit.
      "react/no-unescaped-entities": "off",
    },
  },
];

export default config;
