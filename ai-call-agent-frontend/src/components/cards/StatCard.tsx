interface StatCardProps {
    title: string;
    value: string | number;
    description?: string;
}

export function StatCard({ title, value, description }: StatCardProps) {
    return (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{title}</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-900">{value}</h2>

            {description && (
                <p className="mt-2 text-xs text-gray-400">{description}</p>
            )}
        </div>
    );
}