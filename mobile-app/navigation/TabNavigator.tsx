import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import BulletinScreen from '../screens/BulletinScreen';
import { HomeScreen } from '../screens/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const COLORS = {
  paper: '#F4EEE1',
  inkMute: '#6B6255',
  amber: '#E89A2B',
};

// Line glyphs ported verbatim from the Bulletin Tab Bar handoff reference
// (viewBox 0 0 20 20, stroke 1.4). Swapping in an icon set would change the
// weight and idiom and break the Carte feel — don't.
type IconProps = { color: string };

function BulletinIcon({ color }: IconProps) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path d="M3 4h11v12H3z" stroke={color} strokeWidth={1.4} />
      <Path d="M14 7h3v8a1 1 0 0 1-1 1H3" stroke={color} strokeWidth={1.4} />
      <Path
        d="M5.5 7h6M5.5 9.5h6M5.5 12h4"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function StudyIcon({ color }: IconProps) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M3 4.5c2.5-1 5.5-1 7 .5v11c-1.5-1.5-4.5-1.5-7-.5z"
        stroke={color}
        strokeWidth={1.4}
      />
      <Path
        d="M17 4.5c-2.5-1-5.5-1-7 .5v11c1.5-1.5 4.5-1.5 7-.5z"
        stroke={color}
        strokeWidth={1.4}
      />
    </Svg>
  );
}

function LibraryIcon({ color }: IconProps) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M6 5.5h11M6 10h11M6 14.5h11"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <Circle cx={3.5} cy={5.5} r={0.7} fill={color} />
      <Circle cx={3.5} cy={10} r={0.7} fill={color} />
      <Circle cx={3.5} cy={14.5} r={0.7} fill={color} />
    </Svg>
  );
}

function SettingsIcon({ color }: IconProps) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Circle cx={10} cy={10} r={2.4} stroke={color} strokeWidth={1.4} />
      <Path
        d="M10 2.5v2.2M10 15.3v2.2M2.5 10h2.2M15.3 10h2.2M4.7 4.7l1.6 1.6M13.7 13.7l1.6 1.6M4.7 15.3l1.6-1.6M13.7 6.3l1.6-1.6"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const TAB_ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
  Bulletin: BulletinIcon,
  Study: StudyIcon,
  Library: LibraryIcon,
  Settings: SettingsIcon,
};

// Variant B — paper ground, no top rule, no shadow. The bar reads as the last
// row of the page; the only navigation signal is the active tab's amber
// marker, mirroring the masthead nav's amber underline.
function CarteTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // Bulletin/Study hide the bar during study sessions by setting
  // `tabBarStyle: { display: 'none' }` via setOptions on the focused route.
  const focusedKey = state.routes[state.index].key;
  const focusedTabBarStyle = descriptors[focusedKey].options.tabBarStyle as
    | { display?: string }
    | undefined;
  if (focusedTabBarStyle?.display === 'none') {
    return null;
  }

  return (
    <View style={[styles.bar, { paddingBottom: 22 + insets.bottom }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const color = focused ? COLORS.amber : COLORS.inkMute;
        const Icon = TAB_ICONS[route.name];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? route.name}
            onPress={onPress}
            activeOpacity={0.7}
            style={styles.tab}
          >
            {/* Active marker — always rendered so the icon never shifts. */}
            <View style={[styles.marker, focused && styles.markerActive]} />
            {Icon ? <Icon color={color} /> : null}
            <Text style={[styles.label, { color }]}>{route.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CarteTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="Bulletin"
        component={BulletinScreen}
        options={{ tabBarAccessibilityLabel: 'Bulletin' }}
      />
      <Tab.Screen
        name="Study"
        component={HomeScreen}
        options={{ tabBarAccessibilityLabel: 'Study' }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{ tabBarAccessibilityLabel: 'Library' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarAccessibilityLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.paper,
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    paddingTop: 10,
    paddingHorizontal: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 8,
    gap: 5,
  },
  marker: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -9,
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'transparent',
  },
  markerActive: {
    backgroundColor: COLORS.amber,
  },
  label: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
