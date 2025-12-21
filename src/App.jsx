import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// Sons
const somNovaEntrega = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
const somVitoria = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');

function App() {
  const [entregas, setEntregas] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [view, setView] = useState('gestor'); // 'gestor' ou 'motorista'
  const [novoPedido, setNovoPedido] = useState({ cliente: '', endereco: '', motorista: '', recado: '' });

  // Forçar visão de motorista se for tela pequena
  useEffect(() => {
    if (window.innerWidth < 768) {
      setView('motorista');
    }
    buscarDados();

    const canal = supabase.channel('logistica_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entregas' }, (payload) => {
        if (payload.eventType === 'INSERT') somNovaEntrega.play();
        if (payload.new && payload.new.status === 'Rota Finalizada') somVitoria.play();
        buscarDados();
      }).subscribe();

    return () => supabase.removeChannel(canal);
  }, []);

  const buscarDados = async () => {
    const { data: m } = await supabase.from('motoristas').select('*');
    const { data: e } = await supabase.from('entregas').select('*').order('ordem', { ascending: true });
    if (m) setMotoristas(m);
    if (e) setEntregas(e);
  };

  const criarPedido = async (e) => {
    e.preventDefault();
    await supabase.from('entregas').insert([{ ...novoPedido, status: 'Pendente', ordem: entregas.length + 1 }]);
    setNovoPedido({ cliente: '', endereco: '', motorista: '', recado: '' });
  };

  const concluirEntrega = async (id) => {
    const hora = new Date().toLocaleTimeString();
    await supabase.from('entregas').update({ status: 'Concluído', horario_conclusao: hora }).eq('id', id);
  };

  // --- TELA DO MOTORISTA ---
  if (view === 'motorista') {
    return (
      <div style={styles.mobileContainer}>
        <header style={{ textAlign: 'center', padding: '10px' }}>
          <h2>📦 MINHAS ENTREGAS</h2>
          <button onClick={() => setView('gestor')} style={styles.btnTrocar}>Trocar para Gestor</button>
        </header>
        {entregas.filter(e => e.status !== 'Rota Finalizada').map(ent => (
          <div key={ent.id} style={styles.cardMobile}>
            <h3>{ent.ordem}º - {ent.cliente}</h3>
            <p>📍 {ent.endereco}</p>
            {ent.status === 'Pendente' ? (
              <button onClick={() => concluirEntrega(ent.id)} style={styles.btnConcluir}>CONCLUIR ENTREGA</button>
            ) : (
              <span style={{ color: '#00ff88' }}>✅ Concluído às {ent.horario_conclusao}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  // --- TELA DO GESTOR ---
  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <button onClick={() => setView('motorista')} style={styles.btnTrocar}>Simular Celular</button>
        <h2 style={{ color: '#38bdf8' }}>Logística-v2 Gestor</h2>
        <form onSubmit={criarPedido} style={styles.form}>
          <input placeholder="Cliente" value={novoPedido.cliente} onChange={e => setNovoPedido({ ...novoPedido, cliente: e.target.value })} style={styles.input} required />
          <input placeholder="Endereço" value={novoPedido.endereco} onChange={e => setNovoPedido({ ...novoPedido, endereco: e.target.value })} style={styles.input} required />
          <select style={styles.input} onChange={e => setNovoPedido({ ...novoPedido, motorista: e.target.value })}>
            <option>Selecionar Motorista</option>
            {motoristas.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
          </select>
          <button type="submit" style={styles.btnEnviar}>ENVIAR ROTA</button>
        </form>
        <div style={{ marginTop: '20px' }}>
          <h3>Monitoramento</h3>
          {entregas.map(ent => (
            <div key={ent.id} style={styles.log}>
              {ent.cliente} - <strong>{ent.status}</strong> {ent.horario_conclusao}
            </div>
          ))}
        </div>
      </aside>
      <main style={styles.main}>
        <div style={styles.mapaPlaceholder}>Mapa Ativo (Leaflet)</div>
      </main>
    </div>
  );
}

const styles = {
  container: { display: 'flex', height: '100vh', backgroundColor: '#0f172a', color: '#fff' },
  sidebar: { width: '300px', padding: '20px', backgroundColor: '#1e293b' },
  main: { flex: 1, padding: '20px' },
  mapaPlaceholder: { height: '100%', backgroundColor: '#334155', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  input: { padding: '10px', marginBottom: '10px', borderRadius: '5px', border: 'none', width: '100%' },
  btnEnviar: { width: '100%', padding: '10px', backgroundColor: '#38bdf8', border: 'none', borderRadius: '5px', fontWeight: 'bold' },
  log: { fontSize: '12px', padding: '5px', borderBottom: '1px solid #334155' },
  mobileContainer: { padding: '15px', backgroundColor: '#0f172a', minHeight: '100vh', color: '#fff' },
  cardMobile: { backgroundColor: '#1e293b', padding: '15px', borderRadius: '10px', marginBottom: '15px' },
  btnConcluir: { width: '100%', padding: '10px', backgroundColor: '#00ff88', border: 'none', borderRadius: '5px', marginTop: '10px' },
  btnTrocar: { padding: '5px 10px', fontSize: '10px', cursor: 'pointer', marginBottom: '10px' }
};

export default App;