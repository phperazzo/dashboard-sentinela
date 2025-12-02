class SentinelaDashboard {
    constructor() {
        this.dataHistory = {
            latency: [],      // Latência da rede (ms)
            rms: [],          // RMS - corrente
            network: [],      // Status da rede
            timestamps: []
        };
        
        // Últimos valores reais para tooltips
        this.lastRealValues = {
            latency: 0,
            rms: 0
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
        this.networkStatus = 'online'; // Status da rede: 'online' ou 'offline'
        this.internetStatus = 'offline'; // Status da internet: 'online' ou 'offline'
        this.lastDataTimestamp = null;
        this.internetCheckInterval = null;
        
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
        this.startInternetMonitoring();
        this.startPollingData(); // Fallback para quando WebSocket não funciona
    }

    startPollingData() {
        // Polling a cada 5 segundos para pegar últimos dados via API
        setInterval(async () => {
            try {
                const response = await fetch('/api/readings/all', {
                    credentials: 'include', // Incluir cookies de autenticação
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.syncData) {
                        // Processar dados síncronos (latency, rms)
                        ['latency', 'rms'].forEach(type => {
                            if (data.syncData[type] && data.syncData[type].length > 0) {
                                const latest = data.syncData[type][data.syncData[type].length - 1];
                                this.processSensorData(latest);
                            }
                        });
                    }
                } else if (response.status === 429) {
                    console.warn('⚠️ Rate limit atingido, aguardando...');
                }
            } catch (err) {
                console.error('Erro ao buscar dados via API:', err);
            }
        }, 5000);
    }

    connectToWebSocket() {
        let wsUrl;
        if (window.location.protocol === "https:") {
            wsUrl = "wss://" + window.location.host;
        } else {
            wsUrl = "ws://" + window.location.host;
        }
        console.log("🔗 Conectando WebSocket em:", wsUrl);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log("🔌 Conectado ao WebSocket do backend");
            this.updateConnectionStatus(true);
            this.updateMQTTStatus(true);
        };

        this.ws.onclose = (event) => {
            console.warn("WebSocket desconectado. Código:", event.code, "Razão:", event.reason);
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
                
                // [ADD] Processar eventos críticos em tempo real
                if (msg.type === "critical_event" && msg.event) {
                    this.displayCriticalEvent(msg.event);
                    return;
                }
                
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
        // Novo formato: {type: 'latency', value: 35, unit: 'ms'}
        if (!data || !data.type || typeof data.value === 'undefined') {
            console.log("Dados de sensor inválidos:", data);
            return;
        }

        // Primeira vez recebendo dados reais - remover mensagens de aguardando
        this.onFirstDataReceived();

        const timeLabel = data.timestamp ?
            new Date(data.timestamp).toLocaleTimeString("pt-BR") :
            new Date().toLocaleTimeString("pt-BR");

        console.log(`📊 Processando sensor: ${data.type} = ${data.value}${data.unit || ''}`);

        switch (data.type) {
            case "latency":
            case "latencia":
                this.updateRealChart("latency", data.value, timeLabel, data.unit || "ms");
                this.updateMetric("network", data.value.toFixed(1), this.getLatencyStatus(data.value));
                break;

            case "rms":
                this.updateRealChart("rms", data.value, timeLabel, data.unit || "V");
                this.updateMetric("rms", data.value.toFixed(1), this.getRMSStatus(data.value));
                break;
            case "rede":
                // Processar status da rede (ON/OFF) -> Conectado/Desconectado
                const networkStatus = data.reading?.value === "ON" ? "Conectado" : "Desconectado";
                this.updateMetric("network", networkStatus, this.getNetworkStatusFromValue(data.reading?.value));
                this.updateNetworkKPI(data.reading?.value === "ON");
                break;
            default:
                console.log("Tipo de sensor desconhecido:", data.type);
        }
        
        this.updateLastUpdateTime();
        this.updateKPIValues();
        this.updateSystemHealth();
        this.updateInternetStatus(true);
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
            let totalSensors = 2; // latency, rms
            
            if (this.dataHistory.latency.length > 0) activeSensors++;
            if (this.dataHistory.rms.length > 0) activeSensors++;
            
            const health = Math.round((activeSensors / totalSensors) * 100);
            healthElement.textContent = health + '%';
        }
        
        if (lastDataElement) {
            lastDataElement.textContent = 'Último dado: ' + new Date().toLocaleTimeString("pt-BR");
        }
    }

    initializeEmptyDashboard() {
        this.updateMetric("rms", "--", { class: "disabled", text: "Sem dados" });
        this.updateMetric("latency", "--", { class: "disabled", text: "Sem dados" });
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
        // Atualizar KPIs no topo da página
        const elementId = metricType + 'KPI';
        const element = document.getElementById(elementId);
        
        if (element) {
            element.textContent = value;
            console.log(`✅ Métrica ${metricType} atualizada: ${value} - ${status.text}`);
        } else {
            console.log(`⚠️ Elemento #${elementId} não encontrado`);
        }
    }

    getLatencyStatus(latency) {
        if (latency > 200) return { class: "danger", text: "Latência crítica!" };
        else if (latency > 100) return { class: "warning", text: "Latência alta" };
        else return { class: "normal", text: "Latência normal" };
    }

    getNetworkStatusFromValue(value) {
        if (value === "ON") {
            return { class: "normal", text: "Rede conectada" };
        } else {
            return { class: "danger", text: "Rede desconectada" };
        }
    }

    getNetworkStatus(isOnline) {
        if (isOnline) {
            return { class: "normal", text: "Rede conectada" };
        } else {
            return { class: "danger", text: "Rede desconectada" };
        }
    }

    getRMSStatus(rms) {
        // RMS (voltagem) - crítico apenas se abaixo de 120V
        if (rms < 120) return { class: "danger", text: "Voltagem crítica!" };
        else if (rms < 127 || rms > 130) return { class: "warning", text: "Voltagem instável" };
        else return { class: "normal", text: "Voltagem normal" };
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
        if (!ctx) {
            console.warn('⚠️ Canvas mainChart não encontrado');
            return;
        }

        console.log('✅ Inicializando mainChart (gráfico de linhas)');

        // Definir altura adequada para o canvas
        ctx.style.height = '400px';
        ctx.style.width = '100%';

        this.charts.mainChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '📡 Latência',
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
                    label: '🔌 RMS',
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
            type: 'bar',
            data: {
                labels: ['Latência', 'RMS'],
                datasets: [{
                    label: 'Saúde do Sistema (%)',
                    data: [0, 0, 0], // Inicia zerado até receber dados reais
                    backgroundColor: (context) => {
                        const value = context.parsed.x;
                        if (value >= 90) return 'rgba(39, 174, 96, 0.85)';   // Verde escuro: Ótimo
                        if (value >= 75) return 'rgba(46, 204, 113, 0.85)';  // Verde claro: Bom
                        if (value >= 50) return 'rgba(241, 196, 15, 0.85)';  // Amarelo: Atenção
                        if (value >= 30) return 'rgba(230, 126, 34, 0.85)';  // Laranja: Preocupante
                        return 'rgba(231, 76, 60, 0.85)'; // Vermelho: Crítico
                    },
                    borderColor: (context) => {
                        const value = context.parsed.x;
                        if (value >= 90) return '#27ae60';
                        if (value >= 75) return '#2ecc71';
                        if (value >= 50) return '#f1c40f';
                        if (value >= 30) return '#e67e22';
                        return '#e74c3c';
                    },
                    borderWidth: 2,
                    borderRadius: 8,
                    barThickness: 40
                }]
            },
            options: {
                indexAxis: 'y', // Barras horizontais
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Indicadores de Saúde',
                        color: '#2c3e50',
                        font: {
                            size: 16,
                            weight: '600',
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
                        padding: 15,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.x;
                                let status = 'Crítico';
                                let icon = '🔴';
                                if (value >= 90) {
                                    status = 'Ótimo';
                                    icon = '🟢';
                                } else if (value >= 75) {
                                    status = 'Bom';
                                    icon = '🟢';
                                } else if (value >= 50) {
                                    status = 'Atenção';
                                    icon = '🟡';
                                } else if (value >= 30) {
                                    status = 'Preocupante';
                                    icon = '🟠';
                                }
                                return `${icon} Saúde: ${value.toFixed(0)}% (${status})`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        min: 0,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            },
                            color: '#7f8c8d',
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: 'rgba(52, 73, 94, 0.1)'
                        },
                        border: {
                            display: false
                        }
                    },
                    y: {
                        ticks: {
                            color: '#2c3e50',
                            font: {
                                size: 12,
                                weight: '600'
                            }
                        },
                        grid: {
                            display: false
                        },
                        border: {
                            display: false
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
            { id: 'tempValue', text: '-- V' },        // RMS
            { id: 'humidityValue', text: 'Offline' },  // Internet (padrão: Offline até receber dados)
            { id: 'networkValue', text: '-- ms' },    // Latência
            { id: 'energyValue', text: '-- V' }       // Voltagem
        ];

        kpiElements.forEach(kpi => {
            const element = document.getElementById(kpi.id);
            if (element) {
                element.textContent = kpi.text;
            }
        });

        // Mostrar status de conexão
        const lastDataElement = document.getElementById('lastDataReceived');
        if (lastDataElement) {
            lastDataElement.textContent = 'Aguardando conexão com hardware...';
            lastDataElement.style.color = '#e74c3c';
        }
    }

    updateNetworkStatusCard() {
        const statusKPI = document.getElementById('humidityValue');
        if (statusKPI) {
            statusKPI.textContent = this.internetStatus === 'online' ? 'Online' : 'Offline';
        }
    }

    startInternetMonitoring() {
        // Verificar status da internet a cada 5 segundos
        this.internetCheckInterval = setInterval(() => {
            this.checkInternetStatus();
        }, 5000);
    }

    checkInternetStatus() {
        const now = Date.now();
        const timeout = 15000; // 15 segundos sem dados = offline
        
        if (this.lastDataTimestamp && (now - this.lastDataTimestamp) > timeout) {
            this.updateInternetStatus(false);
        }
    }

    updateInternetStatus(isOnline) {
        if (isOnline) {
            this.lastDataTimestamp = Date.now();
            if (this.internetStatus !== 'online') {
                this.internetStatus = 'online';
                this.updateNetworkStatusCard();
                console.log('🌐 Internet: Online');
            }
        } else {
            if (this.internetStatus !== 'offline') {
                this.internetStatus = 'offline';
                this.updateNetworkStatusCard();
                console.log('🌐 Internet: Offline');
            }
        }
    }

    updateKPIValues() {
        // Atualizar KPIs diretamente nos elementos corretos
        const rmsKPI = document.getElementById('rmsKPI');
        const latencyKPI = document.getElementById('latencyKPI');
        
        if (rmsKPI && this.dataHistory.rms.length > 0) {
            rmsKPI.textContent = this.dataHistory.rms[this.dataHistory.rms.length - 1].toFixed(1);
        }
        
        if (latencyKPI && this.dataHistory.latency.length > 0) {
            latencyKPI.textContent = this.dataHistory.latency[this.dataHistory.latency.length - 1].toFixed(0);
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
                labels: ['Latência', 'RMS'],
                datasets: [{
                    label: 'Qualidade do Sistema',
                    data: [0, 0, 0],
                    backgroundColor: (context) => {
                        const value = context.parsed.y;
                        // Mesma lógica de cores do gráfico de saúde
                        if (value >= 90) return 'rgba(39, 174, 96, 0.85)';   // Verde escuro: Ótimo
                        if (value >= 75) return 'rgba(46, 204, 113, 0.85)';  // Verde claro: Bom
                        if (value >= 50) return 'rgba(241, 196, 15, 0.85)';  // Amarelo: Atenção
                        if (value >= 30) return 'rgba(230, 126, 34, 0.85)';  // Laranja: Preocupante
                        return 'rgba(231, 76, 60, 0.85)'; // Vermelho: Crítico
                    },
                    borderColor: (context) => {
                        const value = context.parsed.y;
                        if (value >= 90) return '#27ae60';
                        if (value >= 75) return '#2ecc71';
                        if (value >= 50) return '#f1c40f';
                        if (value >= 30) return '#e67e22';
                        return '#e74c3c';
                    },
                    borderWidth: 3,
                    borderRadius: 12,
                    borderSkipped: false,
                    barThickness: 'flex',
                    maxBarThickness: 60
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                resizeDelay: 0,
                plugins: {
                    title: {
                        display: true,
                        text: 'Análise de Qualidade dos Dados (%)',
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
                            label: (context) => {
                                const percent = context.parsed.y.toFixed(1);
                                const label = context.label;
                                let realValue = '';
                                let status = '';
                                
                                if (label.includes('Latência')) {
                                    realValue = `${this.lastRealValues.latency.toFixed(1)} ms`;
                                    if (this.lastRealValues.latency < 50) status = ' ✅ Ótimo';
                                    else if (this.lastRealValues.latency < 100) status = ' 👍 Bom';
                                    else if (this.lastRealValues.latency < 200) status = ' ⚠️ Atenção';
                                    else status = ' 🔴 Crítico';
                                } else if (label.includes('RMS')) {
                                    realValue = `${this.lastRealValues.rms.toFixed(1)} V`;
                                    if (this.lastRealValues.rms >= 120 && this.lastRealValues.rms <= 130) status = ' ✅ Normal';
                                    else if (this.lastRealValues.rms > 130 || (this.lastRealValues.rms >= 115 && this.lastRealValues.rms < 120)) status = ' ⚠️ Atenção';
                                    else if (this.lastRealValues.rms < 120) status = ' 🔴 Crítico';
                                    else status = ' ⚠️ Atenção';
                                }
                                
                                return `${label}: ${realValue} (${percent}% ideal)${status}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Qualidade (%)',
                            color: '#7f8c8d',
                            font: {
                                size: 13,
                                family: 'Inter',
                                weight: '600'
                            }
                        },
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
                            padding: 10,
                            callback: function(value) {
                                return value + '%';
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
        const sensorType = sensorData?.sensor || sensorData || 'unknown';
        console.log("Atualizando gráfico:", sensorType);
        
        // Atualizar gráfico principal (mainChart) com todos os sensores
        if (this.charts.mainChart) {
            console.log('📈 Atualizando mainChart com', this.dataHistory.timestamps.length, 'pontos');
            const chart = this.charts.mainChart;
            const timestamps = this.dataHistory.timestamps.slice(-15); // Últimos 15 pontos
            
            chart.data.labels = timestamps;
            chart.data.datasets[0].data = this.dataHistory.latency.slice(-15);
            chart.data.datasets[1].data = this.dataHistory.rms.slice(-15);
            
            chart.update('none');
        } else {
            console.warn('⚠️ mainChart não existe');
        }
        
        // Atualizar gráfico de ambiente (environmentChart) com valores normalizados em %
        if (this.charts.environmentChart) {
            const chart = this.charts.environmentChart;
            
            const latency = this.dataHistory.latency.length > 0 ? 
                this.dataHistory.latency[this.dataHistory.latency.length - 1] : 0;
            const rms = this.dataHistory.rms.length > 0 ? 
                this.dataHistory.rms[this.dataHistory.rms.length - 1] : 220;
            
            // Armazenar valores reais
            this.lastRealValues.latency = latency;
            this.lastRealValues.rms = rms;
            
            // Normalizar para percentual de qualidade (0-100%)
            // 100% = valor ideal, 0% = valor crítico (fora da faixa aceitável)
            
            // Latência: 0-50ms = 100%, >400ms = 0%
            let latencyPercent = 100;
            if (latency > 400) latencyPercent = 0;
            else if (latency > 200) latencyPercent = 30;
            else if (latency > 100) latencyPercent = 60;
            else if (latency > 50) latencyPercent = 80;
            
            // RMS: 120-130V = 100%, abaixo de 120V = crítico
            let rmsPercent = 100;
            if (rms >= 120 && rms <= 130) rmsPercent = 100;
            else if (rms >= 115 && rms <= 135) rmsPercent = 80;
            else if (rms >= 110 && rms <= 140) rmsPercent = 60;
            else if (rms >= 105 && rms <= 145) rmsPercent = 30;
            else rmsPercent = 0; // Fora da faixa = 0%
            
            chart.data.datasets[0].data = [latencyPercent, rmsPercent];
            chart.update('none');
        }
        
        // Atualizar gráfico de saúde com percentuais
        if (this.charts.tempHumidityChart) {
            const chart = this.charts.tempHumidityChart;
            
            // Calcular saúde de cada métrica (0-100%)
            const latency = this.dataHistory.latency.length > 0 ? 
                this.dataHistory.latency[this.dataHistory.latency.length - 1] : 0;
            const rms = this.dataHistory.rms.length > 0 ? 
                this.dataHistory.rms[this.dataHistory.rms.length - 1] : 127;
            
            // Calcular percentuais de saúde
            // Latência: 0-50ms = 100%, 50-100ms = 80%, 100-200ms = 60%, 200-400ms = 30%, >400ms = 10%
            let latencyHealth = 100;
            if (latency > 400) latencyHealth = 10;
            else if (latency > 200) latencyHealth = 30;
            else if (latency > 100) latencyHealth = 60;
            else if (latency > 50) latencyHealth = 80;
            
            // RMS: 120-130V = 100%, 115-135V = 80%, 110-140V = 60%, 105-145V = 30%, <120V = crítico (10%)
            let rmsHealth = 100;
            if (rms >= 120 && rms <= 130) rmsHealth = 100;
            else if (rms >= 115 && rms <= 135) rmsHealth = 80;
            else if (rms >= 110 && rms <= 140) rmsHealth = 60;
            else if (rms >= 105 && rms <= 145) rmsHealth = 30;
            else rmsHealth = 10;

            console.log('🔍 DEBUG SAÚDE:', { 
                latencia: `${latency.toFixed(1)}ms → ${latencyHealth}%`,
                rms: `${rms.toFixed(1)}V → ${rmsHealth}%`,
                dados: [latencyHealth, rmsHealth]
            });
            
            chart.data.datasets[0].data = [latencyHealth, rmsHealth];
            chart.update('none');
        }
    }

    updateLastUpdateTime() {
        const lastUpdateElement = document.getElementById("lastUpdate");
        if (lastUpdateElement) {
            lastUpdateElement.textContent = new Date().toLocaleString("pt-BR");
        }
    }

    // [ADD] Exibir evento crítico em tempo real
    displayCriticalEvent(event) {
        console.log("🚨 Evento crítico recebido:", event);
        
        // Atualizar status da rede baseado no evento
        if (event.category === 'network_outage') {
            this.networkStatus = 'offline';
            this.updateNetworkStatusCard();
        } else if (event.category === 'network_restored') {
            this.networkStatus = 'online';
            this.updateNetworkStatusCard();
        }
        
        // Apenas logar eventos, sem popup visual
        // this.showNotification(event);
        
        // Adicionar ao log de eventos (se houver área de eventos no dashboard)
        this.addEventToLog(event);
    }

    showNotification(event) {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = 'critical-notification';
        notification.innerHTML = `
            <div class="notification-icon">⚠️</div>
            <div class="notification-content">
                <strong>${this.getCategoryLabel(event.category)}</strong>
                <p>${event.message}</p>
                <small>${new Date(event.timestamp).toLocaleTimeString('pt-BR')}</small>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;

        // Adicionar ao container de notificações (criar se não existir)
        let container = document.getElementById('notificationsContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notificationsContainer';
            container.className = 'notifications-container';
            document.body.appendChild(container);
            
            // Adicionar estilos
            const style = document.createElement('style');
            style.textContent = `
                .notifications-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    max-width: 400px;
                }
                .critical-notification {
                    background: white;
                    border-left: 4px solid #f44336;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    border-radius: 4px;
                    padding: 15px;
                    margin-bottom: 10px;
                    display: flex;
                    align-items: flex-start;
                    animation: slideIn 0.3s ease;
                }
                @keyframes slideIn {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .notification-icon {
                    font-size: 24px;
                    margin-right: 12px;
                }
                .notification-content {
                    flex: 1;
                }
                .notification-content strong {
                    display: block;
                    margin-bottom: 4px;
                    color: #333;
                }
                .notification-content p {
                    margin: 0;
                    color: #666;
                    font-size: 14px;
                }
                .notification-content small {
                    color: #999;
                    font-size: 12px;
                }
                .notification-close {
                    background: none;
                    border: none;
                    font-size: 24px;
                    color: #999;
                    cursor: pointer;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    line-height: 24px;
                }
                .notification-close:hover {
                    color: #333;
                }
            `;
            document.head.appendChild(style);
        }

        container.appendChild(notification);

        // Auto-remover após 10 segundos
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 10000);
    }

    addEventToLog(event) {
        // Tentar adicionar a uma área de log se existir
        const eventLog = document.getElementById('eventLog');
        if (eventLog) {
            const eventItem = document.createElement('div');
            eventItem.className = 'event-log-item';
            eventItem.innerHTML = `
                <span class="event-time">${new Date(event.timestamp).toLocaleTimeString('pt-BR')}</span>
                <span class="event-category badge-${event.category}">${this.getCategoryLabel(event.category)}</span>
                <span class="event-message">${event.message}</span>
            `;
            eventLog.insertBefore(eventItem, eventLog.firstChild);
            
            // Manter apenas últimos 20 eventos
            while (eventLog.children.length > 20) {
                eventLog.removeChild(eventLog.lastChild);
            }
        }
    }

    getCategoryLabel(category) {
        const labels = {
            power_outage: 'Queda de Energia',
            network_outage: 'Queda de Rede',
            critical_latency: 'Latência Crítica',
            power_quality: 'Qualidade Energia',
            other: 'Outro'
        };
        return labels[category] || category;
    }

    setupEventListeners() {
        window.addEventListener("beforeunload", () => this.cleanup());
        
        // Mobile menu toggle
        this.setupMobileMenu();
    }

    setupMobileMenu() {
        const menuToggle = document.querySelector('.menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        if (menuToggle && sidebar) {
            // Criar overlay para mobile
            let overlay = document.querySelector('.sidebar-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'sidebar-overlay';
                document.querySelector('.dashboard-layout').appendChild(overlay);
            }

            // Toggle sidebar
            menuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                sidebar.classList.toggle('open');
                overlay.classList.toggle('active');
                document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
            });

            // Fechar ao clicar no overlay
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            });

            // Fechar ao clicar em um item do menu
            const navItems = sidebar.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.addEventListener('click', () => {
                    if (window.innerWidth <= 768) {
                        sidebar.classList.remove('open');
                        overlay.classList.remove('active');
                        document.body.style.overflow = '';
                    }
                });
            });

            // Fechar ao redimensionar para desktop
            window.addEventListener('resize', () => {
                if (window.innerWidth > 768) {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('active');
                    document.body.style.overflow = '';
                }
            });
        }
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
