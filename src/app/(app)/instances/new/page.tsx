import { InstanceSettingsForm } from "@/components/instances/InstanceSettingsForm";

export default function NewInstancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Add Plane Instance</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Enter all Plane connection settings for this instance.
        </p>
      </div>
      <InstanceSettingsForm mode="create" />
    </div>
  );
}
