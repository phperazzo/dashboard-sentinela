# Dashboard Sentinela

Sistema completo de monitoramento para data center com autenticação segura, dashboard em tempo real e simulador de sensores integrado.

## 🚀 Funcionalidades

- **🔐 Sistema de Autenticação**: Login seguro com JWT e proteção contra ataques
- **📊 Dashboard em Tempo Real**: Monitoramento ao vivo dos sensores do data center
- **⚙️ Configurações**: Interface para alteração de senhas e configurações do sistema
- **📈 Gráficos Interativos**: Visualização temporal com Chart.js
- **🔄 Dados Simulados**: Simulador integrado para desenvolvimento e testes
- **📱 Interface Responsiva**: Funciona em desktop, tablet e mobile
- **🛡️ Segurança Avançada**: Rate limiting, headers de segurança, validação rigorosa

### Métricas Monitoradas:
- 🌡️ **Temperatura ambiente**
- 💧 **Umidade relativa do ar**
- ⚡ **Tensão da rede elétrica**
- 🌐 **Status da rede/energia**
- 📡 **Conectividade MQTT**

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
├── 📄 login.html           # Tela de autenticação
├── 📄 dashboard.html       # Dashboard principal
├── 📄 settings.html        # Configurações do sistema
├── 🎨 styles.css          # Estilos globais
├── ⚙️ script.js           # Lógica do dashboard
├── 📋 config.json         # Configurações da aplicação
├── 🔧 sw.js               # Service Worker
├── 📚 README.md           # Documentação
├── 📄 LOGIN_CREDENTIALS.md # Credenciais de acesso
└── 📁 Back/               # Servidor Backend
    ├── 🚀 server.js       # Servidor principal
    ├── 📦 package.json    # Dependências Node.js
    ├── 🔑 user-config.json # Configuração do usuário
    └── 🛠️ *.js            # Scripts auxiliares
```

## 🚀 Como Iniciar o Sistema

### Pré-requisitos
- **Node.js** (versão 14 ou superior)
- **npm** ou **yarn**
- Terminal/Command Prompt

### 1. Instalação das Dependências

```bash
# Navegue até a pasta do backend
cd Back/

# Instale as dependências
npm install
```

### 2. Iniciando o Servidor

```bash
# Na pasta Back/
node server.js
```

O servidor iniciará na porta **3000** e você verá a mensagem:
```
🚀 Servidor HTTP rodando na porta 3000 em 0.0.0.0
```

### 3. Acessando a Aplicação

Abra seu navegador e acesse:
```
http://localhost:3000
```

### 4. Login no Sistema

Use as credenciais padrão:
- **Usuário:** `admin`
- **Senha:** `admin`

### 5. Comandos Úteis

#### Parar o Servidor
```bash
# No terminal onde o servidor está rodando
Ctrl + C
```

#### Forçar Parada (se necessário)
```bash
# Em outro terminal
pkill -f "node.*server.js"
```

#### Iniciar com npm (alternativo)
```bash
# Se configurado no package.json
npm start
```

### 6. Estrutura de Inicialização

```
1. 📁 cd Back/
2. 📦 npm install
3. 🚀 node server.js
4. 🌐 http://localhost:3000
5. 🔑 Login: admin/admin
```

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

#### Frontend
- **HTML5**: Estrutura das páginas
- **CSS3**: Estilos e animações responsivas
- **JavaScript ES6+**: Lógica da aplicação
- **Chart.js**: Gráficos interativos em tempo real
- **Font Awesome**: Biblioteca de ícones
- **Service Worker**: Funcionalidade offline

#### Backend  
- **Node.js**: Runtime JavaScript
- **Express.js**: Framework web
- **JWT**: Autenticação segura
- **bcrypt**: Hash de senhas
- **WebSocket**: Comunicação em tempo real
- **MQTT**: Protocolo de sensores IoT
- **express-rate-limit**: Proteção contra ataques

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

### Recursos de Segurança Implementados

- **🛡️ Autenticação JWT**: Tokens seguros com expiração
- **🔐 Hash de Senhas**: bcrypt com salt rounds
- **⏱️ Rate Limiting**: Proteção contra força bruta (5 tentativas/15min)
- **🍪 Cookies Seguros**: HttpOnly, Secure, SameSite
- **📋 Headers de Segurança**: XSS, Clickjacking, MIME sniffing
- **🔍 CSP**: Content Security Policy configurado
- **🧹 Validação Rigorosa**: Sanitização de entrada
- **🌐 Detecção de Rede**: Proteção inteligente contra bloqueios offline
- **🔒 Middleware de Proteção**: Múltiplas camadas de segurança

### Configurações Recomendadas para Produção

- **HTTPS**: Use sempre SSL/TLS em produção
- **Proxy Reverso**: Configure nginx ou similar
- **Firewall**: Restrinja acesso às portas necessárias
- **Monitoramento**: Logs de segurança e alertas
- **Backup**: Configuração regular do user-config.json

## 🐛 Solução de Problemas

### Servidor não inicia
```bash
# Verifique se o Node.js está instalado
node --version

# Verifique se as dependências foram instaladas
cd Back/ && npm install

# Verifique se a porta 3000 está livre
netstat -an | grep 3000
```

### Login não funciona
1. **Credenciais**: Use `admin`/`admin`
2. **Hash da senha**: Arquivo `user-config.json` deve ter hash válido
3. **Rate limiting**: Aguarde 15 minutos se bloqueado
4. **Conexão**: Verifique se servidor está rodando

### Dashboard não carrega dados
1. **WebSocket**: Verifique conexão no console do navegador
2. **MQTT**: Erros de timeout são normais (simulador)
3. **Gráficos**: Aguarde alguns segundos para dados aparecerem
4. **Console**: Abra F12 para ver erros JavaScript

### Erros comuns
```bash
# Porta já em uso
Error: listen EADDRINUSE :::3000
Solução: pkill -f "node.*server.js"

# Módulos não encontrados
Cannot find module 'express'
Solução: npm install

# Permissões
EACCES: permission denied
Solução: Use porta > 1024 ou sudo (não recomendado)
```

### Comandos úteis para debug
```bash
# Ver processos rodando na porta 3000
lsof -i :3000

# Logs em tempo real
tail -f /var/log/nodejs/app.log

# Testar API diretamente
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

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