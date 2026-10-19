interface SetupScreenProps {
  missingDatabase: boolean;
  missingPassword: boolean;
}

/** Shown on the live site until the database and team password are set up in Vercel. */
export default function SetupScreen({ missingDatabase, missingPassword }: SetupScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-4 text-sm text-gray-700 dark:text-gray-300">
        <h1 className="font-semibold text-gray-900 dark:text-white text-base">Almost ready — finish setup in Vercel</h1>
        <ol className="list-decimal pl-5 space-y-3">
          {missingDatabase && (
            <li>
              In your Vercel project, open <strong>Storage</strong> → <strong>Create Database</strong> → choose{' '}
              <strong>Upstash for Redis</strong> (free plan is fine) and connect it to this project.
            </li>
          )}
          {missingPassword && (
            <li>
              Open <strong>Settings → Environment Variables</strong> and add <code className="px-1 rounded bg-gray-100 dark:bg-gray-800">APP_PASSWORD</code>{' '}
              with the password your team will use.
            </li>
          )}
          <li>
            Go to <strong>Deployments</strong> and <strong>Redeploy</strong> the latest one.
          </li>
        </ol>
      </div>
    </div>
  );
}
