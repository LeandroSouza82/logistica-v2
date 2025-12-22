import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const somNovaEntrega = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

function App() {
  const [entregas, setEntregas] = useState([]);
  const [view, setView] = useState(window.innerWidth < 768 ? 'motorista' : 'gestor');
  // Estado para controlar se o motorista está logado/cadastrado
  const [motoristaLogado, setMotoristaLogado] = useState(localStorage.getItem('motorista_nome') || null);
  const [novoMotorista, setNovoMotorista] = useState({ nome: '', placa: '', veiculo: '' });

  const buscarDados = async () => {
    const { data } = await supabase.from('entregas').select('*').order('ordem', { ascending: true });
    if (data) setEntregas(data);
  };

  useEffect(() => {
    buscarDados();
    const canal = supabase.channel('fluxo_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entregas' }, () => buscarDados())
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, []);

  // Função para cadastrar motorista
  const cadastrarNoSistema = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('motoristas').insert([novoMotorista]);
    if (!error) {
      localStorage.setItem('motorista_nome', novoMotorista.nome);
      setMotoristaLogado(novoMotorista.nome);
    } else {
      alert("Erro ao cadastrar: " + error.message);
    }
  };

  const concluirEntrega = async (id) => {
    const nome = prompt("Quem recebeu?");
    if (!nome) return;
    await supabase.from('entregas').update({ 
      status: 'Concluído', 
      horario_conclusao: new Date().toISOString(),
      recado: `Recebido por: ${nome} (Motorista: ${motoristaLogado})`
    }).eq('id', id);
  };

  // --- TELA DE CADASTRO DO MOTORISTA ---
  if (view === 'motorista' && !motoristaLogado) {
    return (
      <div style={styles.mobileContainer}>
        <div style={{padding: '40px 20px', textAlign: 'center'}}>
          <h1 style={{color: '#38bdf8'}}>🚛 Bem-vindo!</h1>
          <p>Cadastre-se para acessar suas rotas de hoje.</p>
          <form onSubmit={cadastrarNoSistema} style={styles.formCadastro}>
            <input placeholder="Seu Nome Completo" style={styles.inputMobile} onChange={e => setNovoMotorista({...novoMotorista, nome: e.target.value})} required />
            <input placeholder="Placa do Veículo" style={styles.inputMobile} onChange={e => setNovoMotorista({...novoMotorista, placa: e.target.value})} required />
            <input placeholder="Tipo de Veículo (Ex: HR, Fiorino)" style={styles.inputMobile} onChange={e => setNovoMotorista({...novoMotorista, veiculo: e.target.value})} required />
            <button type="submit" style={styles.btnCadastrar}>INICIAR TRABALHO</button>
          </form>
        </div>
      </div>
    );
  }

  // --- TELA DE ROTA (O que ele vê após o cadastro) ---
  if (view === 'motorista' && motoristaLogado) {
    const fila = entregas.filter(e => e.status === 'Pendente');
    const atual = fila[0];
    return (
      <div style={styles.mobileContainer}>
        <header style={styles.header}>
          <div style={{fontSize: '10px', color: '#38bdf8'}}>MOTORISTA: {motoristaLogado.toUpperCase()}</div>
          <h2 style={{margin: 0}}>Minha Rota</h2>
        </header>
        <div style={styles.scrollArea}>
          {atual ? (
            <div style={styles.cardPrincipal}>
              <h1 style={{fontSize: '32px', margin: '10px 0'}}>{atual.cliente}</h1>
              <p>📍 {atual.endereco}</p>
              <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(atual.endereco)}`)} style={styles.btnMapa}>MAPA</button>
              <button onClick={() => concluirEntrega(atual.id)} style={styles.btnConcluir}>CONCLUIR</button>
            </div>
          ) : (
            <div style={{textAlign: 'center', padding: '50px'}}>🏁 Tudo entregue!</div>
          )}
        </div>
      </div>
    );
  }

  // --- GESTOR ---
  return (
    <div style={{padding: '20px', color: '#fff', textAlign: 'center'}}>
      <h1>MODO GESTOR</h1>
      <button onClick={() => setView('motorista')}>Simular Celular</button>
    </div>
  );
}

const styles = {
  mobileContainer: { width: '100vw', height: '100vh', backgroundColor: '#0f172a', color: '#fff', fontFamily: 'sans-serif' },
  header: { padding: '20px', backgroundColor: '#1e293b', borderBottom: '2px solid #38bdf8' },
  scrollArea: { padding: '15px' },
  formCadastro: { display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '30px' },
  inputMobile: { padding: '18px', borderRadius: '12px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '16px' },
  btnCadastrar: { padding: '18px', borderRadius: '12px', border: 'none', backgroundColor: '#38bdf8', color: '#000', fontWeight: 'bold', fontSize: '18px' },
  cardPrincipal: { backgroundColor: '#1e293b', padding: '25px', borderRadius: '25px', borderLeft: '10px solid #38bdf8' },
  btnMapa: { width: '100%', padding: '15px', marginBottom: '10px', borderRadius: '12px', border: 'none', backgroundColor: '#334155', color: '#fff', fontWeight: 'bold' },
  btnConcluir: { width: '100%', padding: '20px', borderRadius: '12px', border: 'none', backgroundColor: '#00ff88', color: '#000', fontWeight: 'bold', fontSize: '18px' }
};

export default App;