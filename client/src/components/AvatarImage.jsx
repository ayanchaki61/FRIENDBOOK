import defaultAvatar from '../assets/default-avatar.svg';

function AvatarImage({ src, alt, className }) {
  const safeSrc = typeof src === 'string' ? src.trim() : '';
  const finalSrc = safeSrc || defaultAvatar;

  const handleError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = defaultAvatar;
  };

  return <img src={finalSrc} alt={alt} className={className} onError={handleError} />;
}

export default AvatarImage;
