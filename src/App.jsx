import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [motoristas, setMotoristas] = useState([]);

  // Função para buscar motoristas do Banco de Dados
  const buscarMotoristas = async () => {
    const { data } = await supabase.from('motoristas').select('*');
    if (data) setMotoristas(data);
  };

  useEffect(() => {
    buscarMotoristas();

    // CONFIGURAÇÃO REALTIME: Ouve o celular do motorista
    const canal = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'motoristas' },
        (payload) => {
          // Toca um som de notificação quando alguém se cadastra
          new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play();
          // Atualiza a lista na tela na hora
          setMotoristas((prev) => [...prev, payload.new]);
        })
      .subscribe();

    return () => supabase.removeChannel(canal);
  }, []);

  return (
    <div style={{ padding: '30px', backgroundColor: '#0f172a', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1>🚚 Gestão de Frota Realtime</h1>
      <p>Abaixo aparecem os motoristas que se cadastram pelo celular:</p>

      <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
        {motoristas.length === 0 ? <p>Aguardando novos cadastros...</p> :
          motoristas.map(m => (
            <div key={m.id} style={{ padding: '15px', backgroundColor: '#1e293b', borderRadius: '10px', borderLeft: '5px solid #00ff88' }}>
              <strong>{m.nome}</strong> - {m.veiculo} ({m.placa}) <br />
              <small>WhatsApp: {m.telefone}</small>
            </div>
          ))
        }
      </div>
    </div>
  );
}

export default App;