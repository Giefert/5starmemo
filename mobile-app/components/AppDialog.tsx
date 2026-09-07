import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  findNodeHandle,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface DialogAction {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  busy?: boolean;
}

export interface DialogOptions {
  title: string;
  message?: string;
  primaryAction: DialogAction;
  secondaryAction?: DialogAction & { destructive?: boolean };
  layout?: 'stacked' | 'split';
  onDismiss?: () => void;
}

interface AppDialogProps extends DialogOptions {
  visible: boolean;
  dialogId?: number | string;
  onDismiss: () => void;
  children?: React.ReactNode;
  // A notice inside a form shares its native modal, avoiding competing iOS presentations.
  inline?: boolean;
  overlay?: React.ReactNode;
}

export function AppDialog({
  visible,
  dialogId,
  title,
  message,
  primaryAction,
  secondaryAction,
  layout = 'split',
  onDismiss,
  children,
  inline = false,
  overlay,
}: AppDialogProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const panelProgress = useRef(new Animated.Value(0)).current;
  const titleRef = useRef<Text>(null);
  const panelRef = useRef<View>(null);
  const actionTaken = useRef(false);
  const busy = !!(primaryAction.busy || secondaryAction?.busy);
  const split = layout === 'split' && !!secondaryAction;
  const hasOverlay = !!overlay;
  const wasCovered = useRef(hasOverlay);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // React Native Web does not forward inert; covered form controls must also
    // leave the keyboard tab order while a notice sits above them.
    const panel = panelRef.current as unknown as HTMLElement | null;
    if (panel) panel.inert = hasOverlay;
  }, [visible, hasOverlay]);

  useEffect(() => {
    const restoreFocus = wasCovered.current && !hasOverlay && visible;
    wasCovered.current = hasOverlay;
    if (!restoreFocus || Platform.OS === 'web') return;
    const frame = requestAnimationFrame(() => {
      const tag = findNodeHandle(titleRef.current);
      if (tag) AccessibilityInfo.setAccessibilityFocus(tag);
    });
    return () => cancelAnimationFrame(frame);
  }, [hasOverlay, visible]);

  useEffect(() => {
    actionTaken.current = false;
  }, [visible, dialogId, title, message, hasOverlay, primaryAction.busy, secondaryAction?.busy]);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    const focusTitle = () => {
      if (!active || Platform.OS === 'web') return;
      const tag = findNodeHandle(titleRef.current);
      if (tag) AccessibilityInfo.setAccessibilityFocus(tag);
    };
    scrimOpacity.setValue(0);
    panelProgress.setValue(0);
    void AccessibilityInfo.isReduceMotionEnabled().catch(() => true).then((reduceMotion) => {
      if (!active) return;
      Animated.parallel([
        Animated.timing(scrimOpacity, {
          toValue: 1,
          duration: reduceMotion ? 0 : 120,
          useNativeDriver: true,
        }),
        Animated.timing(panelProgress, {
          toValue: 1,
          duration: reduceMotion ? 0 : 160,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => { if (finished) focusTitle(); });
    });
    return () => {
      active = false;
      scrimOpacity.stopAnimation();
      panelProgress.stopAnimation();
    };
  }, [visible, dialogId, title, scrimOpacity, panelProgress]);

  const perform = (callback?: () => void, disabled = false) => {
    if (busy || disabled || actionTaken.current) return;
    actionTaken.current = true;
    callback?.();
  };

  const dismiss = () => {
    // Nested notices own their dismissal; the form's action latch must not swallow Back.
    if (hasOverlay) onDismiss();
    else perform(onDismiss);
  };

  const actionButton = (action: DialogAction & { destructive?: boolean }, primary: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(action.disabled || busy), busy: !!action.busy }}
      disabled={action.disabled || busy}
      onPress={() => perform(action.onPress, action.disabled)}
      style={({ pressed }) => [
        styles.button,
        primary && styles.primaryButton,
        split && styles.splitButton,
        pressed && styles.pressed,
        action.disabled && styles.disabled,
      ]}
    >
      {action.busy ? (
        <ActivityIndicator accessibilityLabel={action.label} color="#14120F" size="small" />
      ) : (
        <Text style={[
          styles.buttonText,
          primary ? styles.primaryText : action.destructive ? styles.destructiveText : styles.secondaryText,
        ]}>{action.label}</Text>
      )}
    </Pressable>
  );

  const content = visible ? (
    <View style={styles.fill}>
      <Animated.View pointerEvents="none" style={[styles.scrim, { opacity: scrimOpacity }]} />
      <Pressable
        style={styles.fill}
        accessible={false}
        importantForAccessibility="no"
        onPress={dismiss}
      />
      <View pointerEvents="box-none" style={[
        styles.positioner,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24,
          paddingLeft: insets.left + 24, paddingRight: insets.right + 24 },
      ]}>
        <Animated.View
          ref={panelRef}
          role="dialog"
          accessibilityLabel={title}
          accessibilityViewIsModal
          aria-hidden={hasOverlay}
          accessibilityElementsHidden={hasOverlay}
          importantForAccessibility={hasOverlay ? 'no-hide-descendants' : 'auto'}
          pointerEvents={hasOverlay ? 'none' : 'auto'}
          onAccessibilityEscape={dismiss}
          style={[
            styles.panel,
            { maxHeight: Math.max(0, height - insets.top - insets.bottom - 48),
              opacity: panelProgress,
              transform: [{ translateY: panelProgress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
          ]}
        >
          <ScrollView bounces={false} style={styles.copyScroll} contentContainerStyle={styles.copyContent}>
            <View style={styles.copy}>
              <Text ref={titleRef} accessible accessibilityRole="header" style={styles.title}>{title}</Text>
              {!!message && <Text style={styles.message}>{message}</Text>}
            </View>
            {children}
          </ScrollView>
          <View style={[styles.actions, split && styles.splitActions]}>
            {split && secondaryAction && actionButton(secondaryAction, false)}
            {actionButton(primaryAction, true)}
            {!split && secondaryAction && actionButton(secondaryAction, false)}
          </View>
        </Animated.View>
      </View>
      {overlay}
    </View>
  ) : null;

  if (inline) return content;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={dismiss}
    >
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,18,15,0.72)' },
  positioner: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  panel: { width: '100%', maxWidth: 300, borderRadius: 2, backgroundColor: '#F4EEE1', overflow: 'hidden' },
  copyScroll: { flexShrink: 1 },
  copyContent: { flexGrow: 0 },
  copy: { padding: 22, paddingBottom: 18 },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 18, lineHeight: 23, letterSpacing: -0.27, color: '#14120F', textAlign: 'center' },
  message: { marginTop: 6, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20.3, color: '#6B6255', textAlign: 'center' },
  actions: { paddingHorizontal: 14, paddingBottom: 14, gap: 4 },
  splitActions: { flexDirection: 'row', gap: 8 },
  button: { minHeight: 44, paddingHorizontal: 8, paddingVertical: 11, justifyContent: 'center', alignItems: 'center', borderRadius: 2 },
  splitButton: { flex: 1 },
  primaryButton: { backgroundColor: '#E89A2B' },
  buttonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  primaryText: { color: '#14120F' },
  secondaryText: { color: '#6B6255' },
  destructiveText: { color: '#D94B36' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
});
