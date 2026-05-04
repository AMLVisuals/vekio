// =============================================================================
// DualGauge — anneaux concentriques calories (ext) + hydratation (int)
// =============================================================================
// Visuel hero du Dashboard.
//   - Anneau exterieur : calories, sens horaire, couleur dynamique selon ratio
//   - Anneau interieur : hydratation, sens visuel inverse via mirror horizontal
//   - Label central : kcal courantes / cible et kcal restantes
//
// Le sens "anti-horaire" est obtenu via scale(-1, 1) qui mirroire l'anneau
// interieur ; visuellement le remplissage part de droite vers gauche tandis
// que l'exterieur va de gauche vers droite. Effet yin/yang subtil.

import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { palette, colors as tokens, spacing } from '../theme/tokens';

interface DualGaugeProps {
  caloriesCurrent: number;
  caloriesTarget: number;
  caloriesColor: string;
  waterCurrent: number;
  waterTarget: number;
  size?: number;
}

export default function DualGauge({
  caloriesCurrent,
  caloriesTarget,
  caloriesColor,
  waterCurrent,
  waterTarget,
  size = 220,
}: DualGaugeProps) {
  const center = size / 2;

  // Anneau exterieur calories
  const outerStroke = 16;
  const outerRadius = (size - outerStroke) / 2;
  const outerCircumference = 2 * Math.PI * outerRadius;
  const calProgress = Math.min(caloriesCurrent / Math.max(1, caloriesTarget), 1);
  const outerOffset = outerCircumference * (1 - calProgress);

  // Anneau interieur hydratation — gap de 10px depuis l'exterieur
  const gap = 10;
  const innerStroke = 12;
  const innerRadius = outerRadius - outerStroke / 2 - gap - innerStroke / 2;
  const innerCircumference = 2 * Math.PI * innerRadius;
  const waterProgress = Math.min(waterCurrent / Math.max(1, waterTarget), 1);
  const innerOffset = innerCircumference * (1 - waterProgress);

  const remaining = Math.max(caloriesTarget - Math.round(caloriesCurrent), 0);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Anneau exterieur calories — fond + progression */}
        <Circle
          cx={center}
          cy={center}
          r={outerRadius}
          stroke={palette.neutral200}
          strokeWidth={outerStroke}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={outerRadius}
          stroke={caloriesColor}
          strokeWidth={outerStroke}
          fill="none"
          strokeDasharray={`${outerCircumference}`}
          strokeDashoffset={outerOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />

        {/* Anneau interieur hydratation — fond + progression (mirroir horizontal) */}
        <Circle
          cx={center}
          cy={center}
          r={innerRadius}
          stroke={palette.neutral100}
          strokeWidth={innerStroke}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={innerRadius}
          stroke={tokens.water}
          strokeWidth={innerStroke}
          fill="none"
          strokeDasharray={`${innerCircumference}`}
          strokeDashoffset={innerOffset}
          strokeLinecap="round"
          transform={`scale(-1 1) translate(-${size} 0) rotate(-90 ${center} ${center})`}
        />
      </Svg>

      {/* Label central */}
      <View style={styles.center}>
        <Text style={styles.calNumber}>{Math.round(caloriesCurrent)}</Text>
        <Text style={styles.calTarget}>/ {caloriesTarget} kcal</Text>
        <Text style={[styles.calRemaining, { color: caloriesColor }]}>
          {remaining > 0 ? `${remaining} restantes` : 'Objectif atteint'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calNumber: {
    fontFamily: 'Inter_700Bold',
    fontSize: 36,
    color: tokens.text,
    lineHeight: 40,
  },
  calTarget: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: tokens.textMuted,
    marginTop: 2,
  },
  calRemaining: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    marginTop: spacing.xs,
  },
});
