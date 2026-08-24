export const metadata = {
  title: "Marketing Website",
  description: "EaziAICall public marketing website shell foundation.",
};

export default function MarketingShellPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="flex flex-col items-center space-y-4 text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          EaziAICall Marketing Website
        </h1>
        <p className="max-w-md text-muted-foreground">Marketing content will appear here.</p>
      </div>
    </section>
  );
}
