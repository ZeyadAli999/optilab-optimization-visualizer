declare module "react-plotly.js" {
  import type { ComponentType } from "react";

  const Plot: ComponentType<{
    data: any[];
    layout?: any;
    config?: any;
    className?: string;
    style?: any;
    useResizeHandler?: boolean;
  }>;

  export default Plot;
}
