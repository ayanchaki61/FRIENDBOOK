import { useEffect, useRef, useState } from 'react';
import api from '../api/client';

function GoogleAuthButton({ onCredential, disabled = false }) {
  const rawClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const builtClientId = typeof rawClientId === 'string' ? rawClientId.trim() : '';
  const getCachedClientId = () => {
    if (typeof window === 'undefined') return '';
    return window.sessionStorage.getItem('friendbook_google_client_id') || '';
  };
  const [runtimeClientId, setRuntimeClientId] = useState(getCachedClientId);
  const [runtimeChecked, setRuntimeChecked] = useState(false);
  const clientId = builtClientId || runtimeClientId;
  const isConfiguredClientId =
    clientId.length > 0
    && clientId.includes('.apps.googleusercontent.com')
    && !clientId.includes('your_google_oauth_client_id');
  const authSetupHint = import.meta.env.MODE === 'production'
    ? 'Set VITE_GOOGLE_CLIENT_ID in your production build environment (Azure app settings) and redeploy the frontend.'
    : 'Add VITE_GOOGLE_CLIENT_ID to client/.env and restart the frontend.';
  const clientIdStatus = !clientId
    ? 'No client ID was found in the built app or runtime config.'
    : builtClientId && clientId === builtClientId
    ? builtClientId.includes('your_google_oauth_client_id')
      ? 'The build-time client ID still contains the placeholder value.'
      : 'Client ID appears configured from build-time env.'
    : 'Client ID loaded from backend runtime config.';
  const clientIdPreview = clientId ? `Current value: ${clientId}` : 'Current value is empty.';
  const containerRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    const existingScript = document.getElementById('google-identity-script');
    if (existingScript) {
      if (window.google?.accounts?.id) {
        setScriptLoaded(true);
        return;
      }

      const handleLoad = () => setScriptLoaded(true);
      existingScript.addEventListener('load', handleLoad);

      // Fallback when the script already loaded before listener attachment.
      const readyCheck = window.setInterval(() => {
        if (window.google?.accounts?.id) {
          window.clearInterval(readyCheck);
          setScriptLoaded(true);
        }
      }, 100);

      return () => {
        existingScript.removeEventListener('load', handleLoad);
        window.clearInterval(readyCheck);
      };
    }

    const script = document.createElement('script');
    script.id = 'google-identity-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;

    const handleLoad = () => setScriptLoaded(true);
    script.addEventListener('load', handleLoad);
    document.body.appendChild(script);

    return () => {
      script.removeEventListener('load', handleLoad);
    };
  }, []);

  useEffect(() => {
    const loadRuntimeClientId = async () => {
      if (builtClientId) {
        setRuntimeChecked(true);
        return;
      }

      const cachedClientId = typeof window !== 'undefined'
        ? window.sessionStorage.getItem('friendbook_google_client_id')?.trim() || ''
        : '';

      if (cachedClientId) {
        setRuntimeClientId(cachedClientId);
        setRuntimeChecked(true);
        return;
      }

      try {
        const response = await api.get('/auth/config');
        const fetchedClientId = response?.data?.googleClientId?.trim() || '';
        if (fetchedClientId) {
          setRuntimeClientId(fetchedClientId);
          if (typeof window !== 'undefined') {
            window.sessionStorage.setItem('friendbook_google_client_id', fetchedClientId);
          }
        }
      } catch {
        // ignore runtime config fetch failures
      } finally {
        setRuntimeChecked(true);
      }
    };

    loadRuntimeClientId();
  }, [builtClientId]);

  useEffect(() => {
    if (!isConfiguredClientId || !scriptLoaded || !window.google || !containerRef.current) {
      return;
    }

    containerRef.current.innerHTML = '';

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response?.credential) {
          onCredential(response.credential);
        }
      },
    });

    const containerWidth = containerRef.current.parentElement?.clientWidth || 320;
    const buttonWidth = Math.max(220, Math.min(360, containerWidth));

    window.google.accounts.id.renderButton(containerRef.current, {
      type: 'standard',
      shape: 'pill',
      theme: 'outline',
      text: 'continue_with',
      size: 'large',
      width: buttonWidth,
    });
  }, [clientId, isConfiguredClientId, scriptLoaded, onCredential]);

  if (!isConfiguredClientId) {
    if (!runtimeChecked) {
      return <div className="google-btn-wrap" />;
    }

    return (
      <p className="muted">
        Google sign-in is not configured. Add your <code>VITE_GOOGLE_CLIENT_ID</code> in <code>client/.env</code> or your Azure app settings, then redeploy.
        <br />
        {authSetupHint}
        <br />
        {clientIdStatus}
        <br />
        <code>{clientIdPreview}</code>
      </p>
    );
  }

  return (
    <div className={`google-btn-wrap ${disabled ? 'disabled' : ''}`} aria-disabled={disabled}>
      <div ref={containerRef} />
    </div>
  );
}

export default GoogleAuthButton;
