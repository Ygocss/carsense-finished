import type { ReactNode } from "react";

export default function Card(
  {title, extra, children}:{title?:string; extra?:ReactNode; children:ReactNode;}
){
  return (
    <div className="card">
      {(title || extra) && (
        <div className="row" style={{justifyContent:"space-between", marginBottom:10}}>
          {title ? <h3>{title}</h3> : <div/>}
          <div>{extra}</div>
        </div>
      )}
      {children}
    </div>
  );
}
