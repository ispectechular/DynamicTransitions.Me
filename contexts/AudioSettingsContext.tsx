import React, { createContext, useState, ReactNode } from 'react';

interface AudioSettings {
  voice: string;
  rate: number;
  volume: number;
}

interface AudioSettingsContextType {
  settings: AudioSettings;
  setSettings: (settings: AudioSettings) => void;
}

const defaultSettings: AudioSettings = {
  voice: 'Kore',
  rate: 1.0,
  volume: 1.0,
};

export const AudioSettingsContext = createContext<AudioSettingsContextType>({
  settings: defaultSettings,
  setSettings: () => {},
});

interface AudioSettingsProviderProps {
  children: ReactNode;
}

export const AudioSettingsProvider: React.FC<AudioSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AudioSettings>(defaultSettings);

  return (
    <AudioSettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </AudioSettingsContext.Provider>
  );
};