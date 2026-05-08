import Image from "next/image";
import Link from "next/link";

import { getFlowLabLogoAsset } from "@flowlab/branding";

export function FlowLabBrandLink() {
  return (
    <Link href="/" className="marketing-nav__brand" aria-label="FlowLab Solutions">
      <Image
        src={getFlowLabLogoAsset("light")}
        alt="FlowLab Solutions"
        width={180}
        height={44}
        priority
        className="brand-logo"
      />
    </Link>
  );
}
