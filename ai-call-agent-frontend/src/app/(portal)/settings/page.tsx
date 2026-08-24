export default function SettingsPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">AI Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure AI voice, business prompt, language, and model settings.
        </p>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">
          Business-level voice and agent configuration is deferred to later
          modules (Authentication → Organizations → Business → Agents). This
          page is an intentional Module 0 placeholder.
        </p>
      </div>
    </>
  );
}
