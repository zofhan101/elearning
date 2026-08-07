import { BarChart3 } from "lucide-react";
export default function CourseStats() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Tracking and Statistics</h1>
      <div className="surface-card p-12 text-center text-sm text-muted-foreground">
        <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
        No content to display at this time.
      </div>
    </div>
  );
}
