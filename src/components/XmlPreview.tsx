import React, { useState } from 'react';
import { Paper, Typography, Button, Box, TextField } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface XmlPreviewProps {
  xml: string;
}

const XmlPreview: React.FC<XmlPreviewProps> = ({ xml }) => {
  const [copySuccess, setCopySuccess] = useState('');

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(xml);
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      setCopySuccess('Failed to copy!');
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">XML Output</Typography>
        <Button
          variant="outlined"
          startIcon={<ContentCopyIcon />}
          onClick={copyToClipboard}
          size="small"
        >
          {copySuccess || 'Copy'}
        </Button>
      </Box>
      <TextField
        multiline
        fullWidth
        value={xml}
        InputProps={{
          readOnly: true,
          style: {
            fontFamily: 'monospace',
            whiteSpace: 'pre',
            maxHeight: '400px',
            overflow: 'auto',
          },
        }}
        variant="outlined"
        minRows={10}
        maxRows={20}
      />
    </Paper>
  );
};

export default XmlPreview; 