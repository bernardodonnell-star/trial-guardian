import { View } from 'react-native';

import { Badge, Body, Card, Heading, Label, Row, Small } from '@/components/ui';
import { type Tone } from '@/constants/theme';
import { confirmationLabel } from '@/lib/confirmation';
import { localDateTime, localTime } from '@/lib/format';
import { OUTLET_KIND_LABEL } from '@/lib/sources';
import type { Alert, Severity } from '@/lib/types';

const SEVERITY_TONE: Record<Severity, Tone> = {
  info: 'ok',
  advisory: 'advisory',
  warning: 'warning',
  critical: 'critical',
};

export function AlertCard({ alert }: { alert: Alert }) {
  const c = alert.confirmation;
  const unconfirmed = c.status === 'unconfirmed';
  return (
    <Card tone={unconfirmed ? undefined : SEVERITY_TONE[alert.severity]}>
      <Row>
        <Badge tone={SEVERITY_TONE[alert.severity]}>{alert.severity}</Badge>
        <Small>Updated {localTime(alert.updatedAt)}</Small>
      </Row>
      {unconfirmed ? (
        <Badge tone="unconfirmed" dashed>
          Unconfirmed · news reports only
        </Badge>
      ) : null}
      <Heading>{alert.title}</Heading>
      <Body>Why you: {alert.why}</Body>
      {unconfirmed ? (
        <Body style={{ fontWeight: '600' }}>
          Accuracy not yet known. No police or government statement yet. Early reports can be incomplete or wrong.
        </Body>
      ) : null}
      {alert.advice ? <Body>{alert.advice}</Body> : null}

      {c.status === 'unconfirmed' ? (
        <View style={{ gap: 6, marginTop: 4 }}>
          <Label>
            {c.outlets.length === 0
              ? 'No reports yet'
              : `Reported by ${c.outlets.length} independent outlet${c.outlets.length === 1 ? '' : 's'}`}
          </Label>
          {c.outlets.map((o) => (
            <Row key={o.source.id} style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Body style={{ fontWeight: '600' }}>{o.source.name}</Body>
                <Small>
                  {OUTLET_KIND_LABEL[o.source.kind]}
                  {o.repeatedBy.length ? ` · also carried by ${o.repeatedBy.map((s) => s.name).join(', ')}` : ''}
                </Small>
              </View>
              <Small>{localTime(o.lastUpdate)}</Small>
            </Row>
          ))}
          <Small>
            Social media posts are not counted.
            {c.awaiting.length ? ` Waiting for: ${c.awaiting.map((s) => s.name).join(', ')}.` : ''}
          </Small>
        </View>
      ) : (
        <Small>
          {confirmationLabel(c)} · {localDateTime(alert.updatedAt)}
        </Small>
      )}
    </Card>
  );
}
