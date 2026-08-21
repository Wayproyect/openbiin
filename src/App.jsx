import React from 'react';
import { Box, Container, AppBar, Toolbar, Typography, IconButton } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ExtensionIcon from '@mui/icons-material/Extension'; // Placeholder for logo
import BINSearch from './components/BINSearch';
import './index.css';

function App() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>

      {/* Navbar */}


      {/* Main Content */}
      <Box sx={{ flexGrow: 1 }}>
        <BINSearch />
      </Box>

    </Box>
  );
}

export default App;
