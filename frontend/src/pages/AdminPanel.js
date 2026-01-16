import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Chip,
  CircularProgress,
  InputAdornment,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Logout as LogoutIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  CloudUpload as CloudUploadIcon,
  Image as ImageIcon,
  AutoAwesome as AiIcon,
  Brush as BrushIcon,
  Refresh as RefreshIcon,
  PersonAdd as PersonAddIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  getCharacters,
  getCases,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  importCSV,
  exportAll,
  exportCase,
  uploadImage,
  getPin,
  updatePin,
  getStats,
  generatePrompt,
  generateImage,
  changePassword,
  getAdmins,
  createAdmin,
  deleteAdmin,
  getBackupStats,
  downloadBackup,
  validateBackup,
  restoreBackup,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// Categorías disponibles para TODOS los personajes
const CATEGORIAS = [
  'Sin categoría',
  'Baker Street',
  'Informantes',
  'Prensa',
  'Archivos',
  'Policía',
  'Servicios',
  'Medicina',
  'Legal',
  'Bajos fondos',
  'Vecindario',
  'Otros',
  'Jugadores',
];

// Categorías ocultas para jugadores (solo visibles en admin)
const CATEGORIAS_OCULTAS = ['Jugadores', 'Sin categoría'];

const AdminPanel = () => {
  const [tabValue, setTabValue] = useState(0);
  const [characters, setCharacters] = useState([]);
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCase, setFilterCase] = useState('');

  // Sorting state
  const [sortColumn, setSortColumn] = useState('nombre');
  const [sortDirection, setSortDirection] = useState('asc');

  // Dialog states
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    casos: '',
    nombre_caso: '',
    nombre: '',
    oficio: '',
    descripcion: '',
    prompt: '',
    image_file: '',
    categoria: 'Sin categoría',
    es_informante: false,
  });

  // Settings state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Admin management state
  const [admins, setAdmins] = useState([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [importFile, setImportFile] = useState(null);

  // AI Prompt generation state
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [suggestedPrompt, setSuggestedPrompt] = useState('');
  const [promptDialog, setPromptDialog] = useState(false);

  // AI Image generation state
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImageFile, setGeneratedImageFile] = useState('');
  const [imageDialog, setImageDialog] = useState(false);

  // Backup state
  const [backupStats, setBackupStats] = useState(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreValidation, setRestoreValidation] = useState(null);
  const [restoreMode, setRestoreMode] = useState('merge');
  const [restoreDialog, setRestoreDialog] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Notifications
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (tabValue === 0) {
      searchCharacters();
    }
  }, [searchTerm, filterCase, tabValue]);

  const loadData = async () => {
    try {
      const [casesRes, statsRes] = await Promise.all([getCases(), getStats()]);
      setCases(casesRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const searchCharacters = async () => {
    setLoading(true);
    try {
      const params = { limit: 500, includeUnassigned: 'true' };
      if (searchTerm) params.search = searchTerm;
      if (filterCase) {
        // Handle special filter values for global subtypes
        if (filterCase === '*:informante' || filterCase === '*:baker') {
          params.caso = '*';
        } else {
          params.caso = filterCase;
        }
        // Strict filter: don't include globals when filtering by specific case
        if (!filterCase.startsWith('*')) {
          params.excludeGlobal = 'true';
        }
      }
      let response = await getCharacters(params);
      let data = response.data;

      // Filter by informante subtype if needed
      if (filterCase === '*:informante') {
        data = data.filter(c => c.es_informante);
      } else if (filterCase === '*:baker') {
        data = data.filter(c => !c.es_informante);
      }

      setCharacters(data);
    } catch (err) {
      showSnackbar('Error al cargar personajes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Character CRUD
  const handleOpenCreate = () => {
    setSelectedCharacter(null);
    setFormData({
      casos: '',
      nombre_caso: '',
      nombre: '',
      oficio: '',
      descripcion: '',
      prompt: '',
      image_file: '',
      categoria: 'Sin categoría',
      es_informante: false,
    });
    setEditDialog(true);
  };

  const handleOpenEdit = (character) => {
    setSelectedCharacter(character);
    setFormData({
      casos: character.casos || '',
      nombre_caso: character.nombre_caso || '',
      nombre: character.nombre,
      oficio: character.oficio || '',
      descripcion: character.descripcion || '',
      prompt: character.prompt || '',
      image_file: character.image_file || '',
      categoria: character.categoria || 'Sin categoría',
      es_informante: character.es_informante || false,
    });
    setEditDialog(true);
  };

  const handleSaveCharacter = async () => {
    try {
      if (selectedCharacter) {
        await updateCharacter(selectedCharacter.id, formData);
        showSnackbar('Personaje actualizado');
      } else {
        await createCharacter(formData);
        showSnackbar('Personaje creado');
      }
      setEditDialog(false);
      searchCharacters();
      loadData();
    } catch (err) {
      showSnackbar(err.response?.data?.error || 'Error al guardar', 'error');
    }
  };

  const handleDeleteCharacter = async () => {
    try {
      await deleteCharacter(selectedCharacter.id);
      showSnackbar('Personaje eliminado');
      setDeleteDialog(false);
      searchCharacters();
      loadData();
    } catch (err) {
      showSnackbar('Error al eliminar', 'error');
    }
  };

  // Image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append('image', file);

    try {
      const response = await uploadImage(formDataUpload);
      setFormData({ ...formData, image_file: response.data.filename });
      showSnackbar('Imagen subida correctamente');
    } catch (err) {
      showSnackbar('Error al subir imagen', 'error');
    } finally {
      setUploading(false);
    }
  };

  // AI Prompt generation
  const handleGeneratePrompt = async () => {
    if (!formData.descripcion) {
      showSnackbar('Se necesita una descripcion para generar el prompt', 'warning');
      return;
    }

    setGeneratingPrompt(true);
    try {
      const response = await generatePrompt(formData.descripcion, formData.prompt);
      setSuggestedPrompt(response.data.prompt);
      setPromptDialog(true);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al generar prompt';
      showSnackbar(errorMsg, 'error');
    } finally {
      setGeneratingPrompt(false);
    }
  };

  const handleAcceptPrompt = () => {
    setFormData({ ...formData, prompt: suggestedPrompt });
    setPromptDialog(false);
    setSuggestedPrompt('');
    showSnackbar('Prompt aplicado');
  };

  // AI Image generation
  const handleGenerateImage = async () => {
    if (!formData.prompt) {
      showSnackbar('Se necesita un prompt para generar la imagen', 'warning');
      return;
    }

    setGeneratingImage(true);
    try {
      const response = await generateImage(formData.prompt);
      setGeneratedImageFile(response.data.filename);
      setImageDialog(true);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al generar imagen';
      showSnackbar(errorMsg, 'error');
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleAcceptImage = () => {
    setFormData({ ...formData, image_file: generatedImageFile });
    setImageDialog(false);
    setGeneratedImageFile('');
    showSnackbar('Imagen aplicada');
  };

  const handleRegenerateImage = async () => {
    setGeneratingImage(true);
    try {
      const response = await generateImage(formData.prompt);
      setGeneratedImageFile(response.data.filename);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al generar imagen';
      showSnackbar(errorMsg, 'error');
    } finally {
      setGeneratingImage(false);
    }
  };

  // Import/Export
  const handleImport = async () => {
    if (!importFile) return;

    const formDataImport = new FormData();
    formDataImport.append('file', importFile);

    try {
      const response = await importCSV(formDataImport);
      showSnackbar(`Importacion completada: ${response.data.inserted} nuevos, ${response.data.updated} actualizados`);
      setImportDialog(false);
      setImportFile(null);
      searchCharacters();
      loadData();
    } catch (err) {
      showSnackbar('Error al importar CSV', 'error');
    }
  };

  const handleExportAll = async () => {
    try {
      const response = await exportAll();
      downloadBlob(response.data, 'sherlock-characters.csv');
      showSnackbar('Exportacion completada');
    } catch (err) {
      showSnackbar('Error al exportar', 'error');
    }
  };

  const handleExportCase = async (caso) => {
    try {
      const response = await exportCase(caso);
      const caseInfo = cases.find(c => c.caso === caso);
      const filename = `Caso ${caso} ${caseInfo?.nombre_caso || ''}.csv`;
      downloadBlob(response.data, filename);
      showSnackbar('Exportacion completada');
    } catch (err) {
      showSnackbar('Error al exportar', 'error');
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Backup functions
  const loadBackupStats = async () => {
    try {
      const response = await getBackupStats();
      setBackupStats(response.data);
    } catch (err) {
      console.error('Error loading backup stats:', err);
    }
  };

  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    try {
      const response = await downloadBackup();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadBlob(response.data, `sherlock-backup-${timestamp}.zip`);
      showSnackbar('Backup descargado correctamente');
    } catch (err) {
      showSnackbar('Error al generar backup', 'error');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setRestoreFile(file);
    setRestoreValidation(null);

    try {
      const formData = new FormData();
      formData.append('backup', file);
      const response = await validateBackup(formData);
      setRestoreValidation(response.data);
    } catch (err) {
      showSnackbar(err.response?.data?.error || 'Error al validar backup', 'error');
      setRestoreFile(null);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) return;

    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append('backup', restoreFile);
      formData.append('mode', restoreMode);
      const response = await restoreBackup(formData);

      const { stats } = response.data;
      showSnackbar(
        `Restauracion completada: ${stats.inserted} nuevos, ${stats.updated} actualizados, ${stats.images_restored} imagenes`
      );

      setRestoreDialog(false);
      setRestoreFile(null);
      setRestoreValidation(null);
      searchCharacters();
      loadData();
    } catch (err) {
      showSnackbar(err.response?.data?.error || 'Error al restaurar backup', 'error');
    } finally {
      setRestoring(false);
    }
  };

  // Load backup stats when switching to import/export tab
  useEffect(() => {
    if (tabValue === 1) {
      loadBackupStats();
    }
  }, [tabValue]);

  // Settings
  const handleOpenSettings = async () => {
    try {
      const [pinRes, adminsRes] = await Promise.all([getPin(), getAdmins()]);
      setCurrentPin(pinRes.data.pin);
      setAdmins(adminsRes.data);
      setNewPin('');
      setCurrentPassword('');
      setNewPassword('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setSettingsDialog(true);
    } catch (err) {
      showSnackbar('Error al cargar configuracion', 'error');
    }
  };

  const handleSavePin = async () => {
    try {
      await updatePin(newPin);
      showSnackbar('PIN actualizado');
      setNewPin('');
    } catch (err) {
      showSnackbar(err.response?.data?.error || 'Error al actualizar PIN', 'error');
    }
  };

  const handleChangePassword = async () => {
    try {
      await changePassword(currentPassword, newPassword);
      showSnackbar('Contraseña actualizada');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      showSnackbar(err.response?.data?.error || 'Error al cambiar contraseña', 'error');
    }
  };

  const handleCreateAdmin = async () => {
    try {
      await createAdmin(newAdminEmail, newAdminPassword);
      showSnackbar('Administrador creado');
      setNewAdminEmail('');
      setNewAdminPassword('');
      // Reload admins list
      const adminsRes = await getAdmins();
      setAdmins(adminsRes.data);
    } catch (err) {
      showSnackbar(err.response?.data?.error || 'Error al crear administrador', 'error');
    }
  };

  const handleDeleteAdmin = async (id) => {
    try {
      await deleteAdmin(id);
      showSnackbar('Administrador eliminado');
      // Reload admins list
      const adminsRes = await getAdmins();
      setAdmins(adminsRes.data);
    } catch (err) {
      showSnackbar(err.response?.data?.error || 'Error al eliminar administrador', 'error');
    }
  };

  const getImageUrl = (imageFile) => {
    if (!imageFile) return null;
    if (imageFile.startsWith('http')) return imageFile;
    // Remove extension to bypass nginx static file rules
    const nameWithoutExt = imageFile.replace(/\.(png|jpg|jpeg|gif|webp)$/i, '');
    return `/img/${nameWithoutExt}`;
  };

  // Sorting functions
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedCharacters = () => {
    // Check if we're viewing only globals
    const viewingGlobals = filterCase && filterCase.startsWith('*');

    return [...characters].sort((a, b) => {
      let aVal, bVal;

      switch (sortColumn) {
        case 'caso':
          if (viewingGlobals) {
            // When viewing globals, sort by: es_informante (Baker Street first), then categoria, then nombre
            // Baker Street (no informante) = 0, Informante = 1
            const aType = a.es_informante ? '1' : '0';
            const bType = b.es_informante ? '1' : '0';
            const aCat = (a.categoria || 'Sin categoría').toLowerCase();
            const bCat = (b.categoria || 'Sin categoría').toLowerCase();
            const aName = (a.nombre || '').toLowerCase();
            const bName = (b.nombre || '').toLowerCase();
            aVal = `${aType}_${aCat}_${aName}`;
            bVal = `${bType}_${bCat}_${bName}`;
          } else {
            // Normal sorting: by case number, with global (*) and unassigned ('') at the end
            aVal = a.casos === '*' ? 'zzz_global' : (a.casos === '' ? 'zzz_unassigned' : a.casos.padStart(5, '0'));
            bVal = b.casos === '*' ? 'zzz_global' : (b.casos === '' ? 'zzz_unassigned' : b.casos.padStart(5, '0'));
          }
          break;
        case 'categoria':
          aVal = a.categoria || 'Sin categoría';
          bVal = b.categoria || 'Sin categoría';
          break;
        case 'nombre':
          aVal = a.nombre || '';
          bVal = b.nombre || '';
          break;
        case 'oficio':
          aVal = a.oficio || '';
          bVal = b.oficio || '';
          break;
        default:
          aVal = a.nombre || '';
          bVal = b.nombre || '';
      }

      // Convertir a minúsculas para comparación
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const SortableHeader = ({ column, label }) => (
    <TableCell
      onClick={() => handleSort(column)}
      sx={{
        cursor: 'pointer',
        userSelect: 'none',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {label}
        {sortColumn === column && (
          sortDirection === 'asc' ? <ArrowUpIcon fontSize="small" /> : <ArrowDownIcon fontSize="small" />
        )}
      </Box>
    </TableCell>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" sx={{ bgcolor: 'background.paper' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, color: 'primary.main' }}>
            Sherlock Companion - Admin
          </Typography>
          <IconButton color="primary" onClick={handleOpenSettings} title="Configuracion">
            <SettingsIcon />
          </IconButton>
          <IconButton color="primary" onClick={handleLogout} title="Salir">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Stats Cards */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ color: 'primary.main' }}>{stats.totalCharacters}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Personajes</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ color: 'primary.main' }}>{stats.totalCases}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Casos</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ color: 'primary.main' }}>{stats.charactersWithImages}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Con imagen</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
          <Tab label="Personajes" />
          <Tab label="Import/Export" />
        </Tabs>

        {/* Characters Tab */}
        {tabValue === 0 && (
          <Card>
            <CardContent>
              <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Filtrar por caso</InputLabel>
                    <Select
                      value={filterCase}
                      onChange={(e) => setFilterCase(e.target.value)}
                      label="Filtrar por caso"
                    >
                      <MenuItem value="">Todos</MenuItem>
                      <MenuItem value="*">Globales (todos)</MenuItem>
                      <MenuItem value="*:informante">└ Solo Informantes</MenuItem>
                      <MenuItem value="*:baker">└ Solo Baker Street</MenuItem>
                      {cases.map((c) => (
                        <MenuItem key={c.caso} value={String(c.caso)}>Caso {c.caso}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4} sx={{ textAlign: 'right' }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenCreate}
                  >
                    Nuevo Personaje
                  </Button>
                </Grid>
              </Grid>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer component={Paper} sx={{ bgcolor: 'background.default' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <SortableHeader column="caso" label="Tipo/Caso" />
                        <SortableHeader column="categoria" label="Categoría" />
                        <SortableHeader column="nombre" label="Nombre" />
                        <SortableHeader column="oficio" label="Oficio" />
                        <TableCell>Imagen</TableCell>
                        <TableCell align="right">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getSortedCharacters().map((char) => (
                        <TableRow key={char.id} hover>
                          <TableCell>
                            <Chip
                              label={
                                char.casos === '*'
                                  ? (char.es_informante ? 'Informante' : 'Global')
                                  : (char.casos === '' ? 'Sin asignar' : `Caso ${char.casos}`)
                              }
                              size="small"
                              color={
                                char.casos === '*'
                                  ? (char.es_informante ? 'secondary' : 'primary')
                                  : (char.casos === '' ? 'warning' : 'default')
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={char.categoria || 'Sin categoría'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>{char.nombre}</TableCell>
                          <TableCell>{char.oficio || '-'}</TableCell>
                          <TableCell>
                            {char.image_file ? (
                              <ImageIcon sx={{ color: 'success.main' }} />
                            ) : (
                              <ImageIcon sx={{ color: 'text.disabled' }} />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => handleOpenEdit(char)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedCharacter(char);
                                setDeleteDialog(true);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Import/Export Tab */}
        {tabValue === 1 && (
          <Grid container spacing={3}>
            {/* Backup Completo */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                <BackupIcon /> Backup Completo
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    Descargar Backup
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    Descarga un archivo ZIP con todos los personajes, imagenes y configuracion.
                  </Typography>
                  {backupStats && (
                    <Box sx={{ mb: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="body2">
                        {backupStats.total_characters} personajes, {backupStats.total_images} imagenes
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Tamano estimado: {(backupStats.estimated_size / 1024 / 1024).toFixed(1)} MB
                      </Typography>
                    </Box>
                  )}
                  <Button
                    variant="contained"
                    startIcon={backupLoading ? <CircularProgress size={20} color="inherit" /> : <BackupIcon />}
                    onClick={handleDownloadBackup}
                    disabled={backupLoading}
                    fullWidth
                  >
                    {backupLoading ? 'Generando...' : 'Descargar Backup ZIP'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    Restaurar Backup
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    Restaura personajes e imagenes desde un archivo ZIP de backup.
                  </Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<RestoreIcon />}
                    fullWidth
                  >
                    Seleccionar archivo ZIP
                    <input
                      type="file"
                      hidden
                      accept=".zip"
                      onChange={handleRestoreFileSelect}
                    />
                  </Button>
                  {restoreValidation && (
                    <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
                        <CheckCircleIcon fontSize="small" /> Backup valido
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {restoreValidation.stats.characters} personajes, {restoreValidation.stats.images} imagenes
                      </Typography>
                      {restoreValidation.stats.backup_date && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Fecha: {new Date(restoreValidation.stats.backup_date).toLocaleString()}
                        </Typography>
                      )}
                      <Box sx={{ mt: 2 }}>
                        <Button
                          variant="contained"
                          color="warning"
                          startIcon={<RestoreIcon />}
                          onClick={() => setRestoreDialog(true)}
                          fullWidth
                        >
                          Restaurar
                        </Button>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Divider */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                Import/Export CSV
              </Typography>
            </Grid>

            {/* Importar CSV */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    Importar CSV
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    Formato: Caso;Nombre del caso;Nombre;Oficio;Descripcion;Prompt;image_file;Categoria;Es informante
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    onClick={() => setImportDialog(true)}
                    fullWidth
                  >
                    Importar archivo CSV
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Exportar CSV */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    Exportar CSV
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleExportAll}
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    Exportar todos los personajes
                  </Button>
                  {cases.length > 0 && (
                    <>
                      <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                        O exportar por caso:
                      </Typography>
                      <Grid container spacing={1}>
                        {cases.map((c) => (
                          <Grid item key={c.caso}>
                            <Chip
                              label={`Caso ${c.caso}`}
                              onClick={() => handleExportCase(c.caso)}
                              clickable
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Container>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedCharacter ? 'Editar Personaje' : 'Nuevo Personaje'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.casos === '*'}
                    onChange={(e) => setFormData({
                      ...formData,
                      casos: e.target.checked ? '*' : '',
                      nombre_caso: e.target.checked ? '' : formData.nombre_caso,
                      es_informante: e.target.checked ? formData.es_informante : false
                    })}
                    color="secondary"
                  />
                }
                label="Personaje global (disponible en todos los casos)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.es_informante}
                    onChange={(e) => setFormData({
                      ...formData,
                      es_informante: e.target.checked
                    })}
                    color="primary"
                    disabled={formData.casos !== '*'}
                  />
                }
                label="Es informante (aparece en sección Informantes)"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Casos"
                value={formData.casos}
                onChange={(e) => setFormData({ ...formData, casos: e.target.value })}
                disabled={formData.casos === '*'}
                helperText={formData.casos === '*' ? 'Global: todos los casos' : (formData.casos === '' ? 'Sin asignar aún' : 'Ej: 1 o 1,2,3')}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Nombre del caso"
                value={formData.nombre_caso}
                onChange={(e) => setFormData({ ...formData, nombre_caso: e.target.value })}
                disabled={formData.casos === '*' || formData.casos === ''}
                helperText={formData.casos === '*' || formData.casos === '' ? 'Solo para personajes con caso' : 'Ej: La muerte del Támesis'}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Categoría</InputLabel>
                <Select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  label="Categoría"
                >
                  {CATEGORIAS.map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombre del personaje"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Oficio o filiacion"
                value={formData.oficio}
                onChange={(e) => setFormData({ ...formData, oficio: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  fullWidth
                  label="Prompt para IA"
                  value={formData.prompt}
                  onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                  multiline
                  rows={3}
                  helperText="Prompt para generar imagen con IA si no existe"
                />
                <Button
                  variant="outlined"
                  onClick={handleGeneratePrompt}
                  disabled={generatingPrompt || !formData.descripcion}
                  sx={{ minWidth: 120, height: 56 }}
                  startIcon={generatingPrompt ? <CircularProgress size={20} /> : <AiIcon />}
                  title={!formData.descripcion ? 'Escribe una descripcion primero' : 'Generar prompt con IA'}
                >
                  {generatingPrompt ? 'Generando...' : 'Generar'}
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  fullWidth
                  label="Archivo de imagen"
                  value={formData.image_file}
                  onChange={(e) => setFormData({ ...formData, image_file: e.target.value })}
                  helperText="Nombre del archivo, sube una imagen o genera con IA"
                />
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                  disabled={uploading}
                  sx={{ minWidth: 100 }}
                >
                  Subir
                  <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleGenerateImage}
                  disabled={generatingImage || !formData.prompt}
                  sx={{ minWidth: 140 }}
                  startIcon={generatingImage ? <CircularProgress size={20} /> : <BrushIcon />}
                  title={!formData.prompt ? 'Escribe un prompt primero' : 'Generar imagen con GPT-Image'}
                >
                  {generatingImage ? 'Generando...' : 'Generar IA'}
                </Button>
              </Box>
              {formData.image_file && (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <img
                    src={getImageUrl(formData.image_file)}
                    alt="Preview"
                    style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8 }}
                  />
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSaveCharacter}
            disabled={!formData.nombre}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Confirmar eliminacion</DialogTitle>
        <DialogContent>
          <Typography>
            Estas seguro de eliminar a "{selectedCharacter?.nombre}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDeleteCharacter}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialog} onClose={() => setImportDialog(false)}>
        <DialogTitle>Importar CSV</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            El archivo CSV debe tener los campos separados por punto y coma (;):
            <br />
            Caso;Nombre del caso;Nombre;Oficio o filiacion;Descripcion;Prompt;image_file
          </Typography>
          <Button variant="outlined" component="label" fullWidth startIcon={<UploadIcon />}>
            Seleccionar archivo
            <input
              type="file"
              hidden
              accept=".csv"
              onChange={(e) => setImportFile(e.target.files[0])}
            />
          </Button>
          {importFile && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Archivo seleccionado: {importFile.name}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setImportDialog(false); setImportFile(null); }}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleImport} disabled={!importFile}>
            Importar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialog} onClose={() => !restoring && setRestoreDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RestoreIcon color="warning" />
          Restaurar Backup
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Esta accion modificara la base de datos. Asegurate de tener un backup actual antes de continuar.
          </Alert>

          {restoreValidation && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Contenido del backup:</strong>
              </Typography>
              <Typography variant="body2">
                - {restoreValidation.stats.characters} personajes
              </Typography>
              <Typography variant="body2">
                - {restoreValidation.stats.images} imagenes
              </Typography>
              {restoreValidation.stats.has_settings && (
                <Typography variant="body2">
                  - Configuracion incluida
                </Typography>
              )}
            </Box>
          )}

          <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
            Modo de restauracion:
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <Select
              value={restoreMode}
              onChange={(e) => setRestoreMode(e.target.value)}
              size="small"
            >
              <MenuItem value="merge">
                Fusionar (actualiza existentes, anade nuevos)
              </MenuItem>
              <MenuItem value="replace">
                Reemplazar todo (borra datos actuales)
              </MenuItem>
            </Select>
          </FormControl>

          {restoreMode === 'replace' && (
            <Alert severity="error" sx={{ mb: 2 }}>
              ATENCION: Se borraran todos los personajes actuales antes de restaurar.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialog(false)} disabled={restoring}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleRestore}
            disabled={restoring}
            startIcon={restoring ? <CircularProgress size={20} color="inherit" /> : <RestoreIcon />}
          >
            {restoring ? 'Restaurando...' : 'Confirmar Restauracion'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsDialog} onClose={() => setSettingsDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configuracion</DialogTitle>
        <DialogContent>
          {/* PIN Section */}
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>
            PIN de acceso para jugadores
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            PIN actual: <strong>{currentPin}</strong>
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="Nuevo PIN"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              helperText="Minimo 4 caracteres"
            />
            <Button
              variant="contained"
              onClick={handleSavePin}
              disabled={newPin.length < 4}
              sx={{ height: 40 }}
            >
              Guardar
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Password Section */}
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>
            Cambiar mi contraseña
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="password"
            label="Contraseña actual"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <TextField
              fullWidth
              size="small"
              type="password"
              label="Nueva contraseña"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="Minimo 6 caracteres"
            />
            <Button
              variant="contained"
              onClick={handleChangePassword}
              disabled={!currentPassword || newPassword.length < 6}
              sx={{ height: 40 }}
            >
              Cambiar
            </Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Admin Management Section */}
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'primary.main' }}>
            Administradores
          </Typography>
          <List dense sx={{ bgcolor: 'background.default', borderRadius: 1, mb: 2 }}>
            {admins.map((admin) => (
              <ListItem key={admin.id}>
                <ListItemText
                  primary={admin.email}
                  secondary={admin.isCurrentUser ? '(Tu cuenta)' : null}
                />
                <ListItemSecondaryAction>
                  {!admin.isCurrentUser && (
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleDeleteAdmin(admin.id)}
                      title="Eliminar administrador"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
            Crear nuevo administrador:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              label="Email"
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              sx={{ flex: 1, minWidth: 150 }}
            />
            <TextField
              size="small"
              label="Contraseña"
              type="password"
              value={newAdminPassword}
              onChange={(e) => setNewAdminPassword(e.target.value)}
              sx={{ flex: 1, minWidth: 150 }}
            />
            <Button
              variant="outlined"
              onClick={handleCreateAdmin}
              disabled={!newAdminEmail || newAdminPassword.length < 6}
              startIcon={<PersonAddIcon />}
              sx={{ height: 40 }}
            >
              Crear
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* AI Prompt Suggestion Dialog */}
      <Dialog open={promptDialog} onClose={() => setPromptDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AiIcon sx={{ color: 'primary.main' }} />
          Prompt generado por IA
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Revisa el prompt sugerido y acepta para aplicarlo:
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {suggestedPrompt}
            </Typography>
          </Paper>
          {formData.prompt && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                Prompt actual (sera reemplazado):
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'background.default', opacity: 0.7 }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {formData.prompt}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromptDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleAcceptPrompt}
            startIcon={<AiIcon />}
          >
            Aceptar prompt
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Image Generation Dialog */}
      <Dialog open={imageDialog} onClose={() => !generatingImage && setImageDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BrushIcon sx={{ color: 'secondary.main' }} />
          Imagen generada por IA
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Revisa la imagen generada. Puedes aceptarla, generar otra variacion o cancelar.
          </Typography>
          <Box sx={{ textAlign: 'center', position: 'relative', minHeight: 300 }}>
            {generatingImage ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300 }}>
                <CircularProgress size={60} color="secondary" />
                <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                  Generando imagen con GPT-Image...
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  Esto puede tardar 10-30 segundos
                </Typography>
              </Box>
            ) : generatedImageFile && (
              <img
                src={getImageUrl(generatedImageFile)}
                alt="Imagen generada"
                style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageDialog(false)} disabled={generatingImage}>
            Cancelar
          </Button>
          <Button
            variant="outlined"
            onClick={handleRegenerateImage}
            disabled={generatingImage}
            startIcon={<RefreshIcon />}
          >
            Generar otra
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleAcceptImage}
            disabled={generatingImage || !generatedImageFile}
            startIcon={<BrushIcon />}
          >
            Usar esta imagen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminPanel;
