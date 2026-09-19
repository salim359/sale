import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ApiError,
  getCatalog,
  getNotifications,
  getSales,
  getSelectedShops,
  markNotificationRead,
  removeShop,
  selectShops,
} from "../api/client";
import type { Notification, Sale, Shop } from "../api/types";
import { utcDateString } from "../lib/format";
import {
  authenticateAccount,
  confirmRegistration,
  registerAccount,
  resendRegistrationCode,
} from "../lib/auth";
import {
  readAlertsEnabled,
  readOnboarded,
  readProfile,
  readSaved,
  readTokens,
  saleToSaved,
  writeAlertsEnabled,
  writeOnboarded,
  writeProfile,
  writeSaved,
  writeTokens,
  type Profile,
  type SavedItem,
} from "../lib/storage";

interface ScoutState {
  catalog: Shop[];
  selected: Shop[];
  sales: Sale[];
  saved: SavedItem[];
  profile: Profile | null;
  onboarded: boolean;
  alertsEnabled: boolean;
  loading: boolean;
  error: string | null;
  notifications: Notification[];
  unreadCount: number;
  refresh: () => Promise<void>;
  follow: (shopId: string) => Promise<void>;
  unfollow: (shopId: string) => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  toggleSaved: (item: SavedItem) => void;
  isSaved: (id: string) => boolean;
  signup: (name: string, email: string, password: string) => Promise<{ confirmationRequired: boolean }>;
  confirmSignup: (email: string, code: string) => Promise<void>;
  resendSignupCode: (email: string) => Promise<void>;
  login: (email: string, password: string, options?: { completeOnboarding?: boolean }) => Promise<void>;
  completeOnboarding: (profile?: Profile) => void;
  logout: () => void;
  setAlertsEnabled: (value: boolean) => void;
}

const ScoutContext = createContext<ScoutState | null>(null);

export function featuredItems(sales: Sale[]): SavedItem[] {
  return sales.map((sale) => saleToSaved(sale));
}

export function ScoutProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Shop[]>([]);
  const [selected, setSelected] = useState<Shop[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [saved, setSaved] = useState<SavedItem[]>(readSaved);
  const [profile, setProfile] = useState<Profile | null>(readProfile);
  const [onboarded, setOnboarded] = useState(readOnboarded);
  const [alertsEnabled, setAlerts] = useState(readAlertsEnabled);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogRes, selectedRes, salesRes, notificationsRes] = await Promise.all([
        getCatalog(),
        getSelectedShops(),
        getSales(utcDateString()),
        getNotifications().catch(() => ({
          count: 0,
          unreadCount: 0,
          notifications: [] as Notification[],
        })),
      ]);
      setCatalog(catalogRes.shops);
      setSelected(selectedRes.shops);
      const followedIds = new Set(selectedRes.shops.map((shop) => shop.shopId));
      setSales(salesRes.sales.filter((sale) => followedIds.has(sale.shopId)));
      setNotifications(
        notificationsRes.notifications.filter((item) => followedIds.has(item.shopId)),
      );
      setSaved((current) => current.filter((item) => followedIds.has(item.shopId)));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        writeTokens(null);
        setOnboarded(false);
        writeOnboarded(false);
      }
      setError(err instanceof Error ? err.message : "Could not load sale");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!readTokens()?.idToken) {
      if (readOnboarded()) {
        writeOnboarded(false);
        setOnboarded(false);
      }
      setLoading(false);
      return;
    }
    void refresh();
  }, [refresh]);

  useEffect(() => {
    writeSaved(saved);
  }, [saved]);

  const follow = useCallback(
    async (shopId: string) => {
      await selectShops([shopId]);
      await refresh();
    },
    [refresh],
  );

  const unfollow = useCallback(
    async (shopId: string) => {
      await removeShop(shopId);
      setSaved((current) => current.filter((item) => item.shopId !== shopId));
      setSales((current) => current.filter((sale) => sale.shopId !== shopId));
      setNotifications((current) =>
        current.filter((item) => item.shopId !== shopId),
      );
      setSelected((current) => current.filter((shop) => shop.shopId !== shopId));
      setCatalog((current) =>
        current.map((shop) =>
          shop.shopId === shopId ? { ...shop, selected: false } : shop,
        ),
      );
      await refresh();
    },
    [refresh],
  );

  const toggleSaved = useCallback((item: SavedItem) => {
    setSaved((current) => {
      if (current.some((entry) => entry.id === item.id)) {
        return current.filter((entry) => entry.id !== item.id);
      }
      return [item, ...current];
    });
  }, []);

  const isSaved = useCallback(
    (id: string) => saved.some((item) => item.id === id),
    [saved],
  );

  const completeOnboarding = useCallback(
    (nextProfile?: Profile) => {
      const resolved = nextProfile ?? profile;
      if (!resolved) return;
      setProfile(resolved);
      writeProfile(resolved);
      setOnboarded(true);
      writeOnboarded(true);
    },
    [profile],
  );

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const result = await registerAccount(name, email, password);
    setProfile(result.profile);
    writeProfile(result.profile);
    setOnboarded(false);
    writeOnboarded(false);
    return { confirmationRequired: result.confirmationRequired };
  }, []);

  const confirmSignup = useCallback(async (email: string, code: string) => {
    await confirmRegistration(email, code);
  }, []);

  const resendSignupCode = useCallback(async (email: string) => {
    await resendRegistrationCode(email);
  }, []);

  const login = useCallback(async (
    email: string,
    password: string,
    options?: { completeOnboarding?: boolean },
  ) => {
    const nextProfile = await authenticateAccount(email, password);
    setProfile(nextProfile);
    writeProfile(nextProfile);
    const done = options?.completeOnboarding ?? true;
    setOnboarded(done);
    writeOnboarded(done);
    await refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    setOnboarded(false);
    setProfile(null);
    writeOnboarded(false);
    writeProfile(null);
    writeTokens(null);
    setCatalog([]);
    setSelected([]);
    setSales([]);
    setNotifications([]);
  }, []);

  const setAlertsEnabled = useCallback((value: boolean) => {
    setAlerts(value);
    writeAlertsEnabled(value);
  }, []);

  const markRead = useCallback(async (notificationId: string) => {
    const result = await markNotificationRead(notificationId);
    setNotifications((current) =>
      current.map((item) =>
        item.notificationId === result.notification.notificationId
          ? result.notification
          : item,
      ),
    );
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  );

  const value = useMemo<ScoutState>(
    () => ({
      catalog,
      selected,
      sales,
      saved,
      profile,
      onboarded,
      alertsEnabled,
      loading,
      error,
      notifications,
      unreadCount,
      refresh,
      follow,
      unfollow,
      markRead,
      toggleSaved,
      isSaved,
      signup,
      confirmSignup,
      resendSignupCode,
      login,
      completeOnboarding,
      logout,
      setAlertsEnabled,
    }),
    [
      catalog,
      selected,
      sales,
      saved,
      profile,
      onboarded,
      alertsEnabled,
      loading,
      error,
      notifications,
      unreadCount,
      refresh,
      follow,
      unfollow,
      markRead,
      toggleSaved,
      isSaved,
      signup,
      confirmSignup,
      resendSignupCode,
      login,
      completeOnboarding,
      logout,
      setAlertsEnabled,
    ],
  );

  return <ScoutContext.Provider value={value}>{children}</ScoutContext.Provider>;
}

export function useScout(): ScoutState {
  const value = useContext(ScoutContext);
  if (!value) throw new Error("useScout must be used within ScoutProvider");
  return value;
}
