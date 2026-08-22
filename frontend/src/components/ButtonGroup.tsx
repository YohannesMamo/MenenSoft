// ButtonGroup.tsx
import React from 'react';

interface ActionButtonProps {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({ 
  icon, 
  label, 
  onClick, 
  active = false, 
  disabled = false 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium border-none transition-all duration-200 shadow-sm ${
        active
          ? 'bg-blue-500 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
      } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {icon && <span style={{ fontSize: '16px' }}>{icon}</span>}
      <span>{label}</span>
    </button>
  );
};

interface ButtonGroupProps {
  onNotesClick: () => void;
  onHelpersClick: () => void;
  onTtsClick: () => void;
  activeButton?: 'notes' | 'helpers' | 'tts' | null;
  isTtsPlaying?: boolean;
}

// Changed name to ButtonGroup for clarity
const ButtonGroup: React.FC<ButtonGroupProps> = ({
  onNotesClick,
  onHelpersClick,
  onTtsClick,
  activeButton = null,
  isTtsPlaying = false,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: '10px',
        padding: '0px',
        backgroundColor: 'transparent',
        flexWrap: 'nowrap',
      }}
    >
      <ActionButton
        icon="📝"
        label="Notes"
        onClick={onNotesClick}
        active={activeButton === 'notes'}
      />
      
      <ActionButton
        icon="🛟"
        label="Helpers"
        onClick={onHelpersClick}
        active={activeButton === 'helpers'}
      />
      
      <ActionButton
        icon={isTtsPlaying ? "🔊" : "🎧"}
        label={isTtsPlaying ? "Playing..." : "TTS"}
        onClick={onTtsClick}
        active={activeButton === 'tts'}
      />
    </div>
  );
};

export default ButtonGroup;  // ← Export as ButtonGroup