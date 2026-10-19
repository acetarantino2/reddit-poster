interface SetupScreenProps {
  missingDatabase: boolean;
  missingPassword: boolean;
}

/** Shown on the live site until the database and team password are set up in Vercel. */
export default function SetupScreen({ missingDatabase, missingPassword }: SetupScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-panel border border-line rounded-xl p-7 space-y-4 text-muted">
        <h1 className="display text-[30px] text-ink">Almost ready — finish setup in Vercel</h1>
        <ol className="list-decimal pl-5 space-y-3">
          {missingDatabase && (
            <li>
              In your Vercel project, open <strong className="text-ink">Storage</strong> → <strong className="text-ink">Create Database</strong> → choose{' '}
              <strong className="text-ink">Upstash for Redis</strong> (free plan is fine) and connect it to this project.
            </li>
          )}
          {missingPassword && (
            <li>
              Open <strong className="text-ink">Settings → Environment Variables</strong> and add <code className="px-1 rounded bg-raised text-ink">APP_PASSWORD</code>{' '}
              with the password your team will use.
            </li>
          )}
          <li>
            Go to <strong className="text-ink">Deployments</strong> and <strong className="text-ink">Redeploy</strong> the latest one.
          </li>
        </ol>
      </div>
    </div>
  );
}
