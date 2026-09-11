import * as React from "react";
import SuiteIcon from "../suite-icon";
export default function PlaceholderTool() {
  return <div className="suite-placeholder"><span className="suite-placeholder-symbol"><SuiteIcon name="box" size={28}/></span><h3>Still an open space.</h3><p>This panel is deliberately unassigned. Use it to test opening, closing and hiding a tool.</p><span className="suite-placeholder-caption">No data · no requests · no actions</span></div>;
}
