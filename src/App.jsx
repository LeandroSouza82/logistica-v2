import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const somNovaEntrega = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

function App() {
  const [entregas, setEntregas] = useState([]);
  const [view, setView] = useState(window.innerWidth < 768 ? 'motorista' : 'gestor');

  const buscarDados = async () => {
    const { data } = await supabase.from('entregas').select('*').order('ordem', { ascending: true });
    if (data) setEntregas(data);
  };

  useEffect(() => {
    buscarDados();
    const canal = supabase.channel('fluxo_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entregas' }, () => {
        buscarDados();
        somNovaEntrega.play().catch(() => console.log("Toque na tela para o som"));
      })
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, []);

  const concluirEntrega = async (id) => {
    const nome = prompt("Quem recebeu?");
    if (!nome) return;
    await supabase.from('entregas').update({ 
      status: 'Concluído', 
      horario_conclusao: new Date().toISOString(),
      recado: `Recebido por: ${nome}`
    }).eq('id', id);
  };

  if (view === 'motorista') {
    const fila = entregas.filter(e => e.status === 'Pendente');
    const atual = fila[0];
    const proximas = fila.slice(1);

    return (
      <div style={styles.mobileContainer} onClick={() => { somNovaEntrega.play().then(() => somNovaEntrega.pause()) }}>
        <header style={styles.header}>
          <h2 style={{margin:0}}>ENTREGA ATUAL</h2>
          <small>{fila.length} paradas restantes</small>
        </header>
        <div style={styles.scrollArea}>
          {atual ? (
            <div style={styles.cardPrincipal}>
              <h1 style={{fontSize:'32px', margin:'10px 0'}}>{atual.cliente}</h1>
              <p style={{fontSize:'18px'}}>📍 {atual.endereco}</p>
              <div style={styles.gridAcoes}>
                <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(atual.endereco)}`, '_blank')} style={styles.btnMapa}>🗺️ ABRIR GPS</button>
                <button onClick={() => concluirEntrega(atual.id)} style={styles.btnConcluir}>✅ CONCLUIR</button>
              </div>
            </div>
          ) : (
            <div style={{textAlign:'center', padding:'40px'}}>🏆 Rota Finalizada!</div>
          )}
          {proximas.map((ent, i) => (
            <div key={ent.id} style={styles.cardMenor}>
              <strong>{i+2}º - {ent.cliente}</strong>
              <div style={{fontSize:'12px', color:'#94a3b8'}}>{ent.endereco}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{padding:'20px', color:'#fff', textAlign:'center'}}>
      <h1>PAINEL GESTOR</h1>
      <button onClick={() => setView('motorista')} style={{padding:'10px'}}>VER COMO MOTORISTA</button>
    </div>
  );
}

const styles = {
  mobileContainer: { width: '100vw', height: '100vh', backgroundColor: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { padding: '20px', backgroundColor: '#1e293b', borderBottom: '2px solid #38bdf8', textAlign: 'center' },
  scrollArea: { flex: 1, overflowY: 'auto', padding: '15px' },
  cardPrincipal: { backgroundColor: '#1e293b', padding: '25px', borderRadius: '25px', borderLeft: '10px solid #38bdf8' },
  gridAcoes: { display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' },
  btnMapa: { padding: '18px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '15px', fontWeight: 'bold' },
  btnConcluir: { padding: '22px', backgroundColor: '#00ff88', color: '#000', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '20px' },
  cardMenor: { backgroundColor: '#1e293b', padding: '15px', borderRadius: '12px', marginTop: '10px', opacity: 0.6 }
};

export default App;