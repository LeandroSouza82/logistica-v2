import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const somNovaEntrega = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

function App() {
  const [entregas, setEntregas] = useState([]);
  const [view, setView] = useState(window.innerWidth < 768 ? 'motorista' : 'gestor');
  
  // LOGIN: Verifica se já existe um motorista salvo no celular
  const [motoristaLogado, setMotoristaLogado] = useState(localStorage.getItem('motorista_nome') || null);
  
  // ESTADO DO CADASTRO: Incluindo telefone
  const [novoMotorista, setNovoMotorista] = useState({ 
    nome: '', 
    telefone: '', 
    placa: '', 
    veiculo: '',
    status: 'online' 
  });

  const buscarDados = async () => {
    const { data } = await supabase.from('entregas').select('*').order('ordem', { ascending: true });
    if (data) setEntregas(data);
  };

  useEffect(() => {
    buscarDados();
    const canal = supabase.channel('fluxo_v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entregas' }, () => buscarDados())
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, []);

  // FUNÇÃO DE CADASTRO COM TELEFONE
  const cadastrarNoSistema = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('motoristas').insert([novoMotorista]);
    
    if (!error) {
      // "Manter Logado": Salva no navegador do celular
      localStorage.setItem('motorista_nome', novoMotorista.nome);
      localStorage.setItem('motorista_tel', novoMotorista.telefone);
      setMotoristaLogado(novoMotorista.nome);
    } else {
      alert("Erro ao cadastrar: " + error.message);
    }
  };

  // FUNÇÃO SAIR (Para trocar de motorista se precisar)
  const logout = () => {
    localStorage.clear();
    setMotoristaLogado(null);
  };

  const concluirEntrega = async (id) => {
    const nomeRecebedor = prompt("Quem recebeu a mercadoria?");
    if (!nomeRecebedor) return;

    await supabase.from('entregas').update({ 
      status: 'Concluído', 
      horario_conclusao: new Date().toISOString(),
      recado: `Entregue para: ${nomeRecebedor} | Motorista: ${motoristaLogado}`
    }).eq('id', id);
  };

  // --- TELA DE CADASTRO (MOBILE) ---
  if (view === 'motorista' && !motoristaLogado) {
    return (
      <div style={styles.mobileContainer}>
        <div style={styles.cardLogin}>
          <h1 style={{color: '#38bdf8', marginBottom: '5px'}}>🚚 Cadastro</h1>
          <p style={{color: '#94a3b8', fontSize: '14px'}}>Insira seus dados para começar a rota.</p>
          
          <form onSubmit={cadastrarNoSistema} style={styles.formCadastro}>
            <input placeholder="Nome Completo" style={styles.inputMobile} 
              onChange={e => setNovoMotorista({...novoMotorista, nome: e.target.value})} required />
            
            <input placeholder="WhatsApp (DDD + Número)" type="tel" style={styles.inputMobile} 
              onChange={e => setNovoMotorista({...novoMotorista, telefone: e.target.value})} required />
            
            <input placeholder="Placa do Veículo" style={styles.inputMobile} 
              onChange={e => setNovoMotorista({...novoMotorista, placa: e.target.value})} required />
            
            <input placeholder="Tipo de Veículo (Fiorino, Caminhão...)" style={styles.inputMobile} 
              onChange={e => setNovoMotorista({...novoMotorista, veiculo: e.target.value})} required />
            
            <button type="submit" style={styles.btnCadastrar}>INICIAR TRABALHO</button>
            <p style={{fontSize: '11px', color: '#64748b', textAlign: 'center'}}>
              Ao entrar, você permanecerá logado neste aparelho.
            </p>
          </form>
        </div>
      </div>
    );
  }

  // --- TELA DE ROTA ---
  if (view === 'motorista' && motoristaLogado) {
    const fila = entregas.filter(e => e.status === 'Pendente');
    const atual = fila[0];

    return (
      <div style={styles.mobileContainer}>
        <header style={styles.header}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <span style={{fontSize:'12px', fontWeight:'bold', color:'#38bdf8'}}>👤 {motoristaLogado}</span>
            <button onClick={logout} style={styles.btnSair}>SAIR</button>
          </div>
        </header>

        <div style={styles.scrollArea}>
          {atual ? (
            <div style={styles.cardPrincipal}>
              <h2 style={{margin: '0 0 10px 0'}}>{atual.cliente}</h2>
              <p style={{fontSize:'16px', color: '#cbd5e1'}}>📍 {atual.endereco}</p>
              <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(atual.endereco)}`)} style={styles.btnAcao}>MAPA</button>
                <button onClick={() => concluirEntrega(atual.id)} style={{...styles.btnAcao, backgroundColor:'#00ff88', color:'#000'}}>CONCLUIR</button>
              </div>
            </div>
          ) : (
            <div style={{textAlign: 'center', marginTop: '50px'}}>🏁 Rota concluída!</div>
          )}
        </div>
      </div>
    );
  }

  // --- TELA GESTOR ---
  return (
    <div style={{padding: '50px', color: '#fff', textAlign: 'center', backgroundColor: '#0f172a', height: '100vh'}}>
      <h2>DASHBOARD GESTOR</h2>
      <button onClick={() => setView('motorista')} style={{padding:'10px 20px', marginTop:'20px', cursor:'pointer'}}>SIMULAR CELULAR</button>
    </div>
  );
}

const styles = {
  mobileContainer: { width: '100vw', height: '100vh', backgroundColor: '#0f172a', color: '#fff', fontFamily: 'sans-serif' },
  header: { padding: '15px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155' },
  cardLogin: { padding: '40px 20px' },
  formCadastro: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' },
  inputMobile: { padding: '16px', borderRadius: '10px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '16px' },
  btnCadastrar: { padding: '18px', borderRadius: '10px', border: 'none', backgroundColor: '#38bdf8', color: '#000', fontWeight: 'bold', fontSize: '16px', marginTop: '10px' },
  scrollArea: { padding: '15px' },
  cardPrincipal: { backgroundColor: '#1e293b', padding: '20px', borderRadius: '20px', borderLeft: '8px solid #38bdf8' },
  btnAcao: { flex: 1, padding: '15px', borderRadius: '10px', border: 'none', backgroundColor: '#334155', color: '#fff', fontWeight: 'bold' },
  btnSair: { backgroundColor: 'transparent', color: '#f87171', border: '1px solid #f87171', padding: '4px 8px', borderRadius: '5px', fontSize: '10px' }
};

export default App;