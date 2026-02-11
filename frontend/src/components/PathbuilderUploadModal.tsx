import React, { useState, useRef } from 'react';
import { parsePathbuilderCharacter, validatePathbuilderJSON } from '../utils/pathbuilderImport';
import { Creature } from '../../../shared/types';

interface PathbuilderUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCharacterImported: (creatures: Creature[]) => void;
  multiple?: boolean;
}

export const PathbuilderUploadModal: React.FC<PathbuilderUploadModalProps> = ({
  isOpen,
  onClose,
  onCharacterImported,
  multiple = true
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [parseErrors, setParseErrors] = useState<{ file: string; error: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    // Validate file types
    const validFiles = selectedFiles.filter(file => {
      if (!file.name.toLowerCase().endsWith('.json')) {
        setError(`File "${file.name}" is not a JSON file`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setFiles(multiple ? [...files, ...validFiles] : validFiles);
      setError(null);
    }

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    setLoading(true);
    setParseErrors([]);
    const importedCreatures: Creature[] = [];
    const errors: { file: string; error: string }[] = [];

    for (const file of files) {
      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Validate Pathbuilder format
        const validation = validatePathbuilderJSON(data);
        if (!validation.valid) {
          errors.push({ file: file.name, error: validation.error || 'Invalid format' });
          continue;
        }

        // Parse and convert to Creature
        try {
          const creature = parsePathbuilderCharacter(data);
          importedCreatures.push(creature);
        } catch (parseError: any) {
          errors.push({ file: file.name, error: parseError.message || 'Failed to parse character' });
        }
      } catch (error: any) {
        errors.push({ file: file.name, error: error.message || 'Failed to read file' });
      }
    }

    setLoading(false);

    if (errors.length > 0) {
      setParseErrors(errors);
    }

    if (importedCreatures.length > 0) {
      onCharacterImported(importedCreatures);
      // Reset after successful import
      setFiles([]);
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#1a1a1a',
          border: '2px solid #00d4aa',
          borderRadius: '8px',
          padding: '25px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          color: '#e0e0e0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#00d4aa' }}>Import Pathbuilder Characters</h2>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #666',
              color: '#e0e0e0',
              cursor: 'pointer',
              padding: '5px 10px',
              borderRadius: '4px',
              fontSize: '16px',
            }}
          >
            ✕
          </button>
        </div>

        {/* File Upload Area */}
        <div
          style={{
            border: '2px dashed #00d4aa',
            borderRadius: '6px',
            padding: '20px',
            textAlign: 'center',
            backgroundColor: '#0d0d0d',
            marginBottom: '15px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.style.backgroundColor = '#1a2a2a';
          }}
          onDragLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#0d0d0d';
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.backgroundColor = '#0d0d0d';
            const droppedFiles = Array.from(e.dataTransfer.files);
            handleFileSelect({
              target: { files: droppedFiles } as any,
            } as React.ChangeEvent<HTMLInputElement>);
          }}
        >
          <div style={{ color: '#00d4aa', marginBottom: '10px' }}>📁</div>
          <div style={{ color: '#e0e0e0', marginBottom: '8px' }}>Click to select or drag & drop JSON files</div>
          <div style={{ color: '#888', fontSize: '12px' }}>Pathbuilder 2e export files only</div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            multiple={multiple}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              backgroundColor: '#7d000a',
              border: '1px solid #d4460a',
              borderRadius: '4px',
              padding: '10px',
              marginBottom: '15px',
              color: '#ff9999',
              fontSize: '13px',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Selected Files List */}
        {files.length > 0 && (
          <div style={{ marginBottom: '15px' }}>
            <div style={{ color: '#a876ff', fontWeight: 'bold', marginBottom: '10px', fontSize: '12px', textTransform: 'uppercase' }}>
              Selected Files ({files.length})
            </div>
            <div>
              {files.map((file, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#0d0d0d',
                    padding: '8px 10px',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    fontSize: '13px',
                    border: '1px solid #333',
                  }}
                >
                  <span>📄 {file.name}</span>
                  <button
                    onClick={() => handleRemoveFile(index)}
                    style={{
                      backgroundColor: '#d4460a',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      fontSize: '12px',
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Parse Errors */}
        {parseErrors.length > 0 && (
          <div style={{ marginBottom: '15px' }}>
            <div style={{ color: '#ff9999', fontWeight: 'bold', marginBottom: '10px', fontSize: '12px', textTransform: 'uppercase' }}>
              Import Errors
            </div>
            <div>
              {parseErrors.map((parseError, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: '#3d0a0a',
                    border: '1px solid #d4460a',
                    padding: '8px 10px',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    fontSize: '12px',
                  }}
                >
                  📄 <strong>{parseError.file}</strong>: {parseError.error}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #666',
              color: '#e0e0e0',
              cursor: 'pointer',
              padding: '8px 15px',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={files.length === 0 || loading}
            style={{
              backgroundColor: files.length > 0 && !loading ? '#00d4aa' : '#333333',
              border: 'none',
              color: files.length > 0 && !loading ? '#000' : '#666',
              cursor: files.length > 0 && !loading ? 'pointer' : 'not-allowed',
              padding: '8px 15px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            {loading ? '⏳ Importing...' : `Import ${files.length} File${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>

        {/* Info Text */}
        <div style={{ marginTop: '15px', fontSize: '12px', color: '#888', borderTop: '1px solid #333', paddingTop: '15px' }}>
          <strong>About Pathbuilder Format:</strong> Export your character from Pathbuilder 2e as JSON and upload the file here. Each JSON file will be imported as a separate character. Characters will be added to your combat at position (0, 0).
        </div>
      </div>
    </div>
  );
};
