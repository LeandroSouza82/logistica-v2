import React from 'react';

function App() {
  // Dados baseados na sua planilha de lucratividade
  const dados = {
    faturamentoTotal: "1.875.000,00",
    comissaoApp: "187.500,00",
    impostos: "28.125,00",
    taxasCartao: "75.000,00",
    lucroLiquido: "57.875,00",
    totalMotoristas: 500
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      <h1 style={{ color: '#2c3e50' }}>🚚 Painel Logística - Progeto Entregas</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>

        {/* Card de Faturamento */}
        <div style={cardStyle}>
          <h3>Faturamento Corridas</h3>
          <p style={{ fontSize: '24px', color: '#27ae60', fontWeight: 'bold' }}>R$ {dados.faturamentoTotal}</p>
        </div>

        {/* Card de Comissão */}
        <div style={cardStyle}>
          <h3>Minha Comissão (10%)</h3>
          <p style={{ fontSize: '24px', color: '#2980b9', fontWeight: 'bold' }}>R$ {dados.comissaoApp}</p>
        </div>

        {/* Card de Resultado Líquido */}
        <div style={cardStyle}>
          <h3>Resultado Líquido</h3>
          <p style={{ fontSize: '24px', color: '#e67e22', fontWeight: 'bold' }}>R$ {dados.lucroLiquido}</p>
        </div>

        {/* Card de Motoristas */}
        <div style={cardStyle}>
          <h3>Frota Ativa</h3>
          <p style={{ fontSize: '24px', color: '#8e44ad', fontWeight: 'bold' }}>{dados.totalMotoristas} Motoristas</p>
        </div>

      </div>

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#fff', borderRadius: '8px', textAlign: 'center', color: '#95a5a6' }}>
        📍 Mapa de Monitoramento em Tempo Real (Próximo Passo)
      </div>
    </div>
  );
}

const cardStyle = {
  backgroundColor: '#fff',
  padding: '20px',
  borderRadius: '10px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  textAlign: 'center'
};

export default App;