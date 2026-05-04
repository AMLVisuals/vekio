// =============================================================================
// Icones de la tab bar Vekio
// =============================================================================
// Style outline (stroke 2) inspire de Lucide. Couleur dynamique selon focus.
// 5 icones : home / journal / stats / menus / profil.

import { View } from 'react-native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

export type TabIconName = 'home' | 'journal' | 'stats' | 'menus' | 'profil';

interface TabIconProps {
  name: TabIconName;
  color: string;
  focused: boolean;
  size?: number;
}

export default function TabIcon({ name, color, focused, size = 24 }: TabIconProps) {
  const strokeWidth = focused ? 2.4 : 2;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {name === 'home' && (
          <>
            <Path
              d="M3 11.5L12 4l9 7.5"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {name === 'journal' && (
          <>
            <Rect
              x="5" y="3" width="14" height="18" rx="2.5"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
            />
            <Line x1="9" y1="8.5" x2="15" y2="8.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
            <Line x1="9" y1="12" x2="15" y2="12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
            <Line x1="9" y1="15.5" x2="13" y2="15.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          </>
        )}

        {name === 'stats' && (
          <>
            <Line x1="6" y1="20" x2="6" y2="14"   stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
            <Line x1="12" y1="20" x2="12" y2="9"  stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
            <Line x1="18" y1="20" x2="18" y2="11" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          </>
        )}

        {name === 'menus' && (
          <>
            {/* Assiette : cercle exterieur + cercle interieur */}
            <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={strokeWidth} />
            <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth={strokeWidth} />
          </>
        )}

        {name === 'profil' && (
          <>
            <Circle cx="12" cy="8.5" r="3.5" stroke={color} strokeWidth={strokeWidth} />
            <Path
              d="M5 20c1.4-3.5 4-5.5 7-5.5s5.6 2 7 5.5"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          </>
        )}
      </Svg>

      {/* Indicateur sous l'icone — petit point qui apparait quand focused */}
      {focused && (
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: color,
            marginTop: 4,
          }}
        />
      )}
    </View>
  );
}
