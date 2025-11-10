export default function Dashboard({onLogout}:{onLogout:()=>void}){
  return (
    <div style={{padding:24}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h2>Mantenimiento preventivo</h2>
        <button onClick={onLogout}>Salir</button>
      </div>
      <p>Tablero base funcionando. Aquí re-conectamos tus módulos (vehículos, alertas, historial).</p>
    </div>
  );
}
