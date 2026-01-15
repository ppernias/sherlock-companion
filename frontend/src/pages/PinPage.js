import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { verifyPin } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const PinPage = () => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginWithPin } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await verifyPin(pin);
      loginWithPin(response.data.token);
      navigate('/game');
    } catch (err) {
      setError(err.response?.data?.error || 'PIN incorrecto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card sx={{ textAlign: 'center' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              sx={{ color: 'primary.main', mb: 1 }}
            >
              Sherlock Companion
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{ color: 'text.secondary', mb: 4 }}
            >
              Sherlock Holmes Investigador Asesor
            </Typography>

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ mt: 3 }}
            >
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <TextField
                fullWidth
                label="PIN de acceso"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Introduce el PIN"
                inputProps={{
                  inputMode: 'numeric',
                  style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em' },
                }}
                sx={{ mb: 3 }}
                autoFocus
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading || !pin}
                startIcon={<SearchIcon />}
                sx={{ mb: 3, py: 1.5 }}
              >
                {loading ? 'Verificando...' : 'Iniciar Busqueda'}
              </Button>

              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                <Link
                  to="/admin"
                  style={{ color: '#C9A66B', textDecoration: 'none' }}
                >
                  Acceso Administrador
                </Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default PinPage;
