import React, { useState, useRef } from 'react';
import { Box, Typography, Container, CircularProgress, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import GitHubIcon from '@mui/icons-material/GitHub';
import BINResult from './BINResult';

export default function BINSearch() {
  const [bin, setBin] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [searchedBin, setSearchedBin] = useState('');
  const typingTimeout = useRef(null);

  const executeSearch = async (overrideBin = null) => {
    // Si recibe argumento lo usa, sino usa el estado 'bin'
    const targetBin = typeof overrideBin === 'string' ? overrideBin : bin;
    const rawBin = targetBin.replace(/\s/g, '');
    if (rawBin.length < 6) return;

    setLoading(true);
    setError(null);
    setSearchedBin(rawBin.substring(0, 6)); // For display in results

    try {
      const response = await fetch(`/api/${rawBin}`);
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'BIN not found');
        setResult(null);
      } else {
        setResult(data);
        setError(null);
      }
    } catch (err) {
      setError('Failed to connect to API');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      executeSearch();
    }
  };

  const handleInputChange = (e) => {
    // Solo permitir números
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 19) {
      // Agregar espacios cada 4 caracteres
      const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
      setBin(formatted);

      // Auto-search Debounce
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }

      if (value.length >= 6) {
        typingTimeout.current = setTimeout(() => {
          executeSearch(value);
        }, 700); // Esperar 700ms de inactividad antes de consultar
      }
    }
  };

  return (
    <Box>
      <Box className="hero-section">
        <Container maxWidth="md">
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>
            OPENBIIN
          </Typography>

          <Box className="search-input-wrapper">
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9\s]*"
              className="search-input"
              placeholder="Enter BIN (6-8 digits)"
              value={bin}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />
            <button className="search-button" onClick={executeSearch}>
              <SearchIcon />
            </button>
          </Box>

          {loading && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={20} color="inherit" />
              <Typography variant="body2">Loading...</Typography>
            </Box>
          )}
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ px: 2 }}>
        <BINResult data={result} error={error} searchedBin={searchedBin} />

        {/* Swagger-like API Docs */}
        <Box sx={{ mt: 6, mb: 6, textAlign: 'left', fontFamily: 'sans-serif' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight="bold" sx={{ color: 'var(--text-dark)' }}>
              API Reference
            </Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              href="https://github.com/wayproyect/openbiin" 
              target="_blank"
              startIcon={<GitHubIcon />}
              sx={{ textTransform: 'none', fontWeight: 'bold' }}
            >
              Contribute on GitHub
            </Button>
          </Box>

          <Box sx={{
            border: '1px solid #61affe',
            borderRadius: '4px',
            bgcolor: 'rgba(97, 175, 254, 0.1)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              p: 1.5,
              bgcolor: 'rgba(97, 175, 254, 0.1)',
              borderBottom: '1px solid #61affe'
            }}>
              <Box sx={{
                bgcolor: '#61affe',
                color: 'white',
                px: 2,
                py: 0.5,
                borderRadius: '3px',
                fontWeight: 'bold',
                fontSize: '0.85rem'
              }}>
                GET
              </Box>
              <Typography sx={{ ml: 2, fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                /api/{"{bin}"}
              </Typography>
              <Typography sx={{ ml: 2, color: 'text.secondary', fontSize: '0.9rem' }}>
                Returns BIN issuer information
              </Typography>
            </Box>

            {/* Body */}
            <Box sx={{ p: 3, bgcolor: '#ffffff' }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, borderBottom: '1px solid #eee', pb: 1 }}>
                Parameters
              </Typography>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', fontSize: '0.85rem', color: '#666' }}>
                    <th style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>Name</th>
                    <th style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '12px 0', verticalAlign: 'top', borderBottom: '1px solid #eee' }}>
                      <strong>bin</strong><br />
                      <span style={{ color: '#d32f2f', fontSize: '0.8rem' }}>* required</span>
                      <span style={{ fontSize: '0.85rem', color: '#666' }}> string</span>
                    </td>
                    <td style={{ padding: '12px 0', verticalAlign: 'top', borderBottom: '1px solid #eee', fontSize: '0.9rem' }}>
                      The 6 to 8 digit Bank Identification Number.
                      <i> Example: {result ? result.requested_bin : '410063'}</i>
                    </td>
                  </tr>
                </tbody>
              </table>

              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, borderBottom: '1px solid #eee', pb: 1 }}>
                Responses
              </Typography>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', fontSize: '0.85rem', color: '#666' }}>
                    <th style={{ padding: '8px 0', borderBottom: '1px solid #eee', width: '80px' }}>Code</th>
                    <th style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '12px 0', verticalAlign: 'top' }}>
                      <strong>200</strong>
                    </td>
                    <td style={{ padding: '12px 0', verticalAlign: 'top' }}>
                      <span style={{ fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>Successful operation</span>
                      <Box sx={{ bgcolor: '#282c34', color: '#abb2bf', p: 2, borderRadius: '4px', overflowX: 'auto' }}>
                        <pre style={{ margin: 0, fontSize: '0.85rem', fontFamily: 'monospace' }}>
                          {result ? JSON.stringify(result, null, 2) :
                            `{
  "bin": "string",
  "requested_bin": "string",
  "results": [
    {
      "bin": "string",
      "ranges": "string",
      "issuer": "string",
      "country": "string",
      "brand": "string",
      "type": "string"
    }
  ]
}`}
                        </pre>
                      </Box>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
