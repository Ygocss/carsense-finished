export default function Contacto(){
  function onSubmit(e: React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    alert(`Gracias por tu mensaje:\n\nNombre: ${f.get("nombre")}\nEmail: ${f.get("email")}\nAsunto: ${f.get("asunto")}\n\n${f.get("mensaje")}`);
    e.currentTarget.reset();
  }

  return (
    <div className="container" style={{display:"grid", gap:18, paddingTop:18}}>
      <div className="panel"><h1>Contacto</h1><div className="muted">Dudas, sugerencias o reportes.</div></div>
      <div className="panel">
        <form onSubmit={onSubmit} className="row" style={{gap:12, flexWrap:"wrap"}}>
          <input className="input" name="nombre" placeholder="Nombre" required style={{flex:"1 1 260px"}} />
          <input className="input" type="email" name="email" placeholder="Correo" required style={{flex:"1 1 260px"}} />
          <input className="input" name="asunto" placeholder="Asunto" style={{flex:"1 1 100%"}} />
          <textarea className="input" name="mensaje" placeholder="Mensaje" rows={5} style={{flex:"1 1 100%"}} />
          <button className="btn" type="submit">Enviar</button>
        </form>
      </div>
    </div>
  );
}
