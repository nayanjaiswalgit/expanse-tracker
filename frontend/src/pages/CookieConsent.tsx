import React, { useState, useEffect } from 'react';
import { X, Cookie } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const CookieConsent: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShowBanner(false);
  };

  const rejectCookies = () => {
    localStorage.setItem('cookie-consent', 'rejected');
    setShowBanner(false);
    // Clear any existing cookies except essential ones
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      if (name.trim() !== 'sessionid' && name.trim() !== 'csrftoken') {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white text-gray-900 border border-gray-200 shadow-lg z-50 transform transition-transform duration-500 ease-out translate-y-0 rounded-lg w-full sm:max-w-sm">
      <div className="mx-auto p-4">
        <div className="flex items-start justify-start gap-3">
          <div className="flex items-center gap-2">
            <Cookie className="h-4 w-4 text-gray-900 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Cookie Consent</h3>
              <p className="text-xs text-gray-700 mb-2 mt-1">
                We use cookies to improve your experience. By continuing to browse, you agree to our use of cookies.
              </p>
              <div className="flex justify-between items-center w-full mt-2">
                <div className="flex flex-wrap gap-1">
                  <Button
                    onClick={rejectCookies}
                    size="xs"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md px-3 py-1 text-xs"
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={acceptCookies}
                    variant="secondary"
                    size="xs"
                    className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-medium rounded-md px-3 py-1 text-xs"
                  >
                    Accept
                  </Button>
                </div>
                <a
                  href="/privacy-policy"
                  className="text-blue-600 hover:text-blue-700 text-xs underline flex items-center"
                >
                  Privacy Policy
                </a>
              </div>
            </div>
          </div>
          <Button
            onClick={rejectCookies}
            variant="ghost"
            aria-label="Close cookie banner"
            className="text-gray-700 hover:text-gray-900 p-1"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};