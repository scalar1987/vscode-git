import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { AnimatedCounter, CurrencyCounter } from '@/components/ui/AnimatedCounter';

interface BudgetOverviewProps {
  totalBudget: number;
  spent: number;
  className?: string;
}

export function BudgetOverview({ totalBudget, spent, className }: BudgetOverviewProps) {
  const remaining = totalBudget - spent;
  const spentPercentage = Math.round((spent / totalBudget) * 100);

  const chartData = [
    { name: 'Spent', value: spent, color: '#2E7D32' },
    { name: 'Remaining', value: remaining, color: '#E5E7EB' },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Budget Utilization</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Donut Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative w-32 h-32 md:w-36 md:h-36"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="65%"
                  outerRadius="100%"
                  paddingAngle={2}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  animationBegin={300}
                  animationDuration={800}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <AnimatedCounter
                value={spentPercentage}
                suffix="%"
                className="text-2xl font-bold text-gray-900"
                duration={1.5}
                delay={0.5}
              />
              <span className="text-xs text-gray-500">Spent</span>
            </div>
          </motion.div>

          {/* Budget Details */}
          <div className="flex-1 space-y-3">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex justify-between items-center py-2 border-b border-gray-100"
            >
              <span className="text-sm text-gray-500">Total Budget</span>
              <CurrencyCounter
                value={totalBudget}
                className="text-sm font-semibold text-gray-900"
                duration={1.5}
                delay={0.4}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex justify-between items-center py-2 border-b border-gray-100"
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-dg-green-600" />
                <span className="text-sm text-gray-500">Spent</span>
              </div>
              <CurrencyCounter
                value={spent}
                className="text-sm font-semibold text-dg-green-600"
                duration={1.5}
                delay={0.5}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="flex justify-between items-center py-2"
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gray-200" />
                <span className="text-sm text-gray-500">Remaining</span>
              </div>
              <CurrencyCounter
                value={remaining}
                className="text-sm font-semibold text-gray-700"
                duration={1.5}
                delay={0.6}
              />
            </motion.div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
