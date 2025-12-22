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
    const canal = supabase.channel('logistica_final')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entregas' }, () => buscarDados())
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, []);

  const finalizarReordem = async (novaLista) => {
    setEntregas(novaLista);
    // Atualiza a ordem no banco para persistir o que o motorista fez
    for (let i = 0; i < novaLista.length; i++) {
      await supabase.from('entregas').update({ ordem: i + 1 }).eq('id', novaLista[i].id);
    }
  };

  // FUNÇÃO DE CONCLUIR REATIVADA
  const concluirEntrega = async (id) => {
    const nomeRecebedor = prompt("Quem recebeu a mercadoria?");
    if (!nomeRecebedor) return;

    const { error } = await supabase.from('entregas')
      .update({ 
        status: 'Concluído', 
        horario_conclusao: new Date().toISOString(),
        recado: `Recebido por: ${nomeRecebedor}` 
      })
      .eq('id', id);

    if (error) {
      alert("Erro ao concluir: " + error.message);
    } else {
      buscarDados(); // Atualiza a lista e remove o card concluído da tela
    }
  };

  if (view === 'motorista') {
    const pendentes = entregas.filter(e => e.status === 'Pendente');

    return (
      <div style={styles.appContainer}>
        <header style={styles.header}>
          <h2 style={{margin: 0, fontSize: '18px', fontWeight: '800'}}>ROTA ATIVA</h2>
          <div style={styles.statusOnline}>● REALTIME</div>
        </header>

        <main style={styles.main}>
          <Reorder.Group axis="y" values={pendentes} onReorder={finalizarReordem} style={styles.list}>
            <AnimatePresence>
              {pendentes.map((ent, index) => (
                <Reorder.Item
                  key={ent.id}
                  value={ent}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  whileDrag={{ scale: 1.03, boxShadow: "0px 15px 30px rgba(0,0,0,0.5)" }}
                  style={{
                    ...styles.card, 
                    borderLeft: index === 0 ? '6px solid #38bdf8' : '4px solid transparent',
                    background: index === 0 ? '#1e293b' : 'rgba(30, 41, 59, 0.5)'
                  }}
                >
                  <div style={styles.cardContent}>
                    <div style={styles.dragHandle}>☰</div>
                    <div style={{flex: 1}}>
                      <div style={styles.clienteNome}>{ent.cliente}</div>
                      <div style={styles.enderecoText}>📍 {ent.endereco}</div>
                    </div>
                  </div>

                  {/* SÓ MOSTRA OS BOTÕES NA ENTREGA ATUAL (A PRIMEIRA DA LISTA) */}
                  {index === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.actions}>
                      <button 
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ent.endereco)}`)} 
                        style={styles.btnMapa}
                      >
                        ABRIR GPS
                      </button>
                      <button 
                        onClick={() => concluirEntrega(ent.id)} 
                        style={styles.btnOk}
                      >
                        CONCLUIR
                      </button>
                    </motion.div>
                  )}
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
          
          {pendentes.length === 0 && (
            <div style={styles.empty}>
               <div style={{fontSize: '40px'}}>🏁</div>
               <h3>Fim da jornada!</h3>
               <p>Não há mais entregas pendentes.</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  return <div style={{background:'#020617', height:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>
    <button onClick={() => setView('motorista')} style={styles.btnOk}>Simular Celular</button>
  </div>;
}

const styles = {
  appContainer: { width: '100vw', height: '100vh', backgroundColor: '#020617', color: '#fff', fontFamily: '-apple-system, sans-serif' },
  header: { padding: '20px', backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  statusOnline: { fontSize: '10px', color: '#10b981', fontWeight: 'bold' },
  main: { padding: '15px', height: 'calc(100vh - 80px)', overflowY: 'auto' },
  list: { listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '15px' },
  card: { padding: '20px', borderRadius: '24px', listStyle: 'none', userSelect: 'none' },
  cardContent: { display: 'flex', alignItems: 'center', gap: '15px' },
  dragHandle: { color: '#475569', fontSize: '20px' },
  clienteNome: { fontWeight: '700', fontSize: '20px' },
  enderecoText: { fontSize: '14px', color: '#94a3b8', marginTop: '4px' },
  actions: { display: 'flex', gap: '10px', marginTop: '20px' },
  btnMapa: { flex: 1, padding: '16px', borderRadius: '14px', border: '1px solid #334155', background: 'transparent', color: '#fff', fontWeight: 'bold' },
  btnOk: { flex: 1, padding: '16px', borderRadius: '14px', border: 'none', background: '#38bdf8', color: '#000', fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: '100px', color: '#475569' }
};

export default App;