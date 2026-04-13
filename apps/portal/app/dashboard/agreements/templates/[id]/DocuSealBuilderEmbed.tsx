"use client";

import Script from "next/script";
import { createElement, type HTMLAttributes } from "react";

interface DocuSealBuilderAttributes extends HTMLAttributes<HTMLElement> {
  "data-token": string;
  "data-roles": string;
  "data-submitters": string;
  "data-required-fields": string;
}

export default function DocuSealBuilderEmbed(props: {
  token: string;
  roles: string[];
  requiredFields: Array<{ name: string; type: string | string[]; role?: string }>;
  submitters: Array<{ role: string; name?: string; email?: string }>;
}) {
  return (
    <>
      <Script src="https://cdn.docuseal.com/js/builder.js" strategy="afterInteractive" />
      {createElement("docuseal-builder", {
        "data-token": props.token,
        "data-roles": props.roles.join(","),
        "data-submitters": JSON.stringify(props.submitters),
        "data-required-fields": JSON.stringify(props.requiredFields),
        style: {
          display: "block",
          width: "100%",
          minHeight: "78vh",
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(148, 163, 184, 0.16)"
        }
      } as DocuSealBuilderAttributes)}
    </>
  );
}
