import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  activityBackgroundTint,
  font,
  foregroundStyle,
  lineLimit,
  monospacedDigit,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

/**
 * Lock Screen and Dynamic Island countdown for a trial in its final hours.
 * Like the widget, the layout is serialised, so it only uses what is in its own body.
 */
export type TrialCountdownProps = {
  service: string;
  price: string | null;
  /** When the countdown started, in milliseconds. */
  startedAt: number;
  /** Start of the charge day, in milliseconds. */
  deadline: number;
};

function TrialCountdownActivity(props: TrialCountdownProps, environment: LiveActivityEnvironment) {
  'widget';
  const accent = '#FF6B3D';
  const ended = environment.isStale === true;
  const interval = { lower: new Date(props.startedAt), upper: new Date(props.deadline) };
  const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

  const timer = (size: number) =>
    ended ? (
      <Text modifiers={[font({ size, weight: 'bold' })]}>Charged</Text>
    ) : (
      <Text
        timerInterval={interval}
        countsDown
        modifiers={[font({ size, weight: 'bold', design: 'rounded' }), monospacedDigit(), foregroundStyle(accent)]}
      />
    );

  return {
    banner: (
      <HStack spacing={12} modifiers={[padding({ all: 16 }), activityBackgroundTint(null)]}>
        <Image systemName="hourglass" modifiers={[font({ size: 28 }), foregroundStyle(accent)]} />
        <VStack alignment="leading" spacing={2}>
          <Text modifiers={[font({ textStyle: 'headline' }), lineLimit(1)]}>{`Cancel ${props.service}`}</Text>
          <Text modifiers={[font({ textStyle: 'caption' }), secondary, lineLimit(1)]}>
            {props.price ? `${props.price} will be charged` : 'Your free trial is ending'}
          </Text>
        </VStack>
        <Spacer />
        {timer(26)}
      </HStack>
    ),
    compactLeading: <Image systemName="hourglass" modifiers={[foregroundStyle(accent)]} />,
    compactTrailing: timer(14),
    minimal: <Image systemName="hourglass" modifiers={[foregroundStyle(accent)]} />,
    expandedLeading: (
      <VStack alignment="leading" spacing={2}>
        <Image systemName="hourglass" modifiers={[font({ size: 22 }), foregroundStyle(accent)]} />
      </VStack>
    ),
    expandedCenter: (
      <Text modifiers={[font({ textStyle: 'headline' }), lineLimit(1)]}>{`Cancel ${props.service}`}</Text>
    ),
    expandedTrailing: timer(18),
    expandedBottom: (
      <Text modifiers={[font({ textStyle: 'caption' }), secondary, lineLimit(1)]}>
        {props.price ? `${props.price} if you keep it` : 'Free trial ending'}
      </Text>
    ),
  };
}

export const TrialCountdown = createLiveActivity<TrialCountdownProps>('TrialCountdown', TrialCountdownActivity);
