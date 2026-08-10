import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const AdminSectionTabs = ({ tabs, activeTab, onTabChange, className }) => (
  <div className={cn('rounded-xl border bg-muted/40 p-1.5', className)}>
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTabChange(tab.value)}
            className={cn(
              'relative flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
              isActive
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:bg-background/70 hover:text-foreground',
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-transform duration-200',
                  isActive && 'scale-110',
                )}
              />
            )}
            <span className="truncate">{tab.label}</span>
            {tab.count != null && (
              <Badge
                variant={isActive ? 'secondary' : 'outline'}
                className="h-5 min-w-5 shrink-0 px-1.5 text-xs transition-colors duration-200"
              >
                {tab.count}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

export default AdminSectionTabs;
