import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface Activity {
  date: string;
  activity: string;
  status: 'Completed' | 'Upcoming' | 'In Progress';
}

interface ActivityTimelineProps {
  activities: Activity[];
  className?: string;
  maxItems?: number;
}

export function ActivityTimeline({ activities, className, maxItems = 6 }: ActivityTimelineProps) {
  const displayedActivities = activities.slice(0, maxItems);

  const getStatusStyles = (status: Activity['status']) => {
    switch (status) {
      case 'Completed':
        return {
          badge: 'bg-dg-green-100 text-dg-green-700',
          line: 'bg-dg-green-300',
          dot: 'bg-dg-green-500',
        };
      case 'In Progress':
        return {
          badge: 'bg-dg-amber-100 text-dg-amber-700',
          line: 'bg-dg-amber-300',
          dot: 'bg-dg-amber-500',
        };
      case 'Upcoming':
        return {
          badge: 'bg-dg-blue-100 text-dg-blue-700',
          line: 'bg-gray-200',
          dot: 'bg-dg-blue-500',
        };
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200" />

          <div className="space-y-4">
            {displayedActivities.map((item, index) => {
              const styles = getStatusStyles(item.status);
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="relative flex gap-4 pl-8"
                >
                  {/* Timeline dot */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.08 + 0.2 }}
                    className={cn(
                      'absolute left-0 top-1.5 w-6 h-6 rounded-full flex items-center justify-center bg-white border-2',
                      item.status === 'Completed' && 'border-dg-green-500',
                      item.status === 'In Progress' && 'border-dg-amber-500',
                      item.status === 'Upcoming' && 'border-dg-blue-500'
                    )}
                  >
                    <div className={cn('w-2.5 h-2.5 rounded-full', styles.dot)} />
                  </motion.div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.activity}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.date}</p>
                      </div>
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
                        styles.badge
                      )}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
