import React, { useState } from 'react';
import { Upload, X, Music, FileAudio } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { formatFileSize } from '@/utils/helpers';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  label?: string;
  description?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = '.mp3,.wav,.flac,.aac,.ogg',
  maxSize = 50 * 1024 * 1024,
  label = '上传音乐文件',
  description = '支持 MP3, WAV, FLAC 格式，最大 50MB',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      validateAndSelectFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      validateAndSelectFile(files[0]);
    }
  };

  const validateAndSelectFile = (file: File) => {
    setError(null);

    const validTypes = accept.split(',').map((t) => t.trim().toLowerCase());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(fileExtension)) {
      setError(`不支持的文件格式。请上传 ${accept} 格式的文件`);
      return;
    }

    if (file.size > maxSize) {
      setError(`文件过大。最大支持 ${formatFileSize(maxSize)}`);
      return;
    }

    onFileSelect(file);
  };

  return (
    <div className="w-full">
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 cursor-pointer',
          isDragging
            ? 'border-accent bg-accent/10'
            : 'border-industrial-border bg-industrial-bg hover:border-accent/50 hover:bg-industrial-panel'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center transition-colors',
              isDragging ? 'bg-accent/20' : 'bg-industrial-panel'
            )}
          >
            <Upload className={cn('w-8 h-8', isDragging ? 'text-accent' : 'text-industrial-muted')} />
          </div>
          <div>
            <p className="font-mono text-sm text-industrial-text">{label}</p>
            <p className="text-xs text-industrial-muted mt-1">{description}</p>
          </div>
        </div>

        {isDragging && (
          <div className="absolute inset-0 bg-accent/5 rounded-lg pointer-events-none border-2 border-accent" />
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 rounded-lg bg-danger/10 border border-danger/30 flex items-center gap-2">
          <X className="w-4 h-4 text-danger flex-shrink-0" />
          <span className="text-xs text-danger">{error}</span>
        </div>
      )}
    </div>
  );
};

interface FileInfoProps {
  name: string;
  size: number;
  format: string;
  duration?: number;
  onRemove?: () => void;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
}

export const FileInfo: React.FC<FileInfoProps> = ({
  name,
  size,
  format,
  duration,
  onRemove,
  onAnalyze,
  isAnalyzing,
}) => {
  return (
    <div className="p-4 rounded-lg bg-industrial-bg border border-industrial-border flex items-center gap-4">
      <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center border border-accent/30">
        <FileAudio className="w-6 h-6 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-mono text-sm text-industrial-text truncate">{name}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-industrial-muted">{format}</span>
          <span className="text-xs text-industrial-muted">•</span>
          <span className="text-xs text-industrial-muted">{formatFileSize(size)}</span>
          {duration !== undefined && (
            <>
              <span className="text-xs text-industrial-muted">•</span>
              <span className="text-xs text-industrial-muted">
                {Math.floor(duration / 60000)}:{String(Math.floor((duration % 60000) / 1000)).padStart(2, '0')}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onAnalyze && (
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="industrial-button-primary flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">分析中...</span>
              </>
            ) : (
              <>
                <Music className="w-4 h-4" />
                <span className="text-xs">分析节拍</span>
              </>
            )}
          </button>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            className="industrial-button p-2 text-industrial-muted hover:text-danger"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
