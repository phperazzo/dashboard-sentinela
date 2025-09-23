import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Paper, CircularProgress, Card, CardContent, Avatar } from '@mui/material';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import BoltIcon from '@mui/icons-material/Bolt';
import LanIcon from '@mui/icons-material/Lan';
import mqtt from 'mqtt';

const MQTT_OPTIONS = {
  host: '34.170.31.196',
  port: 9001, // WebSocket
  protocol: 'wss', // Tenta WSS
  username: 'device_001',
  password: 'IoTDevice2024!',
  keepalive: 60,
  clean: true,
};

const TOPICS = {
  temperature: 'sensors/temperature/data',
  humidity: 'sensors/humidity/data',
  voltage: 'sensors/voltage/data',
  ethernet: 'sensors/ethernet/data',
};

function App() {
  const [data, setData] = useState({
    temperature: null,
    humidity: null,
    voltage: null,
    ethernet: null,
  });
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const url = `wss://${MQTT_OPTIONS.host}:${MQTT_OPTIONS.port}/mqtt`;
    const client = mqtt.connect(url, {
      username: MQTT_OPTIONS.username,
      password: MQTT_OPTIONS.password,
      keepalive: MQTT_OPTIONS.keepalive,
      clean: MQTT_OPTIONS.clean,
    });

    client.on('connect', () => {
      setConnected(true);
      Object.values(TOPICS).forEach(topic => client.subscribe(topic));
    });

    client.on('message', (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        if (topic === TOPICS.temperature) {
          setData(prev => ({ ...prev, temperature: payload.temperature }));
        } else if (topic === TOPICS.humidity) {
          setData(prev => ({ ...prev, humidity: payload.humidity }));
        } else if (topic === TOPICS.voltage) {
          setData(prev => ({ ...prev, voltage: payload.voltage }));
        } else if (topic === TOPICS.ethernet) {
          setData(prev => ({ ...prev, ethernet: payload.status }));
        }
        setLoading(false);
      } catch (e) {
        // ignore parse errors
      }
    });

    client.on('error', () => setConnected(false));
    client.on('close', () => setConnected(false));

    return () => {
      client.end();
    };
  }, []);

  return (
    <Box sx={{ p: 4, minHeight: '100vh', background: 'linear-gradient(135deg, #1976d2 0%, #90caf9 100%)' }}>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" sx={{ color: '#fff', fontWeight: 700, letterSpacing: 2 }} gutterBottom>
          Sentinela IoT
        </Typography>
        <Typography variant="h6" sx={{ color: '#e3f2fd' }}>
          Monitoramento em tempo real
        </Typography>
        <Typography variant="subtitle1" sx={{ mt: 2, color: connected ? '#43a047' : '#d32f2f', fontWeight: 600 }}>
          {connected ? 'Conectado ao Broker MQTT' : 'Desconectado'}
        </Typography>
      </Box>
      <Grid container columns={12} spacing={4} justifyContent="center">
        <Grid gridColumn="span 3">
          <Card sx={{ bgcolor: '#fff', boxShadow: 3, borderRadius: 3 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#1976d2', width: 56, height: 56 }}>
                <ThermostatIcon fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h6" color="text.secondary">Temperatura</Typography>
                {loading ? <CircularProgress size={28} /> : <Typography variant="h4">{data.temperature ?? '--'} °C</Typography>}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid gridColumn="span 3">
          <Card sx={{ bgcolor: '#fff', boxShadow: 3, borderRadius: 3 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#0288d1', width: 56, height: 56 }}>
                <WaterDropIcon fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h6" color="text.secondary">Umidade</Typography>
                {loading ? <CircularProgress size={28} /> : <Typography variant="h4">{data.humidity ?? '--'} %</Typography>}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid gridColumn="span 3">
          <Card sx={{ bgcolor: '#fff', boxShadow: 3, borderRadius: 3 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: '#fbc02d', width: 56, height: 56 }}>
                <BoltIcon fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h6" color="text.secondary">Tensão</Typography>
                {loading ? <CircularProgress size={28} /> : <Typography variant="h4">{data.voltage ?? '--'} V</Typography>}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid gridColumn="span 3">
          <Card sx={{ bgcolor: '#fff', boxShadow: 3, borderRadius: 3 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: data.ethernet === 'ok' ? '#43a047' : '#d32f2f', width: 56, height: 56 }}>
                <LanIcon fontSize="large" />
              </Avatar>
              <Box>
                <Typography variant="h6" color="text.secondary">Ethernet</Typography>
                {loading ? <CircularProgress size={28} /> : <Typography variant="h4">{data.ethernet === 'ok' ? 'Normal' : 'Falha'}</Typography>}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default App;
