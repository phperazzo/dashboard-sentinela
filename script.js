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
        this.firstDataReceived = false;
        
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

        // Primeira vez recebendo dados reais - remover mensagens de aguardando
        this.onFirstDataReceived();

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
                this.updateNetworkKPI(data.reading.value === "ON");
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
                this.updateNetworkKPI(isOnline);
                break;
            default:
                console.log("Sensor desconhecido:", data.sensor);
        }
        
        this.updateLastUpdateTime();
        this.updateKPIValues();
        this.updateSystemHealth();
    }

    updateNetworkKPI(isOnline) {
        const networkKPI = document.getElementById('networkKPI');
        if (networkKPI) {
            networkKPI.textContent = isOnline ? 'Online' : 'Offline';
        }
    }

    updateSystemHealth() {
        const healthElement = document.getElementById('systemHealth');
        const lastDataElement = document.getElementById('lastDataReceived');
        
        if (healthElement) {
            // Calcular saúde do sistema baseado nos sensores ativos
            let activeSensors = 0;
            let totalSensors = 4; // temp, humidity, network, voltage
            
            if (this.dataHistory.temperature.length > 0) activeSensors++;
            if (this.dataHistory.humidity.length > 0) activeSensors++;
            if (this.dataHistory.voltage.length > 0) activeSensors++;
            if (this.isConnected) activeSensors++;
            
            const health = Math.round((activeSensors / totalSensors) * 100);
            healthElement.textContent = health + '%';
        }
        
        if (lastDataElement) {
            lastDataElement.textContent = 'Último dado: ' + new Date().toLocaleTimeString("pt-BR");
        }
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
                statusElement.textContent = "MQTT Online";
                const icon = document.createElement('i');
                icon.className = 'fas fa-database';
                statusElement.insertBefore(icon, statusElement.firstChild);
            } else {
                statusElement.className = "mqtt-status disconnected";
                statusElement.textContent = "MQTT Offline";
                const icon = document.createElement('i');
                icon.className = 'fas fa-database';
                statusElement.insertBefore(icon, statusElement.firstChild);
            }
        }
    }

    updateMetric(metricType, value, status) {
        // Os cards duplicados foram removidos, apenas manter compatibilidade
        // Os dados são mostrados nos KPIs do topo da página
        console.log(`Métrica ${metricType}: ${value} - ${status.text}`);
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
        this.charts = {};
        
        // Inicializar gráficos com animações
        this.initMainChart();
        this.initAreaChart(); 
        this.initEnvironmentChart();
        
        // Adicionar animações de entrada
        this.addChartAnimations();
        
        // Funcionalidade da sidebar móvel
        this.setupMobileMenu();
        
        // KPIs aguardam dados reais do hardware
        this.initializeEmptyKPIs();
    }

    initMainChart() {
        const ctx = document.getElementById('mainChart');
        if (!ctx) return;

        // Definir altura adequada para o canvas
        ctx.style.height = '400px';
        ctx.style.width = '100%';

        this.charts.mainChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '⚡ Tensão Elétrica',
                    data: [],
                    borderColor: '#667eea',
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const {ctx, chartArea} = chart;
                        if (!chartArea) return null;
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, 'rgba(102, 126, 234, 0.4)');
                        gradient.addColorStop(0.5, 'rgba(118, 75, 162, 0.2)');
                        gradient.addColorStop(1, 'rgba(118, 75, 162, 0.05)');
                        return gradient;
                    },
                    borderWidth: 4,
                    pointRadius: 0,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 3,
                    pointHoverBackgroundColor: '#ff6b6b',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 3,
                    tension: 0.4,
                    fill: true
                }, {
                    label: '💧 Umidade',
                    data: [],
                    borderColor: '#4ecdc4',
                    backgroundColor: (context) => {
                        const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 400);
                        gradient.addColorStop(0, 'rgba(78, 205, 196, 0.4)');
                        gradient.addColorStop(1, 'rgba(78, 205, 196, 0.05)');
                        return gradient;
                    },
                    borderWidth: 4,
                    pointRadius: 0,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#4ecdc4',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 3,
                    pointHoverBackgroundColor: '#4ecdc4',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 3,
                    tension: 0.4,
                    fill: true
                }, {
                    label: '⚡ Tensão',
                    data: [],
                    borderColor: '#feca57',
                    backgroundColor: (context) => {
                        const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 400);
                        gradient.addColorStop(0, 'rgba(254, 202, 87, 0.4)');
                        gradient.addColorStop(1, 'rgba(254, 202, 87, 0.05)');
                        return gradient;
                    },
                    borderWidth: 4,
                    pointRadius: 0,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#feca57',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 3,
                    pointHoverBackgroundColor: '#feca57',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 3,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'start',
                        labels: {
                            padding: 25,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: {
                                size: 13,
                                weight: '600'
                            },
                            color: '#2c3e50'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(44, 62, 80, 0.95)',
                        titleColor: '#ecf0f1',
                        bodyColor: '#ecf0f1',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        cornerRadius: 12,
                        displayColors: true,
                        padding: 15,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: 'rgba(52, 73, 94, 0.08)',
                            lineWidth: 1
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            padding: 15,
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            color: '#7f8c8d'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            maxTicksLimit: 8,
                            padding: 15,
                            font: {
                                size: 12,
                                weight: '500'
                            },
                            color: '#7f8c8d'
                        }
                    }
                }
            }
        });
    }

    initAreaChart() {
        const ctx = document.getElementById('tempHumidityChart');
        if (!ctx) return;

        // Definir altura adequada para o canvas
        ctx.style.height = '300px';
        ctx.style.width = '100%';

        this.charts.tempHumidityChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Rede', 'Energia', 'Temperatura', 'Umidade'],
                datasets: [{
                    label: 'Status dos Sensores',
                    data: [0, 0, 0, 0],
                    backgroundColor: [
                        '#667eea',
                        '#764ba2', 
                        '#f093fb',
                        '#f5576c'
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 4,
                    hoverBorderWidth: 6,
                    borderColor: '#fff',
                    borderWidth: 4,
                    hoverOffset: 8,
                    cutout: '60%'
                }, {
                    label: '💧 Umidade',
                    data: [],
                    borderColor: '#4ecdc4',
                    backgroundColor: (context) => {
                        const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 300);
                        gradient.addColorStop(0, 'rgba(78, 205, 196, 0.3)');
                        gradient.addColorStop(1, 'rgba(78, 205, 196, 0.05)');
                        return gradient;
                    },
                    borderWidth: 3,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#4ecdc4',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: '#4ecdc4',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                resizeDelay: 0,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                elements: {
                    point: {
                        radius: 0,
                        hoverRadius: 8,
                        hitRadius: 20
                    },
                    line: {
                        tension: 0.4,
                        borderJoinStyle: 'round',
                        borderCapStyle: 'round'
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Aguardando dados do sistema...',
                        color: '#95a5a6',
                        font: {
                            size: 16,
                            weight: '600',
                            family: 'Inter'
                        },
                        padding: 20
                    },
                    legend: {
                        display: true,
                        position: 'top',
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: {
                                size: 13,
                                weight: '600'
                            },
                            color: '#2c3e50'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(44, 62, 80, 0.95)',
                        titleColor: '#ecf0f1',
                        bodyColor: '#ecf0f1',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        cornerRadius: 12,
                        padding: 15,
                        titleFont: {
                            size: 13,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 12
                        },
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.parsed.y;
                                const unit = context.datasetIndex === 0 ? '°C' : '%';
                                return `${label}: ${value.toFixed(1)}${unit}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Temperatura (°C)',
                            color: '#ff6b6b',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(255, 107, 107, 0.1)'
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            color: '#ff6b6b',
                            font: {
                                size: 11
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Umidade (%)',
                            color: '#4ecdc4',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            color: '#4ecdc4',
                            font: {
                                size: 11
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            maxTicksLimit: 6,
                            color: '#7f8c8d',
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });
    }

    setupMobileMenu() {
        const menuToggle = document.querySelector('.menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });

            // Fechar menu ao clicar fora
            document.addEventListener('click', (e) => {
                if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            });
        }
    }

    animateKPIValues() {
        // KPIs aguardam dados reais do hardware
        this.initializeEmptyKPIs();
    }

    initializeEmptyKPIs() {
        // Configurar KPIs para aguardar dados reais
        const kpiElements = [
            { id: 'tempKPI', text: '--' },
            { id: 'humidityKPI', text: '--' },
            { id: 'voltageKPI', text: '--' },
            { id: 'networkKPI', text: 'Aguardando...' }
        ];

        kpiElements.forEach(kpi => {
            const element = document.getElementById(kpi.id);
            if (element) {
                element.textContent = kpi.text;
                element.style.color = '#95a5a6';
            }
        });

        // Mostrar status de conexão
        const lastDataElement = document.getElementById('lastDataReceived');
        if (lastDataElement) {
            lastDataElement.textContent = 'Aguardando conexão com hardware...';
            lastDataElement.style.color = '#e74c3c';
        }
    }

    updateKPIValues() {
        // Atualizar KPIs somente com dados reais recebidos
        const tempKPI = document.getElementById('tempKPI');
        const humidityKPI = document.getElementById('humidityKPI');
        const networkKPI = document.getElementById('networkKPI');
        const voltageKPI = document.getElementById('voltageKPI');
        
        if (tempKPI && this.dataHistory.temperature.length > 0) {
            tempKPI.textContent = this.dataHistory.temperature[this.dataHistory.temperature.length - 1].toFixed(1);
            tempKPI.style.color = '#2c3e50';
        }
        
        if (humidityKPI && this.dataHistory.humidity.length > 0) {
            humidityKPI.textContent = this.dataHistory.humidity[this.dataHistory.humidity.length - 1].toFixed(1);
            humidityKPI.style.color = '#2c3e50';
        }
        
        if (voltageKPI && this.dataHistory.voltage.length > 0) {
            voltageKPI.textContent = this.dataHistory.voltage[this.dataHistory.voltage.length - 1].toFixed(0);
            voltageKPI.style.color = '#2c3e50';
        }
        
        // Atualizar timestamp da última atualização
        const lastDataElement = document.getElementById('lastDataReceived');
        if (lastDataElement) {
            lastDataElement.textContent = `Última atualização: ${new Date().toLocaleTimeString('pt-BR')}`;
            lastDataElement.style.color = '#27ae60';
        }
    }

    addChartAnimations() {
        // Adicionar animações de entrada aos gráficos
        const chartCards = document.querySelectorAll('.chart-card');
        chartCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 200);
        });
    }

    onFirstDataReceived() {
        // Chamado quando os primeiros dados reais chegam
        if (!this.firstDataReceived) {
            this.firstDataReceived = true;
            
            // Atualizar títulos dos gráficos para remover "aguardando"
            const systemHealthElement = document.getElementById('systemHealth');
            if (systemHealthElement) {
                systemHealthElement.textContent = '100%';
                systemHealthElement.style.color = '#27ae60';
            }
            
            // Animar entrada de dados
            Object.values(this.charts).forEach(chart => {
                if (chart && chart.update) {
                    chart.update('active');
                }
            });
            
            console.log("✅ Primeiros dados reais recebidos do hardware!");
        }
    }

    animateValue(elementId, start, end, duration, decimals = 0) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startTime = performance.now();
        const animate = (currentTime) => {
            const elapsedTime = currentTime - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            
            const currentValue = start + (end - start) * this.easeOutQuart(progress);
            element.textContent = currentValue.toFixed(decimals);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    initEnvironmentChart() {
        const ctx = document.getElementById('environmentChart');
        if (!ctx) return;

        ctx.style.height = '300px';
        ctx.style.width = '100%';

        this.charts.environmentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Temp. Atual', 'Umidade', 'Máx Temp.', 'Máx Umid.'],
                datasets: [{
                    label: 'Dados Ambientais',
                    data: [0, 0, 0, 0],
                    backgroundColor: (context) => {
                        const colors = [
                            'rgba(102, 126, 234, 0.8)',
                            'rgba(118, 75, 162, 0.8)', 
                            'rgba(240, 147, 251, 0.8)',
                            'rgba(245, 87, 108, 0.8)'
                        ];
                        return colors[context.dataIndex] || colors[0];
                    },
                    borderColor: [
                        '#667eea',
                        '#764ba2',
                        '#f093fb', 
                        '#f5576c'
                    ],
                    borderWidth: 3,
                    borderRadius: 12,
                    borderSkipped: false,
                    barThickness: 'flex',
                    maxBarThickness: 60
                }]
            },
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                resizeDelay: 0,
                plugins: {
                    title: {
                        display: true,
                        text: 'Monitoramento Ambiental',
                        color: '#2c3e50',
                        font: {
                            size: 16,
                            weight: 'bold',
                            family: 'Inter'
                        },
                        padding: 20
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(44, 62, 80, 0.95)',
                        titleColor: '#ecf0f1',
                        bodyColor: '#ecf0f1',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        cornerRadius: 12,
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                const label = context.label;
                                const unit = label.includes('Temp') ? '°C' : '%';
                                let status = '';
                                
                                if (label.includes('Temp')) {
                                    if (value < 18) status = ' ❄️ Muito Frio';
                                    else if (value > 27) status = ' 🔥 Muito Quente';
                                    else status = ' ✅ Normal';
                                } else {
                                    if (value < 45) status = ' ⚠️ Muito Seco';
                                    else if (value > 75) status = ' 💧 Muito Úmido';
                                    else status = ' ✅ Normal';
                                }
                                
                                return `${label}: ${value}${unit}${status}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(102, 126, 234, 0.1)',
                            drawBorder: false,
                            lineWidth: 1
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            color: '#7f8c8d',
                            font: {
                                size: 12,
                                family: 'Inter'
                            },
                            padding: 10
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        border: {
                            display: false
                        },
                        ticks: {
                            color: '#2c3e50',
                            font: {
                                size: 12,
                                weight: '500',
                                family: 'Inter'
                            },
                            maxRotation: 0
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10
                    }
                }
            }
        });
    }

    updateChart(sensorData) {
        const sensorType = sensorData?.sensor || 'unknown';
        console.log("Atualizando gráfico:", sensorType);
        
        // Atualizar gráfico principal com todos os sensores
        if (this.charts.sensorsChart) {
            const chart = this.charts.sensorsChart;
            const timestamps = this.dataHistory.timestamps.slice(-15); // Últimos 15 pontos
            
            chart.data.labels = timestamps;
            chart.data.datasets[0].data = this.dataHistory.temperature.slice(-15);
            chart.data.datasets[1].data = this.dataHistory.humidity.slice(-15);
            chart.data.datasets[2].data = this.dataHistory.voltage.slice(-15);
            
            chart.update('none');
        }
        
        // Atualizar gráfico donut com valores atuais
        if (this.charts.tempHumidityChart && (sensorType === 'temperature' || sensorType === 'humidity')) {
            const chart = this.charts.tempHumidityChart;
            
            // Pegar os valores mais recentes
            const currentTemp = this.dataHistory.temperature.length > 0 ? 
                this.dataHistory.temperature[this.dataHistory.temperature.length - 1] : 25;
            const currentHumidity = this.dataHistory.humidity.length > 0 ? 
                this.dataHistory.humidity[this.dataHistory.humidity.length - 1] : 65;
            
            chart.data.datasets[0].data = [currentTemp, currentHumidity];
            chart.update('none');
        }
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
