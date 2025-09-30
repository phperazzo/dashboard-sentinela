class SentinelaDashboard {
    constructor() {
        this.dataHistory = {
            temperature: [],
            humidity: [],
            voltage: [],
            network: [],
            timestamps: []
        };

        this.asyncStatus = {
            rede: "desconhecido",
            ultimosEventos: []
        };

        this.isConnected = false;
        this.maxDataPoints = 50;
        this.config = {};
        this.ws = null;
        
        this.loadConfig().then(() => {
            this.init();
        });
    }

    async loadConfig() {
        try {
            const response = await fetch("config.json");
            if (response.ok) {
                this.config = await response.json();
                this.maxDataPoints = this.config.dashboard?.maxDataPoints || 50;
            }
        } catch (err) {
            console.error("Erro ao carregar config.json:", err);
        }
    }

    init() {
        this.setupEventListeners();
        this.initializeCharts();
        this.initializeEmptyDashboard();
        this.connectToWebSocket();
    }

    connectToWebSocket() {
        let wsUrl;
        if (window.location.protocol === "https:") {
            wsUrl = "wss://" + window.location.host;
        } else {
            wsUrl = "ws://" + window.location.host;
        }
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log("🔌 Conectado ao WebSocket do backend");
            this.updateConnectionStatus(true);
            this.updateMQTTStatus(true);
        };

        this.ws.onclose = () => {
            console.warn("WebSocket desconectado");
            this.updateConnectionStatus(false);
            this.updateMQTTStatus(false);
        };

        this.ws.onerror = (err) => {
            console.error("Erro WebSocket:", err);
            this.updateConnectionStatus(false);
            this.updateMQTTStatus(false);
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === "mqtt_message") {
                    console.log("📡 Dados MQTT recebidos:", msg.data);
                    
                    // Processar array de sensores
                    if (Array.isArray(msg.data)) {
                        msg.data.forEach(sensorData => this.processSensorData(sensorData));
                    } else {
                        // Processar sensor único
                        this.processSensorData(msg.data);
                    }
                }
            } catch (e) {
                console.error("Erro ao processar mensagem WebSocket:", e);
            }
        };
    }

    processSensorData(data) {
        if (!data || !data.sensor || !data.reading || 
            (typeof data.reading.value !== "number" && typeof data.reading.value !== "string")) {
            console.log("Dados de sensor inválidos:", data);
            return;
        }

        const timeLabel = data.timestamp_unix ?
            new Date(data.timestamp_unix * 1000).toLocaleTimeString("pt-BR") :
            new Date().toLocaleTimeString("pt-BR");

        console.log(`📊 Processando sensor: ${data.sensor} = ${data.reading.value}${data.reading.unit || ''}`);

        switch (data.sensor) {
            case "temperatura":
                this.updateRealChart("temperature", data.reading.value, timeLabel, data.reading.unit || "°C");
                this.updateMetric("temperature", data.reading.value.toFixed(1), this.getTemperatureStatus(data.reading.value));
                break;
            case "umidade":
                this.updateRealChart("humidity", data.reading.value, timeLabel, data.reading.unit || "%");
                this.updateMetric("humidity", data.reading.value.toFixed(1), this.getHumidityStatus(data.reading.value));
                break;
            case "rede":
                // Processar status da rede (ON/OFF) -> Conectado/Desconectado
                const networkStatus = data.reading.value === "ON" ? "Conectado" : "Desconectado";
                this.updateMetric("network", networkStatus, this.getNetworkStatusFromValue(data.reading.value));
                break;
            case "energia":
                // Processar status da energia (ON/OFF)
                this.updateMetric("voltage", data.reading.value, this.getEnergyStatus(data.reading.value));
                break;
            case "tensao":
                // Manter compatibilidade com tensão (valor numérico)
                this.updateRealChart("voltage", data.reading.value, timeLabel, data.reading.unit || "V");
                this.updateMetric("voltage", data.reading.value.toFixed(1), this.getVoltageStatus(data.reading.value));
                
                // Determinar status da rede baseado na tensão
                const isOnline = data.reading.value > 200;
                const networkStatusFromVoltage = isOnline ? "Online" : "Offline";
                this.updateMetric("network", networkStatusFromVoltage, this.getNetworkStatus(isOnline));
                break;
            default:
                console.log("Sensor desconhecido:", data.sensor);
        }
        
        this.updateLastUpdateTime();
    }

    initializeEmptyDashboard() {
        this.updateMetric("temperature", "--", { class: "disabled", text: "Sem dados" });
        this.updateMetric("humidity", "--", { class: "disabled", text: "Sem dados" });
        this.updateMetric("network", "--", { class: "disabled", text: "Sem dados" });
        this.updateMetric("voltage", "--", { class: "disabled", text: "Sem dados" });
        this.updateConnectionStatus(false);
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

    updateConnectionStatus(connected) {
        this.isConnected = connected;
        const statusElement = document.getElementById("connectionStatus");
        if (statusElement) {
            const icon = statusElement.querySelector("i");
            const text = statusElement.querySelector("span");
            if (connected) {
                statusElement.className = "connection-status connected";
                icon.className = "fas fa-wifi";
                text.textContent = "Conectado";
            } else {
                statusElement.className = "connection-status disconnected";
                icon.className = "fas fa-wifi-slash";
                text.textContent = "Desconectado";
            }
        }
    }

    updateMQTTStatus(connected) {
        const statusElement = document.getElementById("mqttStatus");
        if (statusElement) {
            if (connected) {
                statusElement.className = "mqtt-status connected";
                statusElement.innerHTML = "<i class=\"fas fa-database\"></i> MQTT Online";
            } else {
                statusElement.className = "mqtt-status disconnected";
                statusElement.innerHTML = "<i class=\"fas fa-database\"></i> MQTT Offline";
            }
        }
    }

    updateMetric(metricType, value, status) {
        const valueElement = document.getElementById(metricType + "Value");
        const statusElement = document.getElementById(metricType + "Status");
        
        if (valueElement) valueElement.textContent = value;
        if (statusElement) {
            statusElement.className = `metric-status ${status.class}`;
            if (statusElement.querySelector(".status-text")) {
                statusElement.querySelector(".status-text").textContent = status.text;
            } else {
                statusElement.textContent = status.text;
            }
        }
    }

    getTemperatureStatus(temp) {
        if (temp < 0 || temp > 40) return { class: "danger", text: "Temperatura crítica!" };
        else if (temp < 10 || temp > 30) return { class: "warning", text: "Temperatura elevada" };
        else return { class: "normal", text: "Temperatura normal" };
    }

    getHumidityStatus(humidity) {
        if (humidity < 30 || humidity > 80) return { class: "warning", text: "Umidade fora do ideal" };
        else return { class: "normal", text: "Umidade ideal" };
    }

    getNetworkStatusFromValue(value) {
        if (value === "ON") {
            return { class: "normal", text: "Rede conectada" };
        } else {
            return { class: "danger", text: "Rede desconectada" };
        }
    }

    getEnergyStatus(value) {
        if (value === "ON") {
            return { class: "normal", text: "Energia estável" };
        } else {
            return { class: "danger", text: "Sem energia" };
        }
    }

    getNetworkStatus(isOnline) {
        if (isOnline) {
            return { class: "normal", text: "Rede conectada" };
        } else {
            return { class: "danger", text: "Rede desconectada" };
        }
    }

    getNetworkStatusFromValue(value) {
        if (value === "ON") {
            return { class: "normal", text: "Rede conectada" };
        } else {
            return { class: "danger", text: "Rede desconectada" };
        }
    }

    getEnergyStatus(value) {
        if (value === "ON") {
            return { class: "normal", text: "Energia estável" };
        } else {
            return { class: "danger", text: "Sem energia" };
        }
    }

    getVoltageStatus(voltage) {
        if (voltage < 200 || voltage > 240) return { class: "danger", text: "Tensão crítica!" };
        else if (voltage < 210 || voltage > 230) return { class: "warning", text: "Tensão instável" };
        else return { class: "normal", text: "Tensão estável" };
    }

    initializeCharts() {
        console.log("Inicializando gráficos...");
        // Placeholder para gráficos Chart.js
    }

    updateChart(sensorType) {
        console.log("Atualizando gráfico:", sensorType);
        // Placeholder para atualização de gráficos
    }

    updateLastUpdateTime() {
        const lastUpdateElement = document.getElementById("lastUpdate");
        if (lastUpdateElement) {
            lastUpdateElement.textContent = new Date().toLocaleString("pt-BR");
        }
    }

    setupEventListeners() {
        window.addEventListener("beforeunload", () => this.cleanup());
    }

    cleanup() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
    const dashboard = new SentinelaDashboard();
});
