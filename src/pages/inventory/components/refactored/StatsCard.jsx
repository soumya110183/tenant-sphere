import { Card, CardContent } from "@/components/ui/card";

export const StatsCard = ({ stat }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <div className={`text-2xl font-bold ${stat.color || 'text-foreground'}`}>
            {stat.value}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
        </div>
        <stat.icon className={`h-8 w-8 ${stat.color || 'text-muted-foreground'}`} />
      </div>
    </CardContent>
  </Card>
);