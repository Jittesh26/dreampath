import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ScholarshipCardProps {
  id: string;
  providerName: string;
  scholarshipName: string;
  status: string; // the database status e.g. 'open', 'draft', 'closed'
  openDate: string | null;
  closeDate: string | null;
}

export function ScholarshipCard({ id, providerName, scholarshipName, status, openDate, closeDate }: ScholarshipCardProps) {
  // Determine dynamic status
  let displayStatus = 'TBA';
  let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';

  if (status === 'closed') {
    displayStatus = 'CLOSED';
    badgeVariant = 'destructive';
  } else if (status === 'published') {
    const today = new Date();
    const open = openDate ? new Date(openDate) : null;
    const close = closeDate ? new Date(closeDate) : null;

    if (close && today > close) {
      displayStatus = 'CLOSED';
      badgeVariant = 'destructive';
    } else if (open && today < open) {
      displayStatus = 'TBA';
      badgeVariant = 'secondary';
    } else {
      displayStatus = 'OPEN';
      badgeVariant = 'default';
    }
  } else {
    // Draft, In Review, etc shouldn't be publicly visible usually, but just in case
    displayStatus = status.toUpperCase();
    badgeVariant = 'secondary';
  }

  const formattedCloseDate = closeDate 
    ? new Date(closeDate).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Not Specified';

  return (
    <Card className="flex flex-col hover:-translate-y-[2px] hover:shadow-lg transition-all duration-200 border-slate-100 bg-white">
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <div>
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{providerName}</CardDescription>
            <CardTitle className="font-instrument text-xl mt-1 text-primary leading-tight">{scholarshipName}</CardTitle>
          </div>
          <Badge variant={badgeVariant} className="font-bold tracking-wide">
            {displayStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="text-sm text-foreground/80">
          <strong>Deadline:</strong> {formattedCloseDate}
        </div>
      </CardContent>
      <CardFooter>
        <Link 
          href={`/scholarships/${id}`} 
          className="text-sm font-bold text-primary hover:underline underline-offset-4 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
          aria-label={`View eligibility requirements for ${scholarshipName}`}
        >
          View Requirements &rarr;
        </Link>
      </CardFooter>
    </Card>
  );
}
