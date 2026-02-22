import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Grid,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  AppBar,
  Toolbar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Fade,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  ContentCopy as CopyIcon,
  Info as InfoIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { getCharacters, getCases } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Categorías ocultas para jugadores (solo visibles en admin)
const CATEGORIAS_OCULTAS = ['Jugadores', 'Sin categoría'];

const GameMode = () => {
  const [characters, setCharacters] = useState([]);
  const [cases, setCases] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCase, setSelectedCase] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { logout, maxCase } = useAuth();

  // Load cases on mount and when maxCase changes
  useEffect(() => {
    loadCases();
  }, [maxCase]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm || selectedCase) {
        searchCharacters();
      } else {
        setCharacters([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedCase]);

  const loadCases = async () => {
    try {
      const response = await getCases();
      // Filter cases to only show those within maxCase access level
      const accessibleCases = response.data.filter(c => {
        const caseNum = parseInt(c.caso);
        return caseNum <= (maxCase || 10);
      });
      setCases(accessibleCases);
    } catch (err) {
      console.error('Error loading cases:', err);
    }
  };

  const searchCharacters = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 500 };  // Aumentar límite para incluir todos los personajes
      if (searchTerm) params.search = searchTerm;
      if (selectedCase) params.caso = selectedCase;
      const response = await getCharacters(params);
      // Filtrar por nivel de acceso y categorías ocultas
      const visibleCharacters = response.data.filter(c => {
        // Excluir categorías ocultas
        if (CATEGORIAS_OCULTAS.includes(c.categoria)) return false;

        // Global characters (*) are always visible
        if (c.casos === '*') return true;

        // For case-specific characters, check if ALL their cases are within maxCase
        if (c.casos) {
          const caseNumbers = c.casos.split(',').map(n => parseInt(n.trim()));
          // Only show if at least one case is accessible
          return caseNumbers.some(caseNum => caseNum <= (maxCase || 10));
        }

        return false; // Unassigned characters not visible in game mode
      });
      setCharacters(visibleCharacters);
    } catch (err) {
      setError('Error al buscar personajes');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCharacterClick = (character) => {
    setSelectedCharacter(character);
  };

  const handleCloseDialog = () => {
    setSelectedCharacter(null);
  };

  const handleCopyPrompt = () => {
    if (selectedCharacter?.prompt) {
      navigator.clipboard.writeText(selectedCharacter.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getImageUrl = (imageFile) => {
    if (!imageFile) return null;
    if (imageFile.startsWith('http')) return imageFile;
    // Remove extension to bypass nginx static file rules
    const nameWithoutExt = imageFile.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '');
    return `/img/${nameWithoutExt}`;
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* App Bar */}
      <AppBar position="sticky" sx={{ bgcolor: 'background.paper' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, color: 'primary.main' }}>
            Sherlock Companion
          </Typography>
          <Chip
            label={maxCase === 10 ? 'Todos los casos' : `Casos 1-${maxCase}`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ mr: 2 }}
          />
          <IconButton color="primary" onClick={handleLogout} title="Salir">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Search Section */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  placeholder="Buscar por nombre, oficio o descripcion..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Filtrar por caso</InputLabel>
                  <Select
                    value={selectedCase}
                    onChange={(e) => setSelectedCase(e.target.value)}
                    label="Filtrar por caso"
                  >
                    <MenuItem value="">Todos los casos</MenuItem>
                    {cases.map((c) => (
                      <MenuItem key={c.caso} value={c.caso}>
                        Caso {c.caso}: {c.nombre_caso}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                  {characters.length} resultados
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Loading */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress color="primary" />
          </Box>
        )}

        {/* Results */}
        {!loading && characters.length === 0 && (searchTerm || selectedCase) && (
          <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
            No se encontraron personajes
          </Typography>
        )}

        {!loading && characters.length === 0 && !searchTerm && !selectedCase && (
          <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
            Introduce un termino de busqueda o selecciona un caso
          </Typography>
        )}

        {/* Regular Characters (non-global) */}
        {characters.filter(c => !c.es_global).length > 0 && (
          <>
            {selectedCase && (
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon /> Personajes del Caso
              </Typography>
            )}
            <Grid container spacing={2}>
              {characters.filter(c => !c.es_global).map((character) => (
                <Grid item xs={12} sm={6} md={4} key={character.id}>
                  <Card>
                    <CardActionArea onClick={() => handleCharacterClick(character)}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          <Box
                            sx={{
                              width: 60,
                              height: 60,
                              borderRadius: 1,
                              bgcolor: 'background.default',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              overflow: 'hidden',
                            }}
                          >
                            {character.image_file ? (
                              <img
                                src={getImageUrl(character.image_file)}
                                alt={character.nombre}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <PersonIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
                            )}
                          </Box>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                              {character.nombre}
                            </Typography>
                            {character.oficio && (
                              <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                                {character.oficio}
                              </Typography>
                            )}
                            <Chip
                              label={`Caso ${character.casos}`}
                              size="small"
                              sx={{ mt: 1 }}
                            />
                          </Box>
                        </Box>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {/* Baker Street Section (Global characters that are NOT informantes) */}
        {characters.filter(c => c.es_global && !c.es_informante).length > 0 && (
          <>
            {selectedCase && characters.filter(c => !c.es_global).length > 0 && (
              <Divider sx={{ my: 4 }}>
                <Chip icon={<HomeIcon />} label="Baker Street" color="primary" />
              </Divider>
            )}
            {!selectedCase || characters.filter(c => !c.es_global).length === 0 ? (
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                <HomeIcon /> Baker Street
              </Typography>
            ) : null}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {characters.filter(c => c.es_global && !c.es_informante).map((character) => (
                <Grid item xs={12} sm={6} md={4} key={character.id}>
                  <Card sx={{ borderLeft: '3px solid', borderColor: 'primary.main' }}>
                    <CardActionArea onClick={() => handleCharacterClick(character)}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          <Box
                            sx={{
                              width: 60,
                              height: 60,
                              borderRadius: 1,
                              bgcolor: 'background.default',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              overflow: 'hidden',
                            }}
                          >
                            {character.image_file ? (
                              <img
                                src={getImageUrl(character.image_file)}
                                alt={character.nombre}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <PersonIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
                            )}
                          </Box>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                              {character.nombre}
                            </Typography>
                            {character.oficio && (
                              <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                                {character.oficio}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {/* Informantes Section (Global characters that ARE informantes, grouped by category) */}
        {characters.filter(c => c.es_global && c.es_informante).length > 0 && (
          <>
            <Divider sx={{ my: 4 }}>
              <Chip icon={<InfoIcon />} label="Informantes" color="secondary" />
            </Divider>
            {[...new Set(characters.filter(c => c.es_global && c.es_informante).map(c => c.categoria))].map((categoria) => (
              <Box key={categoria} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1.5, color: 'secondary.main', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InfoIcon fontSize="small" /> {categoria}
                </Typography>
                <Grid container spacing={2}>
                  {characters.filter(c => c.es_global && c.es_informante && c.categoria === categoria).map((character) => (
                    <Grid item xs={12} sm={6} md={4} key={character.id}>
                      <Card sx={{ borderLeft: '3px solid', borderColor: 'secondary.main' }}>
                        <CardActionArea onClick={() => handleCharacterClick(character)}>
                          <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                              <Box
                                sx={{
                                  width: 60,
                                  height: 60,
                                  borderRadius: 1,
                                  bgcolor: 'background.default',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  overflow: 'hidden',
                                }}
                              >
                                {character.image_file ? (
                                  <img
                                    src={getImageUrl(character.image_file)}
                                    alt={character.nombre}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <PersonIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
                                )}
                              </Box>
                              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                                  {character.nombre}
                                </Typography>
                                {character.oficio && (
                                  <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                                    {character.oficio}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))}
          </>
        )}
      </Container>

      {/* Character Detail Dialog */}
      <Dialog
        open={!!selectedCharacter}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedCharacter && (
          <>
            <Box sx={{ position: 'absolute', right: 8, top: 8, zIndex: 1 }}>
              <IconButton onClick={handleCloseDialog}>
                <CloseIcon />
              </IconButton>
            </Box>
            <DialogContent sx={{ p: 0 }}>
              <Grid container>
                {/* Image Section */}
                <Grid item xs={12} md={5}>
                  <Box
                    sx={{
                      height: { xs: 250, md: '100%' },
                      minHeight: { md: 400 },
                      bgcolor: 'background.default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 2,
                    }}
                  >
                    {selectedCharacter.image_file ? (
                      <img
                        src={getImageUrl(selectedCharacter.image_file)}
                        alt={selectedCharacter.nombre}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          borderRadius: 8,
                        }}
                      />
                    ) : (
                      <Box sx={{ textAlign: 'center' }}>
                        <PersonIcon sx={{ fontSize: 100, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Imagen no disponible
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>

                {/* Info Section */}
                <Grid item xs={12} md={7}>
                  <Box sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      <Chip
                        label={selectedCharacter.es_global ? 'Global' : `Caso ${selectedCharacter.casos}${selectedCharacter.nombre_caso ? ': ' + selectedCharacter.nombre_caso : ''}`}
                        color={selectedCharacter.es_global ? 'secondary' : 'default'}
                      />
                      {selectedCharacter.categoria && selectedCharacter.categoria !== 'Sin categoría' && (
                        <Chip
                          label={selectedCharacter.categoria}
                          variant="outlined"
                        />
                      )}
                    </Box>
                    <Typography variant="h4" sx={{ mb: 1, color: 'primary.main' }}>
                      {selectedCharacter.nombre}
                    </Typography>
                    {selectedCharacter.oficio && (
                      <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
                        {selectedCharacter.oficio}
                      </Typography>
                    )}

                    {selectedCharacter.descripcion && (
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>
                          Descripcion
                        </Typography>
                        <Typography variant="body1">
                          {selectedCharacter.descripcion}
                        </Typography>
                      </Box>
                    )}

                    {/* Show prompt if no image */}
                    {!selectedCharacter.image_file && selectedCharacter.prompt && (
                      <Box
                        sx={{
                          mt: 3,
                          p: 2,
                          bgcolor: 'background.default',
                          borderRadius: 1,
                          border: '1px dashed',
                          borderColor: 'primary.main',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ color: 'primary.main' }}>
                            Prompt para generar imagen
                          </Typography>
                          <IconButton size="small" onClick={handleCopyPrompt} title="Copiar prompt">
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Box>
                        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                          {selectedCharacter.prompt}
                        </Typography>
                        <Fade in={copied}>
                          <Typography variant="caption" sx={{ color: 'success.main', mt: 1, display: 'block' }}>
                            Prompt copiado al portapapeles
                          </Typography>
                        </Fade>
                      </Box>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default GameMode;
