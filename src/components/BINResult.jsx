import React, { useState } from 'react';
import { Box, Typography, Collapse, IconButton, useTheme, useMediaQuery, Divider, Grid, Paper, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PublicIcon from '@mui/icons-material/Public';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PaymentIcon from '@mui/icons-material/Payment';

function SingleResultCard({ data, isMobile }) {
  const [expanded, setExpanded] = useState(true);

  const bin6 = data.bin;
  const ranges = data.ranges ? data.ranges.split('|').map(r => `${bin6}${r.split('-')[0]} - ${bin6}${r.split('-')[1] || r}`).join(', ') : 'All';
  const issuer = data.issuer || 'Unknown';
  const country = data.country || 'Unknown';
  const brand = data.brand || 'Unknown';
  const type = data.type || 'Unknown';

  if (!isMobile) return null;

  return (
    <Paper elevation={3} sx={{ mt: 2, mb: 2, overflow: 'hidden', borderRadius: 2 }}>
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, cursor: 'pointer', bgcolor: 'background.paper' }}
        onClick={() => setExpanded(!expanded)}
      >
        <Typography variant="h6" fontWeight="bold">BIN: {bin6}</Typography>
        <IconButton size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <AccountBalanceIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Box>
            <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', display: 'block' }}>Issuer</Typography>
            <Typography variant="body1" fontWeight="500" color="textPrimary">{issuer}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <PublicIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Box>
            <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', display: 'block' }}>Country</Typography>
            <Typography variant="body1" fontWeight="500" color="textPrimary">{country}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <CreditCardIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Box>
            <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', display: 'block' }}>Brand</Typography>
            <Typography variant="body1" fontWeight="500" color="textPrimary" sx={{ textTransform: 'capitalize' }}>{brand}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <PaymentIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Box>
            <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', display: 'block' }}>Type</Typography>
            <Typography variant="body1" fontWeight="500" color="textPrimary" sx={{ textTransform: 'capitalize' }}>{type}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
          <SyncAltIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Box>
            <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'uppercase', display: 'block' }}>Ranges</Typography>
            <Typography variant="body1" fontWeight="500" color="textPrimary">{ranges}</Typography>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
}

export default function BINResult({ data, error }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (error) {
    return (
      <Box className="result-card" sx={{ p: 3, mt: 4, textAlign: 'center', borderTop: '4px solid #f44336' }}>
        <Typography variant="h6" color="error">{error}</Typography>
      </Box>
    );
  }

  if (!data || !data.results) return null;

  return (
    <Box sx={{ mt: 4, mb: 4 }}>
      {data.results.length > 1 && (
        <Typography variant="subtitle1" color="textSecondary" sx={{ mb: 2 }}>
          Found {data.results.length} possible issuers for this BIN. Search with 8 digits to be more specific.
        </Typography>
      )}

      {isMobile ? (
        data.results.map((result, idx) => (
          <SingleResultCard key={`${result.bin}-${idx}`} data={result} isMobile={isMobile} />
        ))
      ) : (
        <Paper elevation={3} sx={{ mt: { xs: 2, md: 0 }, mb: 4, overflow: 'hidden', borderRadius: 2, position: 'relative', zIndex: 10 }}>
          <Table sx={{ width: '100%' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem', fontWeight: 600 }}>BIN6</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem', fontWeight: 600 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}><AccountBalanceIcon sx={{ color: '#1976d2', mr: 1, fontSize: 18 }} />ISSUER</Box>
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem', fontWeight: 600 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}><PublicIcon sx={{ color: '#1976d2', mr: 1, fontSize: 18 }} />COUNTRY</Box>
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem', fontWeight: 600 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}><CreditCardIcon sx={{ color: '#1976d2', mr: 1, fontSize: 18 }} />BRAND</Box>
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem', fontWeight: 600 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}><PaymentIcon sx={{ color: '#1976d2', mr: 1, fontSize: 18 }} />TYPE</Box>
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem', fontWeight: 600 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}><SyncAltIcon sx={{ color: '#1976d2', mr: 1, fontSize: 18 }} />RANGES</Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.results.map((result, idx) => {
                const bin6 = result.bin;
                const ranges = result.ranges ? result.ranges.split('|').map(r => `${bin6}${r.split('-')[0]} - ${bin6}${r.split('-')[1] || r}`).join(', ') : 'All';
                return (
                  <TableRow key={`${result.bin}-${idx}`} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell sx={{ fontSize: '0.95rem', fontWeight: 'bold' }}>{bin6}</TableCell>
                    <TableCell sx={{ fontSize: '0.95rem' }}>{result.issuer}</TableCell>
                    <TableCell sx={{ fontSize: '0.95rem' }}>{result.country}</TableCell>
                    <TableCell sx={{ fontSize: '0.95rem', textTransform: 'capitalize' }}>{result.brand}</TableCell>
                    <TableCell sx={{ fontSize: '0.95rem', textTransform: 'capitalize' }}>{result.type}</TableCell>
                    <TableCell sx={{ fontSize: '0.95rem' }}>{ranges}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
