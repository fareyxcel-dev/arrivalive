import loadingGif from '@/assets/loading.gif';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner = ({ size = 'md', className = '' }: Props) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img 
        src={loadingGif} 
        alt="Loading..." 
        className={`${sizeClasses[size]} object-contain`}
      />
    </div>
  );
};

export default LoadingSpinner;
