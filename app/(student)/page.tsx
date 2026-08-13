'use client';

import dynamic from 'next/dynamic';

// Disable SSR so client-only hooks (localStorage, Web Speech API) work without hydration mismatches
const App = dynamic(() => import('@/App'), { ssr: false });

export default function Page() {
  return <App />;
}
