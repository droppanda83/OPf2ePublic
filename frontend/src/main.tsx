import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DiceRollerProvider } from './components/DiceRollerContext';
import BattleAnimationProvider from './components/BattleAnimationOverlay';
import './index.css';

console.log('🚀 Main.tsx loading...');
const rootElement = document.getElementById('root');
console.log('📌 Root element:', rootElement);

if (rootElement) {
  console.log('✅ Root element found, mounting React app...');
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <DiceRollerProvider>
        <BattleAnimationProvider>
          <App />
        </BattleAnimationProvider>
      </DiceRollerProvider>
    </React.StrictMode>
  );
  console.log('✅ React app mounted');
} else {
  console.error('❌ Root element not found!');
}
