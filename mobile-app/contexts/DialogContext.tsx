import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Keyboard, View } from 'react-native';
import { AppDialog, DialogOptions } from '../components/AppDialog';

const DialogContext = createContext<((dialog: DialogOptions) => void) | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogs, setDialogs] = useState<Array<DialogOptions & { id: number }>>([]);
  const sequence = useRef(0);
  const handled = useRef<number | null>(null);
  const showDialog = useCallback((dialog: DialogOptions) => {
    Keyboard.dismiss();
    const id = ++sequence.current;
    setDialogs((current) => [...current, { ...dialog, id }]);
  }, []);
  const dialog = dialogs[0];

  const finish = (callback?: () => void) => {
    if (!dialog || handled.current === dialog.id) return;
    handled.current = dialog.id;
    setDialogs((current) => current.filter((item) => item.id !== dialog.id));
    callback?.();
  };

  return (
    <DialogContext.Provider value={showDialog}>
      <View style={{ flex: 1 }} aria-hidden={!!dialog} accessibilityElementsHidden={!!dialog} importantForAccessibility={dialog ? 'no-hide-descendants' : 'auto'}>
        {children}
      </View>
      <AppDialog
        visible={!!dialog}
        dialogId={dialog?.id}
        title={dialog?.title ?? ''}
        message={dialog?.message}
        layout={dialog?.layout}
        primaryAction={{ ...dialog?.primaryAction, label: dialog?.primaryAction.label ?? 'OK', onPress: () => finish(dialog?.primaryAction.onPress) }}
        secondaryAction={dialog?.secondaryAction ? { ...dialog.secondaryAction, onPress: () => finish(dialog.secondaryAction?.onPress) } : undefined}
        onDismiss={() => finish(dialog?.onDismiss ?? (
          dialog?.secondaryAction && !dialog.secondaryAction.destructive
            ? dialog.secondaryAction.onPress
            : dialog?.primaryAction.onPress
        ))}
      />
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const showDialog = useContext(DialogContext);
  if (!showDialog) throw new Error('useDialog must be used within DialogProvider');
  return showDialog;
}
