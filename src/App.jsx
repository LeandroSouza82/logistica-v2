import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [motoristas, setMotoristas] = useState([]);
  const [form, setForm] = useState({ nome: '', telefone: '', veiculo: '', placa: '' });
  const [enviado, setEnviado] = useState(false);

  // Detecta se é celular ou se o link tem "?cadastro=sim"
  const isCadastro = window.location.search.includes('cadastro=sim') || window.innerWidth < 600;

  useEffect(() => {
    if (!isCadastro) {
      buscarMotoristas();
      const canal = supabase
        .channel('schema-db-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'motoristas' },
          (payload) => {
            new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play();
            setMotoristas((prev) => [payload.new, ...prev]);
          })
        .subscribe();
      return () => supabase.removeChannel(canal);
    }
  }, [isCadastro]);

  const buscarMotoristas = async () => {
    const { data } = await supabase.from('motoristas').select('*').order('id', { ascending: false });
    if (data) setMotoristas(data);
  };

  const enviarCadastro = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('motoristas').insert([form]);
    if (!error) {
      setEnviado(true);
      alert("Cadastro enviado com sucesso!");
    } else {
      alert("Erro ao enviar: " + error.message);
    }
  };

  // --- TELA DO MOTORISTA (FORMULÁRIO) ---
  if (isCadastro) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#0f172a', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' }}>
        <h2 style={{ color: '#38bdf8', textAlign: 'center' }}>LOGÍSTICA-V2</h2>
        <p style={{ textAlign: 'center' }}>Cadastro de Motorista</p>

        {enviado ? (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#1e293b', borderRadius: '15px' }}>
            <h2 style={{ color: '#00ff88' }}>✅ Sucesso!</h2>
            <p>Seus dados foram enviados. O gestor entrará em contato.</p>
          </div>
        ) : (
          <form onSubmit={enviarCadastro} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
            <input placeholder="Nome Completo" required style={styles.input} onChange={e => setForm({ ...form, nome: e.target.value })} />
            <input placeholder="WhatsApp com DDD" required style={styles.input} onChange={e => setForm({ ...form, telefone: e.target.value })} />
            <input placeholder="Veículo (Ex: Fiorino)" required style={styles.input} onChange={e => setForm({ ...form, veiculo: e.target.value })} />
            <input placeholder="Placa" required style={styles.input} onChange={e => setForm({ ...form, placa: e.target.value })} />
            <button type="submit" style={styles.button}>CADASTRAR AGORA</button>
          </form>
        )}
      </div>
    );
  }

  // --- TELA DO GESTOR (DASHBOARD) ---
  return (
    <div style={{ padding: '30px', backgroundColor: '#0f172a', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>🚚 Gestão Realtime - LOGÍSTICA-V2</h1>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, color: '#00ff88' }}>Faturamento Meta: R$ 1.875.000,00</p>
          <small>Total: {motoristas.length} motoristas</small>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginTop: '30px' }}>
        {motoristas.length === 0 ? <p>Nenhum motorista cadastrado ainda...</p> :
          motoristas.map(m => (
            <div key={m.id} style={styles.card}>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{m.nome}</div>
              <div style={{ color: '#38bdf8', margin: '5px 0' }}>{m.veiculo} - {m.placa}</div>
              <div style={{ fontSize: '14px', color: '#94a3b8' }}>📞 {m.telefone}</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

const styles = {
  input: { padding: '15px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#1e293b', color: '#fff', fontSize: '16px' },
  button: { backgroundColor: '#38bdf8', color: '#000', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' },
  card: { backgroundColor: '#1e293b', padding: '20px', borderRadius: '12px', borderLeft: '6px solid #38bdf8', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }
};

export default App;