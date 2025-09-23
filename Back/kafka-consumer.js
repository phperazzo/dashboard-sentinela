console.log('KAFKA_BOOTSTRAP_SERVERS:', process.env.KAFKA_BOOTSTRAP_SERVERS);
console.log('KAFKA_USERNAME:', process.env.KAFKA_USERNAME);
console.log('KAFKA_PASSWORD:', process.env.KAFKA_PASSWORD ? '***' : undefined);
console.log('KAFKA_TOPIC_SYNC:', process.env.KAFKA_TOPIC_SYNC);
console.log('KAFKA_TOPIC_ASYNC:', process.env.KAFKA_TOPIC_ASYNC);
console.log('KAFKA_CONSUMER_GROUP:', process.env.KAFKA_CONSUMER_GROUP);
const { Kafka } = require('kafkajs');

class KafkaConsumer {
    constructor() {
        this.kafka = new Kafka({
            clientId: 'sentinela-dashboard-backend',
            brokers: [process.env.KAFKA_BOOTSTRAP_SERVERS],
            ssl: true,
            sasl: {
                mechanism: 'plain',
                username: process.env.KAFKA_USERNAME,
                password: process.env.KAFKA_PASSWORD
            }
        });

        this.consumer = this.kafka.consumer({ 
            groupId: process.env.KAFKA_CONSUMER_GROUP 
        });
        
        this.isConnected = false;
        this.messageCallbacks = [];
    }

    async connect() {
        try {
            await this.consumer.connect();
            console.log('✅ Conectado ao Kafka');
            
            // Subscreve nos tópicos
            await this.consumer.subscribe({ 
                topic: process.env.KAFKA_TOPIC_SYNC, 
                fromBeginning: false 
            });
            await this.consumer.subscribe({ 
                topic: process.env.KAFKA_TOPIC_ASYNC, 
                fromBeginning: false 
            });

            this.isConnected = true;
            
            // Inicia o consumo
            await this.consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    this.handleMessage(topic, message);
                }
            });

        } catch (error) {
            console.error('❌ Erro ao conectar no Kafka:', error);
            throw error;
        }
    }

    handleMessage(topic, message) {
        try {
            const messageValue = message.value.toString();
            const parsedMessage = JSON.parse(messageValue);
            
            console.log(`📨 Mensagem recebida do tópico ${topic}:`, parsedMessage);

            // Notifica todos os callbacks registrados
            this.messageCallbacks.forEach(callback => {
                callback({
                    topic: topic,
                    value: parsedMessage,
                    timestamp: message.timestamp,
                    offset: message.offset
                });
            });

        } catch (error) {
            console.error('❌ Erro ao processar mensagem:', error);
        }
    }

    onMessage(callback) {
        this.messageCallbacks.push(callback);
    }

    async disconnect() {
        try {
            await this.consumer.disconnect();
            console.log('🔌 Desconectado do Kafka');
        } catch (error) {
            console.error('Erro ao desconectar do Kafka:', error);
        }
    }

    // Método para buscar mensagens recentes (para polling REST)
    async getRecentMessages(limit = 10) {
        try {
            // Para simplicidade, retorna array vazio
            // Em produção, você pode implementar um cache das últimas mensagens
            return [];
        } catch (error) {
            console.error('Erro ao buscar mensagens recentes:', error);
            return [];
        }
    }
}

module.exports = KafkaConsumer;

