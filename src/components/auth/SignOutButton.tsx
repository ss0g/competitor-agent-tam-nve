'use client';

import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = () => {
    // Remove the mock user cookie
    Cookies.remove('mockUser');
    
    // Redirect to sign in page
    router.push('/auth/signin');
  };

  return (
    <button
      onClick={handleSignOut}
      className="text-sm font-medium text-gray-700 hover:text-gray-800"
    >
      Sign out
    </button>
  );
} 