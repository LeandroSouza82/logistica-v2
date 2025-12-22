import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const somNovaEntrega = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

function App() {
  const [entregas, setEntregas] = useState([]);
  const [motoristas, setMotoristas] = useState([]);
  const [view, setView] = useState(window.innerWidth < 768 ? 'motorista' : 'gestor');
  const [novoPedido, setNovoPedido] = useState({ cliente: '', endereco: '', motorista: '', recado: '' });

  // Formatar data para padrão Brasil (DD/MM/AAAA HH:mm)
  const formatarDataBR = (isoString) => {
    if (!isoString) return '';
    const data = new Date(isoString);
    return data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  };

  const buscarDados = async () => {
    const { data: e } = await supabase.from('entregas').select('*').order('ordem', { ascending: true });
    const { data: m } = await supabase.from('motoristas').select('*');
    if (e) setEntregas(e);
    if (m) setMotoristas(m);
  };

  useEffect(() => {
    buscarDados();

    // REALTIME REFORÇADO
    const canal = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entregas' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          somNovaEntrega.play().catch(() => {});
        }
        buscarDados(); // Força a atualização da lista na tela
      })
      .subscribe();

    return () => supabase.removeChannel(canal);
  }, []);

  const criarPedido = async (e) => {
    e.preventDefault();
    await supabase.from('entregas').insert([{ ...novoPedido, status: 'Pendente', ordem: entregas.length + 1 }]);
    setNovoPedido({ cliente: '', endereco: '', motorista: '', recado: '' });
  };

  const concluirEntrega = async (id) => {
    const agora = new Date().toISOString(); 
    await supabase.from('entregas').update({ status: 'Concluído', horario_conclusao: agora }).eq('id', id);
    buscarDados();
  };

  if (view === 'motorista') {
    return (
      <div style={styles.mobileContainer}>
        {/* Meta tag para impedir zoom via código (iOS/Android) */}
        <style>{`
          html, body { overflow: hidden; touch-action: manipulation; }
          input, button { font-size: 16px !important; } 
        `}</style>
        
        <header style={styles.mobileHeader}>
          <h2 style={{margin: 0}}>🚚 MINHAS ENTREGAS</h2>
          <small>Atualização Automática Ativa</small>
        </header>

        <div style={styles.scrollArea}>
          {entregas.filter(e => e.status !== 'Finalizado').map(ent => (
            <div key={ent.id} style={styles.cardMobile}>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <strong style={{color: '#38bdf8'}}>{ent.ordem}º - {ent.cliente}</strong>
                <span style={{fontSize: '11px', background: '#334155', padding: '2px 6px', borderRadius: '4px'}}>
                  {ent.status}
                </span>
              </div>
              <p style={{margin: '10px 0', fontSize: '15px'}}>📍 {ent.endereco}</p>
              
              {ent.status === 'Pendente' ? (
                <button onClick={() => concluirEntrega(ent.id)} style={styles.btnConcluir}>
                  CONCLUIR ENTREGA
                </button>
              ) : (
                <div style={styles.tagConcluido}>
                  ✅ {formatarDataBR(ent.horario_conclusao)}
                </div>
              )}
            </div>
          ))}
        </div>
        <button onClick={() => setView('gestor')} style={styles.btnFloating}>MODO GESTOR</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <h2 style={{color: '#38bdf8'}}>Painel de Controle</h2>
        <form onSubmit={criarPedido} style={styles.form}>
          <input placeholder="Cliente" value={novoPedido.cliente} onChange={e => setNovoPedido({...novoPedido, cliente: e.target.value})} style={styles.input} required />
          <input placeholder="Endereço" value={novoPedido.endereco} onChange={e => setNovoPedido({...novoPedido, endereco: e.target.value})} style={styles.input} required />
          <select style={styles.input} value={novoPedido.motorista} onChange={e => setNovoPedido({...novoPedido, motorista: e.target.value})} required>
            <option value="">Motorista</option>
            {motoristas.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
          </select>
          <button type="submit" style={styles.btnEnviar}>ENVIAR PARA ROTA</button>
        </form>
        <div style={styles.monitor}>
          <h3>Log de Entregas</h3>
          {entregas.map(ent => (
            <div key={ent.id} style={styles.logItem}>
              <span>{ent.cliente}</span>
              <small>{ent.status} - {formatarDataBR(ent.horario_conclusao)}</small>
            </div>
          ))}
        </div>
      </aside>
      <main style={{flex: 1, backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <h2 style={{opacity: 0.2}}>MAPA LOGÍSTICO V2</h2>
      </main>
    </div>
  );
}

const styles = {
  container: { display: 'flex', height: '100vh', backgroundColor: '#0f172a', color: '#fff', fontFamily: 'sans-serif' },
  sidebar: { width: '300px', padding: '20px', backgroundColor: '#1e293b', borderRight: '1px solid #334155', overflowY: 'auto' },
  input: { padding: '12px', marginBottom: '10px', width: '100%', borderRadius: '6px', border: 'none', backgroundColor: '#0f172a', color: '#fff' },
  btnEnviar: { width: '100%', padding: '15px', backgroundColor: '#38bdf8', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  monitor: { marginTop: '20px', fontSize: '12px' },
  logItem: { padding: '8px 0', borderBottom: '1px solid #334155', display: 'flex', flexDirection: 'column' },
  
  // MOBILE
  mobileContainer: { 
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
    backgroundColor: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column'
  },
  mobileHeader: { padding: '20px', backgroundColor: '#1e293b', textAlign: 'center', borderBottom: '2px solid #38bdf8' },
  scrollArea: { flex: 1, overflowY: 'auto', padding: '15px' },
  cardMobile: { backgroundColor: '#1e293b', padding: '18px', borderRadius: '15px', marginBottom: '15px', borderLeft: '6px solid #38bdf8' },
  btnConcluir: { width: '100%', padding: '16px', backgroundColor: '#00ff88', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', marginTop: '10px' },
  tagConcluido: { color: '#00ff88', fontWeight: 'bold', textAlign: 'center', marginTop: '10px', fontSize: '14px' },
  btnFloating: { position: 'fixed', bottom: '10px', right: '10px', padding: '8px', opacity: 0.4, fontSize: '10px' }
};

export default App;