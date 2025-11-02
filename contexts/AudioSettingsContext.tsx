import React, { createContext, useState, ReactNode } from 'react';

interface AudioSettings {
  voice: string;
  rate: number;
  volume: number;
  isTtsOn: boolean;
}

interface AudioSettingsContextType {
  settings: AudioSettings;
  setSettings: (settings: AudioSettings) => void;
  toggleTts: () => void;
}

const defaultSettings: AudioSettings = {
  voice: 'Kore',
  rate: 1.0,
  volume: 1.0,
  isTtsOn: true,
};

export const AudioSettingsContext = createContext<AudioSettingsContextType>({
  settings: defaultSettings,
  setSettings: () => {},
  toggleTts: () => {},
});

interface AudioSettingsProviderProps {
  children: ReactNode;
}

export const AudioSettingsProvider: React.FC<AudioSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AudioSettings>(defaultSettings);

  const toggleTts = () => {
    setSettings(prev => ({ ...prev, isTtsOn: !prev.isTtsOn }));
  };

  return (
    <AudioSettingsContext.Provider value={{ settings, setSettings, toggleTts }}>
      {children}
    </AudioSettingsContext.Provider>
  );
};
