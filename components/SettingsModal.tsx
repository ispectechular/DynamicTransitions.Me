import React, { useContext } from 'react';
import { AudioSettingsContext } from '../contexts/AudioSettingsContext';
import { TTS_VOICES } from '../constants';
import { CloseIcon } from './icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, setSettings } = useContext(AudioSettingsContext);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Audio Guide Settings</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="voice" className="block text-sm font-medium text-gray-700 mb-1">Voice</label>
            <select
              id="voice"
              value={settings.voice}
              onChange={(e) => setSettings({ ...settings, voice: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#A2C5AC] focus:border-[#A2C5AC] bg-white"
            >
              {TTS_VOICES.map((voice) => (
                <option key={voice.name} value={voice.name}>{voice.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="rate" className="block text-sm font-medium text-gray-700 mb-1">
              Speed: <span className="font-bold text-[#6A9084]">{settings.rate.toFixed(1)}x</span>
            </label>
            <input
              type="range"
              id="rate"
              min="0.5"
              max="2"
              step="0.1"
              value={settings.rate}
              onChange={(e) => setSettings({ ...settings, rate: parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#A2C5AC]"
            />
          </div>

          <div>
            <label htmlFor="volume" className="block text-sm font-medium text-gray-700 mb-1">
              Volume: <span className="font-bold text-[#6A9084]">{Math.round(settings.volume * 100)}%</span>
            </label>
            <input
              type="range"
              id="volume"
              min="0"
              max="1"
              step="0.05"
              value={settings.volume}
              onChange={(e) => setSettings({ ...settings, volume: parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#A2C5AC]"
            />
          </div>
        </div>

        <div className="mt-8 text-right">
            <button
                onClick={onClose}
                className="w-full sm:w-auto bg-[#A2C5AC] text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-[#9DB5B2] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A2C5AC]"
            >
                Done
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;