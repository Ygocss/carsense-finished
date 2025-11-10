import type { ReactNode } from "react";

export default function EmptyState(
  {title, subtitle, cta}:{title:string; subtitle?:string; cta?:ReactNode;}
){
  return (
    <div className="panel" style={{textAlign:"center", padding:"32px"}}>
      <div className="badge">CarSense</div>
      <h3 style={{margin:"12px 0 6px"}}>{title}</h3>
      {subtitle && <div className="muted">{subtitle}</div>}
      <div className="space"></div>
      {cta}
    </div>
  );
}
