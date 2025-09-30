class SentinelaDashboard {
    updateMQTTStatus(connected) {
        const statusElement = document.getElementById('mqttStatus');
        if (statusElement) {
            if (connected) {
                statusElement.className = 'mqtt-status connected';
                statusElement.innerHTML = '<i class="fas fa-database"></i> MQTT Online';
            } else {
                statusElement.className = 'mqtt-status disconnected';
                statusElement.innerHTML = '<i class="fas fa-database"></i> MQTT Offline';
            }
        }
    }
    constructor() {
        this.isConnected = false;
        this.temperatureChart = null;
        this.humidityChart = null;
        this.voltageChart = null;
        
        this.dataHistory = {
            temperature: [],
            humidity: [],
            voltage: [],
            timestamps: []
        };
        
        this.asyncStatus = {
            rede: 'desconectado',
            ultimosEventos: []
        };

        this.maxDataPoints = 50;
        this.config = {};
    this.ws = null;
        
        this.loadConfig().then(() => {
            this.init();
        });
    }

    async loadConfig() {
        try {
            const response = await fetch('config.json'); // Mantém apenas o fetch do config.json local
            if (response.ok) {
                this.config = await response.json();
                this.maxDataPoints = this.config.dashboard?.maxDataPoints || 50;
            }
        } catch (err) {
            console.error('Erro ao carregar config.json:', err);
        }
    }

    init() {
        this.setupEventListeners();
        this.initializeCharts();
        this.initializeEmptyDashboard();
        this.connectToWebSocket();
    }

    connectToWebSocket() {
        // Conecta ao WebSocket na mesma porta do site (backend), usando o mesmo protocolo
        let wsUrl;
        if (window.location.protocol === 'https:') {
            wsUrl = 'wss://' + window.location.host;
        } else {
            wsUrl = 'ws://' + window.location.host;
        }
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('🔌 Conectado ao WebSocket do backend');
            this.updateConnectionStatus(true);
            this.updateMQTTStatus(true);
        };

        this.ws.onclose = () => {
            console.warn('WebSocket desconectado');
            this.updateConnectionStatus(false);
            this.updateMQTTStatus(false);
        };

        this.ws.onerror = (err) => {
            console.error('Erro WebSocket:', err);
            this.updateConnectionStatus(false);
            this.updateMQTTStatus(false);
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'mqtt_message') {
                    // Só processa dados vindos do MQTT da nuvem
                    console.log('📡 Dados MQTT:', msg.topic, msg.data);
                    if (msg.data.temperature) {
                        this.updateRealChart('temperature', msg.data.temperature, new Date().toLocaleTimeString('pt-BR'), '°C');
                        this.updateMetric('temperature', msg.data.temperature.toFixed(1), this.getTemperatureStatus(msg.data.temperature));
                    }
                    if (msg.data.humidity) {
                        this.updateRealChart('humidity', msg.data.humidity, new Date().toLocaleTimeString('pt-BR'), '%');
                        this.updateMetric('humidity', msg.data.humidity.toFixed(1), this.getHumidityStatus(msg.data.humidity));
                    }
                    if (msg.data.voltage) {
                        this.updateRealChart('voltage', msg.data.voltage, new Date().toLocaleTimeString('pt-BR'), 'V');
                        this.updateMetric('voltage', msg.data.voltage.toFixed(1), this.getVoltageStatus(msg.data.voltage));
                    }
                }
            } catch (e) {
                console.error('Erro ao processar mensagem WebSocket:', e);
            }
        };
    }
    
    initializeEmptyDashboard() {
        this.updateMetric('temperature', '--', { class: 'disabled', text: 'Sem dados' });
        this.updateMetric('humidity', '--', { class: 'disabled', text: 'Sem dados' });
        this.updateMetric('voltage', '--', { class: 'disabled', text: 'Sem dados' });
        this.updateNetworkStatus('desconectado');
        this.updateConnectionStatus(false);
    }


    processSyncData(data) {
        if (!data || !data.sensor || !data.reading) {
            console.log('Dados sync inválidos:', data);
            return;
        }
        
        const now = new Date();
        const timeLabel = now.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });

        const value = data.reading.value;
        const unit = data.reading.unit;

        console.log(`📊 Dados sync: ${data.sensor} = ${value}${unit}`);

        switch (data.sensor) {
            case 'temperatura':
                this.updateRealChart('temperature', value, timeLabel, '°C');
                this.updateMetric('temperature', value.toFixed(1), this.getTemperatureStatus(value));
                break;
                
            case 'umidade':
                this.updateRealChart('humidity', value, timeLabel, '%');
                this.updateMetric('humidity', value.toFixed(1), this.getHumidityStatus(value));
                break;
                
            case 'tensao':
                this.updateRealChart('voltage', value, timeLabel, 'V');
                this.updateMetric('voltage', value.toFixed(1), this.getVoltageStatus(value));
                break;
                
            default:
                console.log('Sensor desconhecido:', data.sensor);
        }
        
        this.updateLastUpdateTime();
    }

    processAsyncData(data) {
        if (!data || !data.event) {
            console.log('Dados async inválidos:', data);
            return;
        }
        
        console.log('🔔 Evento async:', data);

        switch (data.event) {
            case 'rede_status':
                this.updateNetworkStatus(data.value);
                this.addToEventLog(data);
                break;
                
            default:
                console.log('Evento desconhecido:', data.event);
        }
    }

    updateRealChart(sensorType, value, timestamp, unit) {
        if (!this.dataHistory[sensorType]) return;
        
        this.dataHistory[sensorType].push(value);
        this.dataHistory.timestamps.push(timestamp);
        
        if (this.dataHistory[sensorType].length > this.maxDataPoints) {
            this.dataHistory[sensorType].shift();
            this.dataHistory.timestamps.shift();
        }
        
        this.updateChart(sensorType);
    }

    updateNetworkStatus(status) {
        // Suporte a objeto: status pode ser string ('online'/'offline') ou objeto { value, ip, velocidade }
        let value = status, ip = '--', velocidade = '--';
        if (typeof status === 'object' && status !== null) {
            value = status.value;
            ip = status.ip || '--';
            velocidade = status.velocidade || '--';
        }
        const isConnected = value === 'online';
        this.asyncStatus.rede = value;

        const indicatorElement = document.getElementById('ethernetIndicator');
        const textElement = document.getElementById('ethernetText');
        const ipElement = document.getElementById('ethernetIP');
        const speedElement = document.getElementById('ethernetSpeed');

        if (ipElement) ipElement.textContent = ip;
        if (speedElement) speedElement.textContent = velocidade;

        if (indicatorElement && textElement) {
            if (isConnected) {
                indicatorElement.className = 'status-indicator connected';
                textElement.textContent = 'Conectado';
                this.showNotification('Rede conectada', 'success');
            } else {
                indicatorElement.className = 'status-indicator disconnected';
                textElement.textContent = 'Desconectado';
                this.showNotification('Rede desconectada', 'error');
            }
        }
    }

    updateConnectionStatus(connected) {
        this.isConnected = connected;
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            const icon = statusElement.querySelector('i');
            const text = statusElement.querySelector('span');
            if (connected) {
                statusElement.className = 'connection-status connected';
                icon.className = 'fas fa-wifi';
                text.textContent = 'Conectado ao backend';
            } else {
                statusElement.className = 'connection-status disconnected';
                icon.className = 'fas fa-wifi-slash';
                text.textContent = 'Desconectado';
            }
        }
    }

    // ... (mantenha os outros métodos iguais)

    updateMetric(metricType, value, status) {
        const valueElement = document.getElementById(metricType);
        const statusElement = document.getElementById(metricType + 'Status');
        
        if (valueElement) valueElement.textContent = value;
        if (statusElement) {
            statusElement.className = `metric-status ${status.class}`;
            statusElement.querySelector('.status-text').textContent = status.text;
        }
    }

    getTemperatureStatus(temp) {
        if (temp < 0 || temp > 40) return { class: 'danger', text: 'Temperatura crítica!' };
        else if (temp < 10 || temp > 30) return { class: 'warning', text: 'Temperatura elevada' };
        else return { class: 'normal', text: 'Temperatura normal' };
    }

    getHumidityStatus(humidity) {
        if (humidity < 30 || humidity > 80) return { class: 'warning', text: 'Umidade fora do ideal' };
        else return { class: 'normal', text: 'Umidade ideal' };
    }

    getVoltageStatus(voltage) {
        if (voltage < 200 || voltage > 240) return { class: 'danger', text: 'Tensão crítica!' };
        else if (voltage < 210 || voltage > 230) return { class: 'warning', text: 'Tensão instável' };
        else return { class: 'normal', text: 'Tensão estável' };
    }

    initializeCharts() {
        console.log('Inicializando gráficos...');
        // Seu código de gráficos
    }

    updateChart(sensorType) {
        console.log('Atualizando gráfico:', sensorType);
        // Seu código de gráficos
    }

    updateLastUpdateTime() {
        const lastUpdateElement = document.getElementById('lastUpdate');
        if (lastUpdateElement) {
            lastUpdateElement.textContent = new Date().toLocaleString('pt-BR');
        }
    }

    setupEventListeners() {
        window.addEventListener('beforeunload', () => this.cleanup());
    }

    addToEventLog(eventData) {
        const timestamp = eventData.timestamp_unix 
            ? new Date(eventData.timestamp_unix * 1000).toLocaleString('pt-BR')
            : new Date().toLocaleString('pt-BR');
            
        this.asyncStatus.ultimosEventos.unshift({
            event: eventData.event,
            value: eventData.value,
            timestamp: timestamp
        });
        
        if (this.asyncStatus.ultimosEventos.length > 10) {
            this.asyncStatus.ultimosEventos.pop();
        }
        
        this.updateEventLogDisplay();
    }

    updateEventLogDisplay() {
        const logContainer = document.getElementById('eventLog');
        if (logContainer) {
            logContainer.innerHTML = this.asyncStatus.ultimosEventos
                .map(event => `
                    <div class="event-log-item">
                        <span class="event-time">${event.timestamp}</span>
                        <span class="event-type">${event.event}</span>
                        <span class="event-value ${event.value === 'online' ? 'online' : 'offline'}">${event.value}</span>
                    </div>
                `)
                .join('');
        }
    }

    showNotification(message, type = 'info') {
        console.log(`${type.toUpperCase()}: ${message}`);
    }

    cleanup() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    window.sentinelaDashboard = new SentinelaDashboard();
});