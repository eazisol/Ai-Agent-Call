import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function SettingsPage() {
    return (
        <DashboardLayout>
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">AI Settings</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Configure AI voice, business prompt, language, and model settings.
                </p>
            </div>

            <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">
                    AI configuration form will be added in the next step.
                </p>
            </div>
        </DashboardLayout>
    );
}