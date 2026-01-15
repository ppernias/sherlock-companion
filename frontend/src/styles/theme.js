import { createTheme } from '@mui/material/styles';

// Victorian/Sherlock theme - dark elegant colors
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#C9A66B', // Gold/brass
      light: '#E4C896',
      dark: '#8B7355',
      contrastText: '#1A1A1A',
    },
    secondary: {
      main: '#8B0000', // Dark red
      light: '#B22222',
      dark: '#5C0000',
      contrastText: '#FFFFFF',
    },
    background: {
      default: 'transparent', // Transparent to show wallpaper
      paper: 'rgba(44, 24, 16, 0.85)', // Semi-transparent dark mahogany
    },
    text: {
      primary: '#E8DCC8', // Parchment
      secondary: '#A89880', // Faded parchment
    },
    divider: '#4A3728',
    error: {
      main: '#B22222',
    },
    warning: {
      main: '#DAA520',
    },
    success: {
      main: '#2E8B57',
    },
  },
  typography: {
    fontFamily: '"Lora", "Times New Roman", serif',
    h1: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 700,
    },
    h2: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 600,
    },
    h3: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 600,
    },
    h4: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 600,
    },
    h5: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 500,
    },
    h6: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 500,
    },
    button: {
      fontWeight: 600,
      letterSpacing: '0.05em',
    },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          padding: '10px 24px',
        },
        contained: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(44, 24, 16, 0.9)',
          borderRadius: 8,
          border: '1px solid #4A3728',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#4A3728',
            },
            '&:hover fieldset': {
              borderColor: '#C9A66B',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(44, 24, 16, 0.9)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(44, 24, 16, 0.95)',
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(44, 24, 16, 0.95)',
          backdropFilter: 'blur(10px)',
        },
      },
    },
  },
});

export default theme;
