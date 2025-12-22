import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { motion, Reorder, AnimatePresence } from 'framer-motion';

const somAlerta = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

function App() {
  const [entregas, setEntregas] = useState([]);
  const [view, setView] = useState(window.innerWidth < 768 ? 'motorista' : 'gestor');
  
  // LOGIN: Controle de acesso do motorista
  const [motoristaLogado, setMotoristaLogado] = useState(localStorage.getItem('motorista_nome') || null);
  const [dadosCadastro, setDadosCadastro] = useState({ nome: '', telefone: '', veiculo: '' });

  const buscarDados = async () => {
    const { data } = await supabase.from('entregas').select('*').order('ordem', { ascending: true });
    if (data) setEntregas(data);
  };

  useEffect(() => {
    buscarDados();
    const canal = supabase.channel('logistica_v5')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entregas' }, (payload) => {
        buscarDados();
        if (payload.eventType === 'INSERT') somAlerta.play().catch(() => {});
      })
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
    if (error) alert(error.message); else buscarDados();
  };

  const salvarMotorista = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('motoristas').insert([dadosCadastro]);
    if (!error) {
      localStorage.setItem('motorista_nome', dadosCadastro.nome);
      setMotoristaLogado(dadosCadastro.nome);
    } else { alert("Erro ao cadastrar: " + error.message); }
  };

  const encerrarTurno = () => {
    if(window.confirm("Deseja encerrar seu turno?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // --- INTERFACE MOTORISTA ---
  if (view === 'motorista') {
    // Tela de Cadastro Inicial
    if (!motoristaLogado) {
      return (
        <div style={{...styles.appContainer, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
          <div style={{width:'100%', textAlign:'center'}}>
            <div style={{fontSize:'50px', marginBottom:'20px'}}>🚚</div>
            <h2 style={{marginBottom:'10px'}}>Identificação</h2>
            <p style={{color:'#94a3b8', marginBottom:'30px'}}>Cadastre-se para ver suas rotas</p>
            <form onSubmit={salvarMotorista} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
              <input placeholder="Nome Completo" style={styles.inputLogin} onChange={e => setDadosCadastro({...dadosCadastro, nome: e.target.value})} required />
              <input placeholder="WhatsApp com DDD" style={styles.inputLogin} onChange={e => setDadosCadastro({...dadosCadastro, telefone: e.target.value})} required />
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
            <div style={styles.statusOnline}>👤 {motoristaLogado}</div>
          </div>
          <button onClick={encerrarTurno} style={styles.btnSair}>SAIR</button>
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
                      <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ent.endereco)}`)} style={styles.btnMapa}>GPS</button>
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
               <h3>Aguardando rotas...</h3>
            </div>
          )}
        </main>
      </div>
    );
  }

  // --- DASHBOARD GESTOR ---
  return (
    <div style={styles.dashContainer}>
      <aside style={styles.sidebar}>
        <h2 style={{color:'#38bdf8', marginBottom:'30px'}}>LOGÍSTICA PRO</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const { error } = await supabase.from('entregas').insert([{
            cliente: e.target.c.value, endereco: e.target.e.value, status:'Pendente', ordem: entregas.length + 1
          }]);
          if(!error) e.target.reset();
        }}>
          <input name="c" placeholder="Nome do Cliente" style={styles.inputLogin} required />
          <input name="e" placeholder="Endereço de Entrega" style={styles.inputLogin} required />
          <button type="submit" style={{...styles.btnOk, width:'100%'}}>LANÇAR NA ROTA</button>
        </form>
        <button onClick={() => setView('motorista')} style={{marginTop:'20px', background:'none', color:'#475569', border:'none', cursor:'pointer'}}>Ver Modo Celular</button>
      </aside>

      <main style={{flex:1, padding:'40px', overflowY:'auto'}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'20px', marginBottom:'40px'}}>
          <div style={styles.statCard}>Total: {entregas.length}</div>
          <div style={styles.statCard}>Pendentes: {entregas.filter(e=>e.status==='Pendente').length}</div>
          <div style={styles.statCard}>Concluídas: {entregas.filter(e=>e.status==='Concluído').length}</div>
        </div>

        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead style={{textAlign:'left', color:'#475569', fontSize:'12px'}}>
            <tr><th style={{padding:'15px'}}>ORDEM</th><th>CLIENTE</th><th>STATUS</th><th>OBSERVAÇÃO</th></tr>
          </thead>
          <tbody>
            {entregas.map(ent => (
              <tr key={ent.id} style={{borderBottom:'1px solid #1e293b'}}>
                <td style={{padding:'20px'}}>#{ent.ordem}</td>
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
  btnSair: { padding:'5px 10px', borderRadius:'8px', border:'1px solid #ef4444', color:'#ef4444', background:'none', fontSize:'10px', fontWeight:'bold' },
  inputLogin: { width:'100%', padding:'15px', borderRadius:'12px', backgroundColor:'#0f172a', border:'1px solid #1e293b', color:'#fff', marginBottom:'10px', boxSizing:'border-box' },
  empty: { textAlign: 'center', marginTop: '100px', color: '#475569' },
  // Estilos Dashboard
  dashContainer: { display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#020617', color: '#fff' },
  sidebar: { width: '320px', backgroundColor: '#0f172a', padding: '30px', borderRight: '1px solid #1e293b' },
  statCard: { backgroundColor: '#0f172a', padding: '25px', borderRadius: '20px', border: '1px solid #1e293b', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }
};

export default App;