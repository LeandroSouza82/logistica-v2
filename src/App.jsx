import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// Som de alerta (link direto para um 'ping' de logística)
const somAlerta = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

function App() {
  const [entregas, setEntregas] = useState([]);
  const [view, setView] = useState(window.innerWidth < 768 ? 'motorista' : 'gestor');
  const [motoristaLogado, setMotoristaLogado] = useState(localStorage.getItem('motorista_nome') || null);
  const [audioDesbloqueado, setAudioDesbloqueado] = useState(false);

  const buscarDados = async () => {
    const { data } = await supabase.from('entregas').select('*').order('ordem', { ascending: true });
    if (data) setEntregas(data);
  };

  // Função para "destravar" o som no celular (exigência dos navegadores)
  const desbloquearAudio = () => {
    somAlerta.play().then(() => {
      somAlerta.pause();
      somAlerta.currentTime = 0;
      setAudioDesbloqueado(true);
    }).catch(() => {});
  };

  useEffect(() => {
    buscarDados();
    const canal = supabase.channel('logistica_v4')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'entregas' }, (payload) => {
        buscarDados();
        // Toca o som apenas se o áudio foi desbloqueado pelo clique
        somAlerta.play().catch(e => console.log("Áudio ainda bloqueado"));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entregas' }, () => buscarDados())
      .subscribe();

    return () => supabase.removeChannel(canal);
  }, []);

  const concluirEntrega = async (id) => {
    const nome = prompt("Quem recebeu?");
    if (!nome) return;
    await supabase.from('entregas').update({ 
      status: 'Concluído', 
      horario_conclusao: new Date().toISOString(),
      recado: `Recebido por: ${nome}`
    }).eq('id', id);
  };

  if (view === 'motorista' && motoristaLogado) {
    const pendentes = entregas.filter(e => e.status === 'Pendente');
    const atual = pendentes[0];
    const proximas = pendentes.slice(1);

    return (
      <div style={styles.mobileContainer} onClick={!audioDesbloqueado ? desbloquearAudio : null}>
        <header style={styles.header}>
          <div style={{fontSize:'10px', color:'#38bdf8'}}>SISTEMA ATIVO - {motoristaLogado.toUpperCase()}</div>
          {!audioDesbloqueado && <div style={styles.avisoSom}>⚠️ Toque aqui para ativar o som</div>}
        </header>

        <main style={styles.scrollArea}>
          {atual ? (
            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
              {/* CARD PRINCIPAL (Sempre no topo) */}
              <div style={styles.cardPrincipal}>
                <div style={styles.badge}>ENTREGA ATUAL</div>
                <h1 style={{margin:'10px 0', fontSize:'28px'}}>{atual.cliente}</h1>
                <p style={{color:'#cbd5e1'}}>📍 {atual.endereco}</p>
                <div style={styles.gridAcoes}>
                  <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(atual.endereco)}`)} style={styles.btnMapa}>MAPA</button>
                  <button onClick={() => concluirEntrega(atual.id)} style={styles.btnConcluir}>CONCLUIR</button>
                </div>
              </div>

              {/* LISTA DE PRÓXIMAS (Um embaixo do outro) */}
              {proximas.length > 0 && <h3 style={{color:'#94a3b8', margin:'10px 0'}}>Próximas Paradas</h3>}
              {proximas.map((ent, i) => (
                <div key={ent.id} style={styles.cardMenor}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'11px', color:'#38bdf8'}}>{i + 2}ª PARADA</div>
                    <div style={{fontWeight:'bold'}}>{ent.cliente}</div>
                    <div style={{fontSize:'12px', color:'#94a3b8'}}>{ent.endereco}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ANIMAÇÃO DE ESPERA QUANDO NÃO HÁ ROTAS */
            <div style={styles.containerEspera}>
              <div className="radar"></div>
              <h3 style={{marginTop:'20px'}}>Aguardando rotas...</h3>
              <p style={{fontSize:'12px', color:'#64748b'}}>Você será avisado com um sinal sonoro</p>
              <style>{`
                .radar {
                  width: 80px; height: 80px;
                  background: #38bdf8; border-radius: 50%;
                  animation: pulse 2s infinite;
                }
                @keyframes pulse {
                  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.7); }
                  70% { transform: scale(1); box-shadow: 0 0 0 30px rgba(56, 189, 248, 0); }
                  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); }
                }
              `}</style>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Fallback para login ou gestor
  return <div style={{padding:'50px', color:'#fff', textAlign:'center'}}>
    <button onClick={() => { localStorage.setItem('motorista_nome', 'Motorista'); window.location.reload(); }}>Entrar como Motorista</button>
  </div>;
}

const styles = {
  mobileContainer: { width: '100vw', height: '100vh', backgroundColor: '#0f172a', color: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  header: { padding: '15px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155', textAlign: 'center' },
  avisoSom: { fontSize: '10px', color: '#fbbf24', marginTop: '5px' },
  scrollArea: { flex: 1, overflowY: 'auto', padding: '15px' },
  cardPrincipal: { backgroundColor: '#1e293b', padding: '20px', borderRadius: '20px', borderLeft: '8px solid #38bdf8', boxShadow: '0 10px 15px rgba(0,0,0,0.3)' },
  badge: { backgroundColor: '#38bdf8', color: '#000', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', display: 'inline-block' },
  gridAcoes: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' },
  btnMapa: { padding: '15px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold' },
  btnConcluir: { padding: '18px', backgroundColor: '#00ff88', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '18px' },
  cardMenor: { backgroundColor: '#1e293b', padding: '15px', borderRadius: '12px', opacity: 0.7, borderLeft: '4px solid #475569' },
  containerEspera: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }
};

export default App;