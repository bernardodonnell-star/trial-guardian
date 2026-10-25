import { Button, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  containerBackground,
  controlSize,
  font,
  foregroundStyle,
  labelStyle,
  lineLimit,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

/**
 * Home Screen and Lock Screen widget listing the next trials to cancel.
 * The layout function is serialised and run inside the widget, so it must not use anything
 * from outside its own body except the Expo UI components imported above.
 */
export type UpcomingTrialsProps = {
  trials: {
    id: string;
    service: string;
    /** The moment to cancel before (start of the charge day, a day earlier for App Store), in ms. */
    deadline: number;
    price: string | null;
  }[];
  /**
   * Trials ticked off with the widget's button, by id, with the time of the tap. The widget runs
   * outside the app, so it records the tap here and the app applies it the next time it opens.
   */
  cancelled?: Record<string, number>;
};

function UpcomingTrialsWidget(props: UpcomingTrialsProps, environment: WidgetEnvironment) {
  'widget';
  const now = environment.date ?? new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const ticked = props.cancelled ?? {};
  const upcoming = (props.trials ?? []).filter((t) => t.deadline > now.getTime() && !ticked[t.id]);
  const next = upcoming[0];
  const family = environment.widgetFamily ?? 'systemSmall';
  const accent = '#FF6B3D';

  // Days left to cancel, counting today: 1 means today is the last day.
  const daysLeft = (deadline: number) => Math.max(1, Math.round((deadline - today) / dayMs));
  const shortDate = (deadline: number) =>
    new Date(deadline).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const lastDayLabel = (deadline: number) => {
    const days = daysLeft(deadline);
    if (days <= 1) return 'Last day';
    return `${days} days left`;
  };
  const background = containerBackground({ type: 'hierarchical', style: 'quinary' }, 'widget');
  // Returning props from onPress updates this widget entry straight away.
  const markCancelled = (id: string) => () => ({ cancelled: { ...ticked, [id]: Date.now() } });

  if (!next) {
    if (family === 'accessoryInline') return <Text>No trials to cancel</Text>;
    if (family === 'accessoryCircular' || family === 'accessoryRectangular') {
      return (
        <VStack modifiers={[background]}>
          <Text modifiers={[font({ textStyle: 'headline' })]}>All clear</Text>
        </VStack>
      );
    }
    return (
      <VStack alignment="leading" spacing={4} modifiers={[background, widgetURL('trialguardian://')]}>
        <Text modifiers={[font({ textStyle: 'headline' })]}>No trials</Text>
        <Text modifiers={[font({ textStyle: 'caption' }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
          Share a sign-up email or screenshot to Trial Guardian.
        </Text>
      </VStack>
    );
  }

  if (family === 'accessoryInline') {
    return <Text>{`${next.service}: ${lastDayLabel(next.deadline).toLowerCase()}`}</Text>;
  }

  if (family === 'accessoryCircular') {
    const days = daysLeft(next.deadline);
    return (
      <VStack spacing={0} modifiers={[background]}>
        <Text modifiers={[font({ size: 22, weight: 'bold', design: 'rounded' })]}>{String(days)}</Text>
        <Text modifiers={[font({ size: 9, weight: 'semibold' }), lineLimit(1)]}>{days === 1 ? 'DAY' : 'DAYS'}</Text>
      </VStack>
    );
  }

  if (family === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={1} modifiers={[background, widgetURL(`trialguardian://trial/${next.id}`)]}>
        <Text modifiers={[font({ textStyle: 'headline' }), lineLimit(1)]}>{next.service}</Text>
        <Text modifiers={[font({ textStyle: 'caption' }), lineLimit(1)]}>{`Cancel before ${shortDate(next.deadline)}`}</Text>
        <Text modifiers={[font({ textStyle: 'caption', weight: 'semibold' }), lineLimit(1)]}>
          {lastDayLabel(next.deadline)}
        </Text>
      </VStack>
    );
  }

  if (family === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={4} modifiers={[background, widgetURL(`trialguardian://trial/${next.id}`)]}>
        <Text modifiers={[font({ textStyle: 'caption', weight: 'semibold' }), foregroundStyle(accent)]}>NEXT TO CANCEL</Text>
        <Text modifiers={[font({ textStyle: 'title3', weight: 'bold' }), lineLimit(2)]}>{next.service}</Text>
        <Spacer />
        <Text modifiers={[font({ size: 28, weight: 'bold', design: 'rounded' }), lineLimit(1)]}>
          {lastDayLabel(next.deadline)}
        </Text>
        <HStack spacing={4}>
          <Text modifiers={[font({ textStyle: 'caption' }), foregroundStyle({ type: 'hierarchical', style: 'secondary' }), lineLimit(1)]}>
            {`By ${shortDate(next.deadline)}`}
          </Text>
          <Spacer />
          <Button
            target={`cancelled-${next.id}`}
            onPress={markCancelled(next.id)}
            label="I cancelled it"
            systemImage="checkmark.circle.fill"
            modifiers={[labelStyle('iconOnly'), buttonStyle('plain'), font({ size: 22 }), foregroundStyle(accent)]}
          />
        </HStack>
      </VStack>
    );
  }

  const rows = upcoming.slice(0, family === 'systemMedium' ? 3 : 6);
  return (
    <VStack alignment="leading" spacing={8} modifiers={[background, widgetURL('trialguardian://')]}>
      <HStack>
        <Text modifiers={[font({ textStyle: 'caption', weight: 'semibold' }), foregroundStyle(accent)]}>TRIALS ENDING</Text>
        <Spacer />
        <Text modifiers={[font({ textStyle: 'caption' }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>
          {`${upcoming.length} active`}
        </Text>
      </HStack>
      {rows.map((trial) => (
        <HStack key={trial.id} spacing={8}>
          <VStack alignment="leading" spacing={0}>
            <Text modifiers={[font({ textStyle: 'subheadline', weight: 'semibold' }), lineLimit(1)]}>{trial.service}</Text>
            <Text modifiers={[font({ textStyle: 'caption2' }), foregroundStyle({ type: 'hierarchical', style: 'secondary' }), lineLimit(1)]}>
              {trial.price ? `${trial.price} · before ${shortDate(trial.deadline)}` : `Before ${shortDate(trial.deadline)}`}
            </Text>
          </VStack>
          <Spacer />
          <Text
            modifiers={[
              font({ textStyle: 'subheadline', weight: 'bold', design: 'rounded' }),
              foregroundStyle(daysLeft(trial.deadline) <= 1 ? accent : { type: 'hierarchical', style: 'primary' }),
            ]}>
            {lastDayLabel(trial.deadline)}
          </Text>
          <Button
            target={`cancelled-${trial.id}`}
            onPress={markCancelled(trial.id)}
            label={`I cancelled ${trial.service}`}
            systemImage="checkmark.circle"
            modifiers={[labelStyle('iconOnly'), buttonStyle('plain'), controlSize('large'), tint(accent), foregroundStyle(accent)]}
          />
        </HStack>
      ))}
      <Spacer />
    </VStack>
  );
}

export const UpcomingTrials = createWidget<UpcomingTrialsProps>('UpcomingTrials', UpcomingTrialsWidget, {
  trials: [],
});
