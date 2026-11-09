import { AlertCard } from '@/components/alert-card';
import { Body, Card, Label, Screen, Small } from '@/components/ui';
import { sampleAlerts } from '@/data/sample-trip';

export default function AlertsScreen() {
  return (
    <Screen title="Alerts" subtitle="Official sources and news checked every 15 minutes">
      {sampleAlerts.map((a) => (
        <AlertCard key={a.id} alert={a} />
      ))}
      <Card>
        <Label>How alerts are labelled</Label>
        <Body>Confirmed means an official source, such as the police, a government or the airport operator, has said so.</Body>
        <Body>Unconfirmed means only news outlets have reported it so far. Its accuracy is not yet known.</Body>
        <Small>Social media is never counted. Several outlets repeating one agency story count as one source.</Small>
      </Card>
    </Screen>
  );
}
