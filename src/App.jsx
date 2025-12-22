import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { motion, Reorder, AnimatePresence } from 'framer-motion';

const somAlerta = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

function App() {
  const [entregas, setEntregas] = useState([]);
  const [view, setView] = useState(window.innerWidth < 768 ? 'motorista' : 'gestor');

  const buscarDados = async () => {
    const { data } = await supabase.from('entregas').select('*').order('ordem', { ascending: true });
    if (data) setEntregas(data);
  };

  useEffect(() => {
    buscarDados();
    const canal = supabase.channel('logistica_fluida')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entregas' }, () => buscarDados())
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, []);

  // Atualiza o banco de dados quando a reordenação termina
  const finalizarReordem = async (novaLista) => {
    setEntregas(novaLista);
    for (let i = 0; i < novaLista.length; i++) {
      await supabase.from('entregas').update({ ordem: i + 1 }).eq('id', novaLista[i].id);
    }
  };

  if (view === 'motorista') {
    const pendentes = entregas.filter(e => e.status === 'Pendente');

    return (
      <div style={styles.appContainer}>
        <header style={styles.header}>
          <h2 style={{margin: 0, fontSize: '18px', fontWeight: '800'}}>ROTA INTELIGENTE</h2>
          <div style={styles.statusOnline}>● Sincronizado</div>
        </header>

        <main style={styles.main}>
          {/* O Reorder.Group é o segredo da fluidez total */}
          <Reorder.Group axis="y" values={pendentes} onReorder={finalizarReordem} style={styles.list}>
            <AnimatePresence>
              {pendentes.map((ent, index) => (
                <Reorder.Item
                  key={ent.id}
                  value={ent}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  whileDrag={{ scale: 1.05, boxShadow: "0px 10px 20px rgba(0,0,0,0.4)" }}
                  style={{...styles.card, borderLeft: index === 0 ? '6px solid #38bdf8' : '4px solid transparent'}}
                >
                  <div style={styles.cardContent}>
                    <div style={styles.dragHandle}>☰</div>
                    <div style={{flex: 1}}>
                      <div style={styles.clienteNome}>{ent.cliente}</div>
                      <div style={styles.enderecoText}>📍 {ent.endereco}</div>
                    </div>
                    {index === 0 && <div style={styles.nowBadge}>AGORA</div>}
                  </div>

                  {index === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.actions}>
                      <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ent.endereco)}`)} style={styles.btnMapa}>GPS</button>
                      <button onClick={() => {/* função concluir */}} style={styles.btnOk}>CONCLUIR</button>
                    </motion.div>
                  )}
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
          
          {pendentes.length === 0 && (
            <div style={styles.empty}>Tudo pronto! Nenhuma entrega pendente.</div>
          )}
        </main>
      </div>
    );
  }

  return <div style={{color:'#fff', padding:'50px'}}>Painel Gestor</div>;
}

const styles = {
  appContainer: { width: '100vw', height: '100vh', backgroundColor: '#020617', color: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
  header: { padding: '25px 20px', backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  statusOnline: { fontSize: '10px', color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase' },
  main: { padding: '15px', height: 'calc(100vh - 90px)', overflowY: 'auto' },
  list: { listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' },
  card: { backgroundColor: '#1e293b', padding: '20px', borderRadius: '20px', cursor: 'grab', listStyle: 'none', userSelect: 'none' },
  cardContent: { display: 'flex', alignItems: 'center', gap: '15px' },
  dragHandle: { color: '#475569', fontSize: '20px' },
  clienteNome: { fontWeight: '700', fontSize: '18px', marginBottom: '4px' },
  enderecoText: { fontSize: '13px', color: '#94a3b8', lineHeight: '1.4' },
  nowBadge: { background: '#38bdf8', color: '#000', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '900' },
  actions: { display: 'flex', gap: '10px', marginTop: '20px' },
  btnMapa: { flex: 1, padding: '15px', borderRadius: '12px', border: '1px solid #334155', background: 'transparent', color: '#fff', fontWeight: 'bold' },
  btnOk: { flex: 1, padding: '15px', borderRadius: '12px', border: 'none', background: '#38bdf8', color: '#000', fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: '100px', color: '#475569' }
};

export default App;