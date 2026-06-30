import { getActiveSessionUser } from "@/lib/auth-session";
import { getHistoryForUser } from "@/lib/history-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HistoryPage() {
  const user = await getActiveSessionUser();
  const data = user ? await getHistoryForUser(user.id) : { batches: [], issues: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">History</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Recent Groq batches and Plane issue creation results.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Created Issues</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.issues.length ? (
            data.issues.map((issue) => (
              <div key={issue.id} className="rounded-md border border-zinc-200 p-4 text-sm break-words">
                <p className="font-medium break-words">{issue.taskName}</p>
                <p className="text-zinc-500">
                  {new Date(issue.createdAt).toLocaleString()}
                </p>
                {issue.planeUrl ? (
                  <a
                    href={issue.planeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all underline"
                  >
                    Open in Plane
                  </a>
                ) : (
                  <p className="text-red-600">{issue.error}</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-600">No issues created yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Task Batches</CardTitle>
          <CardDescription>Raw inputs sent to Groq.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.batches.length ? (
            data.batches.map((batch) => (
              <div key={batch.id} className="rounded-md border border-zinc-200 p-4 text-sm">
                <p className="font-medium">{batch.instance.name}</p>
                <p className="text-zinc-500">
                  {new Date(batch.createdAt).toLocaleString()} · {batch.status}
                </p>
                <p className="mt-2 break-words whitespace-pre-wrap text-zinc-700">
                  {batch.rawInput.slice(0, 280)}
                  {batch.rawInput.length > 280 ? "..." : ""}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-600">No batches yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
