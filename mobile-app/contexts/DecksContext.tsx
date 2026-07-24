import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { InteractionManager } from 'react-native';
import { StudentDeck } from '../types/shared';
import apiService from '../services/api';
import { useAuth } from './AuthContext';

interface DecksContextValue {
  decks: StudentDeck[];
  isLoading: boolean;
  loadDecks: (force?: boolean) => Promise<StudentDeck[]>;
  invalidateDecks: () => void;
}

const DecksContext = createContext<DecksContextValue | undefined>(undefined);

export function useDecks() {
  const context = useContext(DecksContext);
  if (!context) {
    throw new Error('useDecks must be used within a DecksProvider');
  }
  return context;
}

export function DecksProvider({ children }: { children: ReactNode }) {
  const { user, restaurant } = useAuth();
  const identity = user && restaurant ? `${user.id}:${restaurant.id}` : null;
  const identityRef = useRef(identity);
  const requestRef = useRef<{
    identity: string;
    promise: Promise<StudentDeck[]>;
  } | null>(null);
  const requestedVersionRef = useRef(0);
  const dataVersionRef = useRef(-1);
  const dataIdentityRef = useRef<string | null>(null);
  const [decks, setDecks] = useState<StudentDeck[]>([]);
  const decksRef = useRef<StudentDeck[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    identityRef.current = identity;
    requestRef.current = null;
    requestedVersionRef.current++;
    dataVersionRef.current = -1;
    dataIdentityRef.current = null;
    decksRef.current = [];
    setDecks([]);
    setIsLoading(false);
  }, [identity]);

  const loadDecks = useCallback(
    async (force = false): Promise<StudentDeck[]> => {
      if (!identity) return [];

      // A child can request data before this provider's identity-change effect
      // runs. Reset refs synchronously so data from the previous account or
      // restaurant can never satisfy that request.
      if (identityRef.current !== identity) {
        identityRef.current = identity;
        requestRef.current = null;
        requestedVersionRef.current++;
        dataVersionRef.current = -1;
        dataIdentityRef.current = null;
        decksRef.current = [];
      }

      if (force) requestedVersionRef.current++;
      const requestedVersion = requestedVersionRef.current;
      const inFlight = requestRef.current;
      if (inFlight?.identity === identity) {
        if (!force) return inFlight.promise;
        return inFlight.promise.then(() => (
          identityRef.current === identity ? loadDecks() : []
        ));
      }
      if (
        !force
        && dataIdentityRef.current === identity
        && dataVersionRef.current === requestedVersion
      ) {
        return decksRef.current;
      }

      if (decksRef.current.length === 0) setIsLoading(true);

      const promise = apiService.getAvailableDecks()
        .then((nextDecks) => {
          if (identityRef.current === identity) {
            dataIdentityRef.current = identity;
            dataVersionRef.current = requestedVersion;
            decksRef.current = nextDecks;
            setDecks(nextDecks);
          }
          return nextDecks;
        })
        .finally(() => {
          if (requestRef.current?.promise === promise) {
            requestRef.current = null;
          }
          if (identityRef.current === identity) {
            setIsLoading(false);
          }
        });

      requestRef.current = { identity, promise };
      return promise;
    },
    [identity],
  );

  const invalidateDecks = useCallback(() => {
    requestedVersionRef.current++;
  }, []);

  // Warm the shared deck payload after the first screen's initial interaction.
  // Home, Library Browse, and Settings then reuse the same in-flight request and
  // state rather than each presenting a first-visit loading screen.
  useEffect(() => {
    if (!identity) return;
    const task = InteractionManager.runAfterInteractions(() => {
      loadDecks().catch(() => {
        // Consumers surface actionable errors when they need the data.
      });
    });
    return () => task.cancel();
  }, [identity, loadDecks]);

  const visibleDecks = dataIdentityRef.current === identity ? decks : [];
  const value = useMemo(
    () => ({
      decks: visibleDecks,
      isLoading,
      loadDecks,
      invalidateDecks,
    }),
    [visibleDecks, isLoading, loadDecks, invalidateDecks],
  );

  return (
    <DecksContext.Provider value={value}>
      {children}
    </DecksContext.Provider>
  );
}
