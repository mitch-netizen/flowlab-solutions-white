import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FlowLab Mobile Job App",
    short_name: "FlowLab",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#08111c",
    theme_color: "#0ea5e9",
    icons: []
  };
}
