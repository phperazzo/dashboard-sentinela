class SentinelaDashboard {
    constructor() {
        this.isConnected = false;
        this.temperatureChart = null;
        this.humidityChart = null;
        this.dataHistory = {
            temperature: [],
            humidity: [],
            timestamps: []
        };
        this.maxDataPoints = 20;
        
        // Simulate cloud connection configuration
        this.config = {
            apiEndpoint: '/api/sentinela', // Replace with actual cloud endpoint
            updateInterval: 5000, // 5 seconds
            reconnectInterval: 10000 // 10 seconds
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeCharts();
        this.startDataUpdates();
        this.simulateInitialConnection();
    }

    setupEventListeners() {
        // Add any additional event listeners here
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    initializeCharts() {
        this.initTemperatureChart();
        this.initHumidityChart();
    }

    initTemperatureChart() {
        const ctx = document.getElementById('temperatureChart').getContext('2d');
        this.temperatureChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.dataHistory.timestamps,
                datasets: [{
                    label: 'Temperatura (°C)',
                    data: this.dataHistory.temperature,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#e74c3c',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '°C';
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                elements: {
                    point: {
                        hoverRadius: 8
                    }
                }
            }
        });
    }

    initHumidityChart() {
        const ctx = document.getElementById('humidityChart').getContext('2d');
        this.humidityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.dataHistory.timestamps,
                datasets: [{
                    label: 'Umidade (%)',
                    data: this.dataHistory.humidity,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#3498db',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                elements: {
                    point: {
                        hoverRadius: 8
                    }
                }
            }
        });
    }

    async fetchSentinelaData() {
        try {
            // Simulate API call to cloud service
            // In a real implementation, this would connect to your cloud endpoint
            const response = await this.simulateCloudData();
            
            if (response.ok) {
                this.isConnected = true;
                this.updateConnectionStatus(true);
                return response.data;
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

    // Simulate cloud data for demonstration
    // Replace this with actual API calls to your cloud service
    simulateCloudData() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const data = {
                    temperature: 20 + Math.random() * 15, // 20-35°C
                    humidity: 40 + Math.random() * 30, // 40-70%
                    voltage: 220 + (Math.random() - 0.5) * 20, // 210-230V
                    voltageVariation: Math.random() * 5, // 0-5%
                    ethernetStatus: Math.random() > 0.1, // 90% uptime
                    ethernetIP: '192.168.1.' + Math.floor(Math.random() * 254 + 1),
                    ethernetSpeed: ['100 Mbps', '1 Gbps'][Math.floor(Math.random() * 2)],
                    timestamp: new Date().toISOString()
                };

                resolve({
                    ok: Math.random() > 0.05, // 95% success rate
                    data: data
                });
            }, 500 + Math.random() * 1000); // Simulate network delay
        });
    }

    updateDashboard(data) {
        if (!data) return;

        // Update temperature
        this.updateMetric('temperature', data.temperature.toFixed(1), this.getTemperatureStatus(data.temperature));
        
        // Update humidity
        this.updateMetric('humidity', data.humidity.toFixed(1), this.getHumidityStatus(data.humidity));
        
        // Update voltage
        this.updateMetric('voltage', data.voltage.toFixed(1), this.getVoltageStatus(data.voltage));
        document.getElementById('voltageVariation').textContent = data.voltageVariation.toFixed(2);
        
        // Update ethernet status
        this.updateEthernetStatus(data.ethernetStatus, data.ethernetIP, data.ethernetSpeed);
        
        // Update charts
        this.updateCharts(data);
        
        // Update last update time
        this.updateLastUpdateTime();
    }

    updateMetric(metricType, value, status) {
        const valueElement = document.getElementById(metricType);
        const statusElement = document.getElementById(metricType + 'Status');
        
        if (valueElement) {
            valueElement.textContent = value;
        }
        
        if (statusElement) {
            statusElement.className = `metric-status ${status.class}`;
            statusElement.querySelector('.status-text').textContent = status.text;
        }
    }

    getTemperatureStatus(temp) {
        if (temp < 0 || temp > 40) {
            return { class: 'danger', text: 'Temperatura crítica!' };
        } else if (temp < 10 || temp > 30) {
            return { class: 'warning', text: 'Temperatura elevada' };
        } else {
            return { class: 'normal', text: 'Temperatura normal' };
        }
    }

    getHumidityStatus(humidity) {
        if (humidity < 30 || humidity > 80) {
            return { class: 'warning', text: 'Umidade fora do ideal' };
        } else {
            return { class: 'normal', text: 'Umidade ideal' };
        }
    }

    getVoltageStatus(voltage) {
        if (voltage < 200 || voltage > 240) {
            return { class: 'danger', text: 'Tensão crítica!' };
        } else if (voltage < 210 || voltage > 230) {
            return { class: 'warning', text: 'Tensão instável' };
        } else {
            return { class: 'normal', text: 'Tensão estável' };
        }
    }

    updateEthernetStatus(isConnected, ip, speed) {
        const statusElement = document.getElementById('ethernetStatus');
        const indicatorElement = document.getElementById('ethernetIndicator');
        const textElement = document.getElementById('ethernetText');
        const ipElement = document.getElementById('ethernetIP');
        const speedElement = document.getElementById('ethernetSpeed');

        if (isConnected) {
            indicatorElement.className = 'status-indicator connected';
            textElement.textContent = 'Conectado';
            ipElement.textContent = ip;
            speedElement.textContent = speed;
        } else {
            indicatorElement.className = 'status-indicator disconnected';
            textElement.textContent = 'Desconectado';
            ipElement.textContent = '--';
            speedElement.textContent = '--';
        }
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        const icon = statusElement.querySelector('i');
        const text = statusElement.querySelector('span');

        if (connected) {
            statusElement.className = 'connection-status connected';
            icon.className = 'fas fa-wifi';
            text.textContent = 'Conectado';
        } else {
            statusElement.className = 'connection-status disconnected';
            icon.className = 'fas fa-wifi-slash';
            text.textContent = 'Desconectado';
        }
    }

    updateCharts(data) {
        const now = new Date();
        const timeLabel = now.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        // Add new data point
        this.dataHistory.timestamps.push(timeLabel);
        this.dataHistory.temperature.push(data.temperature);
        this.dataHistory.humidity.push(data.humidity);

        // Remove old data points if we have too many
        if (this.dataHistory.timestamps.length > this.maxDataPoints) {
            this.dataHistory.timestamps.shift();
            this.dataHistory.temperature.shift();
            this.dataHistory.humidity.shift();
        }

        // Update charts
        if (this.temperatureChart) {
            this.temperatureChart.data.labels = [...this.dataHistory.timestamps];
            this.temperatureChart.data.datasets[0].data = [...this.dataHistory.temperature];
            this.temperatureChart.update('none');
        }

        if (this.humidityChart) {
            this.humidityChart.data.labels = [...this.dataHistory.timestamps];
            this.humidityChart.data.datasets[0].data = [...this.dataHistory.humidity];
            this.humidityChart.update('none');
        }
    }

    updateLastUpdateTime() {
        const lastUpdateElement = document.getElementById('lastUpdate');
        if (lastUpdateElement) {
            const now = new Date();
            lastUpdateElement.textContent = now.toLocaleString('pt-BR');
        }
    }

    startDataUpdates() {
        this.fetchAndUpdate();
        this.updateInterval = setInterval(() => {
            this.fetchAndUpdate();
        }, this.config.updateInterval);
    }

    async fetchAndUpdate() {
        const data = await this.fetchSentinelaData();
        this.updateDashboard(data);
    }

    simulateInitialConnection() {
        // Simulate initial connection delay
        setTimeout(() => {
            this.fetchAndUpdate();
        }, 2000);
    }

    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new SentinelaDashboard();
    
    // Make dashboard globally accessible for debugging
    window.sentinelaDashboard = dashboard;
});

// Service Worker registration for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}