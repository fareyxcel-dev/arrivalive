import SkyIframeBackground from './SkyIframeBackground';

interface Props {
  weather?: { temp: number; condition: string } | null;
}

// Simplified background - just the iframe, no extra layers/animations
const AnimatedBackground = ({ weather }: Props) => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Single Layer: Full-screen iframe background */}
      <SkyIframeBackground weatherData={null} />
    </div>
  );
};

export default AnimatedBackground;
