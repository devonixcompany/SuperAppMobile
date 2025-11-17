// Temporary App.tsx to fix entry point issue
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

export default function App() {
  const ctx = require.context('./app', true, /\.tsx?$/);
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);