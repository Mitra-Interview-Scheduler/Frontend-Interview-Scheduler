import PropTypes from 'prop-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { DashboardHint } from './DashboardHint';

/**
 * Titled section wrapper for dashboard widgets.
 */
export function DashboardSection({
  title,
  description,
  hint,
  icon: Icon,
  actions,
  children,
  className,
  contentClassName,
  noCard = false,
}) {
  const titleRow = (
    <div className="flex items-center gap-1.5 min-w-0">
      {Icon ? <Icon className="w-5 h-5 text-primary shrink-0" /> : null}
      <span className="truncate text-xl font-semibold">{title}</span>
      <DashboardHint text={hint} />
    </div>
  );

  if (noCard) {
    return (
      <section className={cn('space-y-3', className)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              {titleRow}
            </h2>
            {description ? (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2 flex-wrap">{actions}</div> : null}
        </div>
        {children}
      </section>
    );
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2">{titleRow}</CardTitle>
            {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
          </div>
          {actions ? <div className="flex items-center gap-2 flex-wrap">{actions}</div> : null}
        </div>
      </CardHeader>
      <CardContent className={cn(contentClassName)}>{children}</CardContent>
    </Card>
  );
}

DashboardSection.propTypes = {
  title: PropTypes.node.isRequired,
  description: PropTypes.node,
  hint: PropTypes.node,
  icon: PropTypes.elementType,
  actions: PropTypes.node,
  children: PropTypes.node,
  className: PropTypes.string,
  contentClassName: PropTypes.string,
  noCard: PropTypes.bool,
};

export default DashboardSection;
