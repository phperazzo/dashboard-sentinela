// const { Kafka } = require('kafkajs');
// require('dotenv').config({ path: __dirname + '/../.env' });

// const kafka = new Kafka({
//   clientId: 'sentinela-tester',
//   brokers: [process.env.KAFKA_BOOTSTRAP_SERVERS],
//   ssl: true,
//   sasl: {
//     mechanism: 'plain',
//     username: process.env.KAFKA_USERNAME,
//     password: process.env.KAFKA_PASSWORD
//   }
// });

// async function sendTestMessages() {
//   const producer = kafka.producer();
//   await producer.connect();

//   // Envia várias mensagens de sensores em sequência
//   const sensores = [
//     { sensor: 'temperatura', value: 28.7, unit: 'C' },
//     { sensor: 'umidade', value: 55.2, unit: '%' },
//     { sensor: 'tensao', value: 220.1, unit: 'V' }
//   ];

//   for (let i = 0; i < 5; i++) {
//     for (const s of sensores) {
//       await producer.send({
//         topic: process.env.KAFKA_TOPIC_SYNC,
//         messages: [
//           {
//             value: JSON.stringify({
//               deviceId: 'sentinela-sala-01',
//               sensor: s.sensor,
//               reading: { value: s.value + Math.random(), unit: s.unit },
//               timestamp_unix: Math.floor(Date.now() / 1000)
//             })
//           }
//         ]
//       });
//       await new Promise(r => setTimeout(r, 500));
//     }
//   }

//   // Simula alternância de status da rede ethernet
//   const statusList = [
//     { value: 'online', ip: '192.168.0.101', velocidade: '1000Mbps' },
//     { value: 'offline', ip: null, velocidade: null },
//     { value: 'online', ip: '192.168.0.101', velocidade: '1000Mbps' }
//   ];
//   for (const status of statusList) {
//     await producer.send({
//       topic: process.env.KAFKA_TOPIC_ASYNC,
//       messages: [
//         {
//           value: JSON.stringify({
//             deviceId: 'sentinela-sala-01',
//             event: 'rede_status',
//             value: status.value,
//             ip: status.ip,
//             velocidade: status.velocidade,
//             timestamp_unix: Math.floor(Date.now() / 1000)
//           })
//         }
//       ]
//     });
//     await new Promise(r => setTimeout(r, 1000));
//   }

//   await producer.disconnect();
//   console.log('Mensagens de teste enviadas para o Kafka!');
// }

// sendTestMessages().catch(console.error);
