import { useState, useEffect } from 'react';
import { getCapteurs } from '../services/api';

export const useCapteurs = (salleId) => {
  const [temp, setTemp] = useState(null);
  const [hum, setHum] = useState(null);

  useEffect(() => {
    if (!salleId) return;
    const interval = setInterval(() => {
      getCapteurs(salleId).then(res => {
        setTemp(res.data.temperature);
        setHum(res.data.humidite);
      }).catch(console.error);
    }, 3000);
    return () => clearInterval(interval);
  }, [salleId]);

  return { temp, hum };
};