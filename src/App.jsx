import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { motion, Reorder, AnimatePresence } from 'framer-motion';

function App() {
  const [entregas, setEntregas] = useState([]);
  const [view, setView] = useState(window.innerWidth < 768 ? 'motorista' : 'gestor');
  
  // LOGIN: Se não tiver nome no localStorage, motoristaLogado será null
  const [motoristaLogado, setMotoristaLogado] = useState(localStorage.getItem('motorista_nome') || null);
  const [dados, setDados] = useState({ nome: '', telefone: '', veiculo: '' });

  const buscarDados = async () => {
    const { data } = await supabase.from('entregas').select('*').order('ordem', { ascending: true });
    if (data) setEntregas(data);
  };

  useEffect(() => {
    buscarDados();
    const canal = supabase.channel('v5').on('postgres_changes', { event: '*', schema: 'public', table: 'entregas' }, () => buscarDados()).subscribe();
    return () => supabase.removeChannel(canal);
  }, []);

  const salvarCadastro = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('motoristas').insert([dados]);
    if (!error) {
      localStorage.setItem('motorista_nome', dados.nome);
      setMotoristaLogado(dados.nome);
    } else { alert("Erro: " + error.message); }
  };

  // TELA 1: CADASTRO (Só aparece se NÃO estiver logado)
  if (view === 'motorista' && !motoristaLogado) {
    return (
      <div style={styles.appContainer}>
        <div style={styles.loginCard}>
          <div style={styles.iconCircle}>🚚</div>
          <h2>Identificação</h2>
          <form onSubmit={salvarCadastro} style={styles.form}>
            <input placeholder="Seu Nome" style={styles.inputLogin} onChange={e => setDados({...dados, nome: e.target.value})} required />
            <input placeholder="WhatsApp" style={styles.inputLogin} onChange={e => setDados({...dados, telefone: e.target.value})} required />
            <button type="submit" style={styles.btnAcessar}>ENTRAR NO TURNO</button>
          </form>
        </div>
      </div>
    );
  }

  // TELA 2: ROTA (Aparece se ESTIVER logado)
  if (view === 'motorista' && motoristaLogado) {
    const pendentes = entregas.filter(e => e.status === 'Pendente');
    return (
      <div style={styles.appContainer}>
        <header style={styles.header}>
          <span>👤 {motoristaLogado}</span>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={styles.btnSair}>SAIR</button>
        </header>
        <main style={{padding: '15px'}}>
          <Reorder.Group axis="y" values={pendentes} onReorder={setEntregas} style={{listStyle:'none', padding:0}}>
            {pendentes.map((ent, index) => (
              <Reorder.Item key={ent.id} value={ent} style={styles.card}>
                <strong>{index + 1}º - {ent.cliente}</strong>
                <p style={{fontSize: '12px', color: '#94a3b8'}}>{ent.endereco}</p>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </main>
      </div>
    );
  }

  // TELA 3: GESTOR (PC)
  return <div style={{padding:'50px', color:'#fff'}}>PAINEL GESTOR - <button onClick={() => setView('motorista')}>Ver Celular</button></div>;
}

const styles = {
  appContainer: { width: '100vw', height: '100vh', backgroundColor: '#020617', color: '#fff', fontFamily: 'sans-serif' },
  loginCard: { padding: '50px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  iconCircle: { width: '70px', height: '70px', borderRadius: '50%', border: '2px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', marginBottom: '20px' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' },
  inputLogin: { padding: '15px', borderRadius: '10px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#fff' },
  btnAcessar: { padding: '15px', borderRadius: '10px', border: 'none', backgroundColor: '#38bdf8', fontWeight: 'bold' },
  header: { padding: '20px', backgroundColor: '#0f172a', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b' },
  btnSair: { background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '5px', padding: '2px 8px', fontSize: '10px' },
  card: { backgroundColor: '#1e293b', padding: '15px', borderRadius: '15px', marginBottom: '10px' }
};

export default App;