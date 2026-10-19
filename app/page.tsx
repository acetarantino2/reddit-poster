import { getPassword, isAuthenticated } from '@/lib/auth';
import { storeStatus } from '@/lib/store';
import App from '@/components/App';
import LoginScreen from '@/components/LoginScreen';
import SetupScreen from '@/components/SetupScreen';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const missingDatabase = storeStatus() === 'missing';
  const missingPassword = !getPassword();
  if (missingDatabase || missingPassword) {
    return <SetupScreen missingDatabase={missingDatabase} missingPassword={missingPassword} />;
  }

  if (!(await isAuthenticated())) {
    return <LoginScreen />;
  }

  return <App />;
}
