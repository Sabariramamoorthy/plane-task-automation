import { TaskWizard } from "@/components/wizard/TaskWizard";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
          Task Wizard
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Select a Plane instance, describe your tasks, review Groq output, and create issues.
        </p>
      </div>
      <TaskWizard />
    </div>
  );
}
