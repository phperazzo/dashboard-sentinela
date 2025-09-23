const { Kafka } = require('kafkajs');
require('dotenv').config({ path: __dirname + '/../.env' });

const kafka = new Kafka({
  clientId: 'sentinela-tester',
  brokers: [process.env.KAFKA_BOOTSTRAP_SERVERS],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD
  }
});

async function sendTestMessages() {
  const producer = kafka.producer();
  await producer.connect();

  // Mensagem de telemetria (sync)
  await producer.send({
    topic: process.env.KAFKA_TOPIC_SYNC,
    messages: [
      {
        value: JSON.stringify({
          deviceId: 'sentinela-sala-01',
          sensor: 'temperatura',
          reading: { value: 28.7, unit: 'C' },
          timestamp_unix: Math.floor(Date.now() / 1000)
        })
      }
    ]
  });

  // Mensagem de evento crítico (async)
  await producer.send({
    topic: process.env.KAFKA_TOPIC_ASYNC,
    messages: [
      {
        value: JSON.stringify({
          deviceId: 'sentinela-sala-01',
          event: 'rede_status',
          value: 'offline',
          timestamp_unix: Math.floor(Date.now() / 1000)
        })
      }
    ]
  });

  await producer.disconnect();
  console.log('Mensagens de teste enviadas para o Kafka!');
}

sendTestMessages().catch(console.error);
