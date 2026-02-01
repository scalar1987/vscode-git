import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface ComponentData {
  label: string;
  percentage: number;
  color: string;
  outputs?: string[];
}

interface ComponentProgressProps {
  data: ComponentData[];
  loading?: boolean;
  className?: string;
}

export function ComponentProgress({ data, loading, className }: ComponentProgressProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Component Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex justify-between mb-2">
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="h-4 bg-gray-200 rounded w-10" />
                </div>
                <div className="h-3 bg-gray-200 rounded w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Component Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {data.map((component, index) => (
            <motion.div
              key={component.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 truncate pr-2">
                  {component.label}
                </span>
                <span className={cn(
                  'text-sm font-semibold tabular-nums',
                  component.percentage >= 80 && 'text-dg-green-600',
                  component.percentage >= 50 && component.percentage < 80 && 'text-dg-blue-600',
                  component.percentage >= 30 && component.percentage < 50 && 'text-dg-amber-600',
                  component.percentage < 30 && 'text-red-500'
                )}>
                  {component.percentage}%
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: component.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${component.percentage}%` }}
                  transition={{ duration: 0.8, delay: 0.2 + index * 0.1, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
