import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { motion, Reorder, AnimatePresence } from 'framer-motion';

const somAlerta = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

function App() {
  const [entregas, setEntregas] = useState([]);
  const [view, setView] = useState(window.innerWidth < 768 ? 'motorista' : 'gestor');
  
  // LOGIN: Controle de acesso
  const [motoristaLogado, setMotoristaLogado] = useState(localStorage.getItem('mot_v5') || null);
  const [formRegistro, setFormRegistro] = useState({ nome: '', tel: '' });

  const buscarDados = async () => {
    const { data } = await supabase.from('entregas').select('*').order('ordem', { ascending: true });
    if (data) setEntregas(data);
  };

  useEffect(() => {
    buscarDados();
    const canal = supabase.channel('logistica_vfinal')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entregas' }, () => buscarDados())
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, []);

  const finalizarReordem = async (novaLista) => {
    setEntregas(novaLista);
    for (let i = 0; i < novaLista.length; i++) {
      await supabase.from('entregas').update({ ordem: i + 1 }).eq('id', novaLista[i].id);
    }
  };

  const concluirEntrega = async (id) => {
    const nomeRecebedor = prompt("Quem recebeu a mercadoria?");
    if (!nomeRecebedor) return;
    const { error } = await supabase.from('entregas')
      .update({ 
        status: 'Concluído', 
        horario_conclusao: new Date().toISOString(),
        recado: `Recebido por: ${nomeRecebedor} | Mot: ${motoristaLogado}` 
      })
      .eq('id', id);
    if (!error) buscarDados();
  };

  const salvarMotorista = (e) => {
    e.preventDefault();
    localStorage.setItem('mot_v5', formRegistro.nome);
    setMotoristaLogado(formRegistro.nome);
  };

  // --- VISÃO MOTORISTA ---
  if (view === 'motorista') {
    if (!motoristaLogado) {
      return (
        <div style={{...styles.appContainer, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
          <div style={{width:'100%', textAlign:'center'}}>
            <div style={{fontSize:'60px', marginBottom:'20px'}}>🚚</div>
            <h2 style={{marginBottom:'20px'}}>Acesso Motorista</h2>
            <form onSubmit={salvarMotorista} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
              <input placeholder="Seu Nome" style={styles.inputLogin} onChange={e => setFormRegistro({...formRegistro, nome: e.target.value})} required />
              <input placeholder="WhatsApp" style={styles.inputLogin} onChange={e => setFormRegistro({...formRegistro, tel: e.target.value})} required />
              <button type="submit" style={styles.btnOk}>ATIVAR TURNO</button>
            </form>
          </div>
        </div>
      );
    }

    const pendentes = entregas.filter(e => e.status === 'Pendente');

    return (
      <div style={styles.appContainer}>
        <header style={styles.header}>
          <div style={{textAlign:'left'}}>
            <h2 style={{margin: 0, fontSize: '18px', fontWeight: '800'}}>ROTA ATIVA</h2>
            <div style={styles.statusOnline}>● {motoristaLogado}</div>
          </div>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={styles.btnSair}>SAIR</button>
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

                  {index === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.actions}>
                      <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=$${encodeURIComponent(ent.endereco)}`)} style={styles.btnMapa}>GPS</button>
                      <button onClick={() => concluirEntrega(ent.id)} style={styles.btnOk}>CONCLUIR</button>
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
            </div>
          )}
        </main>
      </div>
    );
  }

  // --- VISÃO GESTOR ---
  return (
    <div style={styles.dashContainer}>
      <aside style={styles.sidebar}>
        <h2 style={{color:'#38bdf8', marginBottom:'30px'}}>DASHBOARD</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          await supabase.from('entregas').insert([{
            cliente: e.target.c.value, endereco: e.target.e.value, status:'Pendente', ordem: entregas.length + 1
          }]);
          e.target.reset();
        }}>
          <input name="c" placeholder="Cliente" style={styles.inputLogin} required />
          <input name="e" placeholder="Endereço" style={styles.inputLogin} required />
          <button type="submit" style={{...styles.btnOk, width:'100%'}}>LANÇAR NA ROTA</button>
        </form>
        <button onClick={() => setView('motorista')} style={{marginTop:'20px', background:'none', color:'#475569', border:'none', cursor:'pointer'}}>Ver Modo Celular</button>
      </aside>

      <main style={{flex:1, padding:'40px', overflowY:'auto'}}>
        <h3>Entregas em Tempo Real</h3>
        <table style={{width:'100%', borderCollapse:'collapse', marginTop:'20px'}}>
          <thead style={{textAlign:'left', color:'#475569'}}>
            <tr><th style={{padding:'15px'}}>ORDEM</th><th>CLIENTE</th><th>STATUS</th><th>RECADO</th></tr>
          </thead>
          <tbody>
            {entregas.map(ent => (
              <tr key={ent.id} style={{borderBottom:'1px solid #1e293b'}}>
                <td style={{padding:'15px'}}>#{ent.ordem}</td>
                <td>{ent.cliente}</td>
                <td><span style={{color: ent.status==='Concluído'?'#10b981':'#fbbf24'}}>{ent.status}</span></td>
                <td style={{fontSize:'12px', color:'#94a3b8'}}>{ent.recado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
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
  btnSair: { background:'none', border:'1px solid #ef4444', color:'#ef4444', padding:'5px 10px', borderRadius:'8px', fontSize:'10px' },
  inputLogin: { width:'100%', padding:'15px', marginBottom:'10px', borderRadius:'10px', border:'1px solid #334155', backgroundColor:'#0f172a', color:'#fff', boxSizing:'border-box' },
  empty: { textAlign: 'center', marginTop: '100px', color: '#475569' },
  dashContainer: { display:'flex', width:'100vw', height:'100vh', backgroundColor:'#020617', color:'#fff' },
  sidebar: { width:'300px', padding:'30px', backgroundColor:'#0f172a', borderRight:'1px solid #1e293b' }
};

export default App;