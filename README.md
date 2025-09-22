# Dashboard Sentinela

Dashboard web para monitoramento em tempo real do hardware Sentinela via conexão em nuvem.

## 🚀 Funcionalidades

- **Monitoramento em Tempo Real**: Visualização ao vivo dos dados do hardware Sentinela
- **Métricas Principais**:
  - 🌡️ Temperatura ambiente
  - 💧 Umidade relativa do ar
  - ⚡ Tensão da rede elétrica e variação
  - 🌐 Status da conexão Ethernet
- **Gráficos Históricos**: Visualização temporal dos dados de temperatura e umidade
- **Interface Responsiva**: Funciona em desktop, tablet e mobile
- **Status de Conexão**: Indicador visual do estado da conexão com o hardware
- **Atualizações Automáticas**: Dados atualizados a cada 5 segundos

## 🏗️ Arquitetura

```
Dashboard Sentinela
├── Frontend (HTML/CSS/JavaScript)
├── Conexão Cloud (WebSocket/HTTP)
└── Hardware Sentinela
    ├── Sensor de Temperatura
    ├── Sensor de Umidade
    ├── Monitor de Tensão
    └── Interface Ethernet
```

## 📁 Estrutura do Projeto

```
dashboard-sentinela/
├── index.html          # Página principal do dashboard
├── styles.css          # Estilos e tema visual
├── script.js           # Lógica do dashboard e conexão
├── config.json         # Configurações da aplicação
├── sw.js              # Service Worker para funcionalidade offline
└── README.md          # Documentação
```

## 🚀 Como Usar

### 1. Configuração Básica

1. **Clone ou baixe os arquivos** para seu servidor web
2. **Configure a conexão** editando o arquivo `config.json`:
   ```json
   {
     "cloud": {
       "apiEndpoint": "https://sua-api.sentinela.cloud/v1",
       "apiKey": "SUA_CHAVE_API",
       "deviceId": "ID_DO_SEU_DISPOSITIVO"
     }
   }
   ```

### 2. Servindo a Aplicação

#### Servidor HTTP Simples (Python)
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

#### Servidor HTTP (Node.js)
```bash
npx http-server
```

#### Servidor Apache/Nginx
Coloque os arquivos no diretório do servidor web e acesse via navegador.

### 3. Configuração da Conexão Cloud

Para conectar com seu hardware Sentinela real, você precisa:

1. **Configurar o endpoint da API** no `config.json`
2. **Implementar a API do lado do servidor** que recebe dados do hardware
3. **Modificar o método `fetchSentinelaData()`** no `script.js` para usar sua API real

#### Exemplo de Integração com API Real

```javascript
// Substitua no script.js
async fetchSentinelaData() {
    try {
        const response = await fetch(`${this.config.apiEndpoint}/data`, {
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'X-Device-ID': this.config.deviceId
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            this.isConnected = true;
            this.updateConnectionStatus(true);
            return data;
        } else {
            throw new Error('Failed to fetch data');
        }
    } catch (error) {
        console.error('Error fetching Sentinela data:', error);
        this.isConnected = false;
        this.updateConnectionStatus(false);
        return null;
    }
}
```

## 📊 Formato de Dados Esperado

O dashboard espera receber dados no seguinte formato JSON:

```json
{
  "temperature": 25.6,          // Temperatura em °C
  "humidity": 65.2,             // Umidade em %
  "voltage": 220.5,             // Tensão em V
  "voltageVariation": 2.1,      // Variação em %
  "ethernetStatus": true,       // Status da conexão Ethernet
  "ethernetIP": "192.168.1.100", // IP do dispositivo
  "ethernetSpeed": "1 Gbps",    // Velocidade da conexão
  "timestamp": "2024-01-01T12:00:00Z" // Timestamp ISO
}
```

## 🎨 Personalização

### Modificando os Limiares de Alerta

Edite o arquivo `config.json`:

```json
{
  "thresholds": {
    "temperature": {
      "min": 0,
      "max": 40,
      "warningMin": 10,
      "warningMax": 30
    },
    "humidity": {
      "min": 30,
      "max": 80
    },
    "voltage": {
      "min": 200,
      "max": 240,
      "warningMin": 210,
      "warningMax": 230
    }
  }
}
```

### Modificando o Intervalo de Atualização

```json
{
  "dashboard": {
    "updateInterval": 5000,    // 5 segundos
    "maxDataPoints": 50,       // Pontos no gráfico
    "reconnectDelay": 10000    // Delay para reconexão
  }
}
```

## 🔧 Desenvolvimento

### Tecnologias Utilizadas

- **HTML5**: Estrutura da página
- **CSS3**: Estilos e animações
- **JavaScript ES6+**: Lógica da aplicação
- **Chart.js**: Gráficos interativos
- **Font Awesome**: Ícones
- **Service Worker**: Funcionalidade offline

### Estrutura do Código JavaScript

```javascript
class SentinelaDashboard {
    constructor()           // Inicialização
    fetchSentinelaData()    // Busca dados da API
    updateDashboard()       // Atualiza interface
    initializeCharts()      // Configura gráficos
    updateCharts()          // Atualiza gráficos
    updateConnectionStatus()// Status da conexão
}
```

## 📱 Responsividade

O dashboard é totalmente responsivo e funciona em:

- **Desktop**: Tela completa com todos os recursos
- **Tablet**: Layout adaptado para tablets
- **Mobile**: Interface otimizada para smartphones

## 🔒 Segurança

- **HTTPS Recomendado**: Use sempre HTTPS em produção
- **API Key**: Mantenha sua chave de API segura
- **CORS**: Configure CORS adequadamente no servidor
- **Rate Limiting**: Implemente limitação de taxa na API

## 🐛 Solução de Problemas

### Dashboard não conecta
1. Verifique a URL da API no `config.json`
2. Confirme se a API está funcionando
3. Verifique as configurações de CORS
4. Abra o Console do navegador para ver erros

### Dados não aparecem
1. Confirme o formato dos dados da API
2. Verifique se a chave de API está correta
3. Teste a API diretamente via curl/Postman

### Gráficos não carregam
1. Verifique se o Chart.js está carregando
2. Confirme se há dados históricos suficientes
3. Verifique console do navegador para erros

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🤝 Contribuição

Contribuições são bem-vindas! Para contribuir:

1. Faça um Fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Faça Push para a branch
5. Abra um Pull Request

## 📞 Suporte

Para suporte técnico ou dúvidas:

- Abra uma Issue no GitHub
- Consulte a documentação da API
- Verifique os logs do navegador

---

**Dashboard Sentinela v1.0** - Sistema de Monitoramento em Tempo Real