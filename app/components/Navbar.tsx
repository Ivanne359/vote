"use client";

import Image from 'next/image';
import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  LogOut,
  ChevronDown,
  Settings,
  UserCircle,
  Bell,
  X,
  ShieldCheck,
  Camera,
  Mail,
  Moon,
  Globe,
  Lock,
  Trash2,
  Smartphone,
  CalendarClock,
  Clock3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, storage } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  subscribeElectionSettings,
  subscribeSystemNotifications,
  type ElectionSettings,
  type SystemNotification,
} from '@/lib/adminRealtime';

type LiveNotification = {
  id: string;
  title: string;
  description: string;
  kind: 'election';
  actionHref?: string;
  actionLabel?: string;
};

const READ_NOTIFICATIONS_KEY = 'cetvote_read_notifications';
const DISMISSED_NOTIFICATIONS_KEY = 'cetvote_dismissed_notifications';
const LAST_TOAST_NOTIFICATION_ID = 'cetvote_last_toast_notification_id';

export default function Navbar() {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<LiveNotification | null>(null);
  const [toastCountdown, setToastCountdown] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [voterId, setVoterId] = useState('00000000');
  const [voterName, setVoterName] = useState('Guest Voter');
  const [voterEmail, setVoterEmail] = useState('');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [userDocId, setUserDocId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [localNotifications, setLocalNotifications] = useState<LiveNotification[]>([]);
  const [electionSettings, setElectionSettings] = useState<ElectionSettings | null>(null);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const previousToastIdsRef = useRef<string[]>([]);

  useEffect(() => {
    const savedId = localStorage.getItem('voterId');
    const savedName = localStorage.getItem('voterName');
    const savedEmail = localStorage.getItem('voterEmail');
    const savedPic = localStorage.getItem('voterPic');

    if (savedId) setVoterId(savedId);
    if (savedName) setVoterName(savedName);
    if (savedEmail) setVoterEmail(savedEmail);
    if (savedPic) setProfilePic(savedPic);
  }, []);

  useEffect(() => {
    const firestore = db;
    if (!firestore || !voterId || voterId === '00000000') return;

    const loadUserProfile = async () => {
      try {
        const userQuery = query(
          collection(firestore, 'users'),
          where('studentId', '==', voterId),
          limit(1)
        );
        const snapshot = await getDocs(userQuery);
        if (snapshot.empty) return;

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data() as {
          fullName?: string;
          email?: string;
          profilePic?: string;
        };

        setUserDocId(userDoc.id);

        if (userData.fullName) {
          setVoterName(userData.fullName);
          localStorage.setItem('voterName', userData.fullName);
        }

        if (userData.email) {
          setVoterEmail(userData.email);
          localStorage.setItem('voterEmail', userData.email);
        }

        if (userData.profilePic) {
          setProfilePic(userData.profilePic);
          localStorage.setItem('voterPic', userData.profilePic);
        }
      } catch {
        // Keep existing local profile data if cloud lookup fails.
      }
    };

    void loadUserProfile();
  }, [voterId]);

  useEffect(() => {
    try {
      const read = JSON.parse(localStorage.getItem(READ_NOTIFICATIONS_KEY) || '[]');
      const dismissed = JSON.parse(localStorage.getItem(DISMISSED_NOTIFICATIONS_KEY) || '[]');
      if (Array.isArray(read)) setReadNotificationIds(read.filter((item) => typeof item === 'string'));
      if (Array.isArray(dismissed)) setDismissedNotificationIds(dismissed.filter((item) => typeof item === 'string'));
    } catch {
      setReadNotificationIds([]);
      setDismissedNotificationIds([]);
    }
  }, []);

  useEffect(() => {
    if (!db) return;

    const unsubSystemNotifications = subscribeSystemNotifications((items) => {
      const mappedItems: LiveNotification[] = items
        .filter((item) => item.kind === 'election')
        .map((item: SystemNotification): LiveNotification => ({
          id: item.id,
          title: item.title,
          description: item.description,
          kind: 'election',
        }));

      setNotifications(mappedItems);

      const latestElection = mappedItems[0];
      const lastToastId = typeof window !== 'undefined' ? localStorage.getItem(LAST_TOAST_NOTIFICATION_ID) : null;

      if (latestElection && latestElection.id !== lastToastId) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(LAST_TOAST_NOTIFICATION_ID, latestElection.id);
        }
        setToastNotification(latestElection);
      }
    });

    return () => unsubSystemNotifications();
  }, []);

  useEffect(() => {
    const unsub = subscribeElectionSettings((settings) => {
      setElectionSettings(settings);
    });
    return () => unsub();
  }, []);

  const alertStateRef = useRef({
    oneHourSent: false,
    thirtyMinSent: false,
    closedSent: false,
    scheduleKey: '',
  });

  const getEndDate = (settings: ElectionSettings | null) => {
    if (!settings) return null;
    const date = new Date(`${settings.endDate}T${settings.endTime}`);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const getLocalNotificationId = (type: 'oneHour' | 'thirtyMin' | 'closed', settings: ElectionSettings) => {
    return `local-election-${type}-${settings.startDate}-${settings.startTime}-${settings.endDate}-${settings.endTime}-${settings.isActive}`;
  };

  const addLocalElectionNotification = (notification: LiveNotification) => {
    setLocalNotifications((prev) => {
      if (prev.some((item) => item.id === notification.id)) return prev;
      return [notification, ...prev];
    });
    setToastNotification(notification);
  };

  useEffect(() => {
    if (!electionSettings) return;

    const scheduleKey = `${electionSettings.startDate}-${electionSettings.startTime}-${electionSettings.endDate}-${electionSettings.endTime}-${electionSettings.isActive}`;
    if (alertStateRef.current.scheduleKey !== scheduleKey) {
      alertStateRef.current = {
        oneHourSent: false,
        thirtyMinSent: false,
        closedSent: false,
        scheduleKey,
      };
      setLocalNotifications([]);
    }

    const endDate = getEndDate(electionSettings);
    if (!endDate || !electionSettings.isActive) return;

    const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const checkAlerts = () => {
      const now = new Date();
      const diff = endDate.getTime() - now.getTime();
      if (diff <= 0 && !alertStateRef.current.closedSent) {
        alertStateRef.current.closedSent = true;
        addLocalElectionNotification({
          id: getLocalNotificationId('closed', electionSettings),
          title: 'Voting is now CLOSED',
          description: `Voting closed at ${formatTime(endDate)}`,
          kind: 'election',
        });
        return;
      }
      if (diff <= 30 * 60 * 1000 && diff > 0 && !alertStateRef.current.thirtyMinSent) {
        alertStateRef.current.thirtyMinSent = true;
        addLocalElectionNotification({
          id: getLocalNotificationId('thirtyMin', electionSettings),
          title: 'Voting ends in 30 minutes',
          description: `Voting ends at ${formatTime(endDate)}`,
          kind: 'election',
        });
        return;
      }
      if (diff <= 60 * 60 * 1000 && diff > 30 * 60 * 1000 && !alertStateRef.current.oneHourSent) {
        alertStateRef.current.oneHourSent = true;
        addLocalElectionNotification({
          id: getLocalNotificationId('oneHour', electionSettings),
          title: 'Voting ends in 1 hour',
          description: `Voting ends at ${formatTime(endDate)}`,
          kind: 'election',
        });
        return;
      }
    };

    checkAlerts();
    const interval = window.setInterval(checkAlerts, 20 * 1000);
    return () => window.clearInterval(interval);
  }, [electionSettings]);

  useEffect(() => {
    if (!toastNotification) return;
    const timer = setTimeout(() => setToastNotification(null), 7000);
    return () => clearTimeout(timer);
  }, [toastNotification]);

  useEffect(() => {
    if (!toastNotification?.description) {
      setToastCountdown(null);
      return;
    }

    const parseEndDateFromDescription = (description: string): Date | null => {
      const parts = description.split("→").map((part) => part.trim());
      const endPart = parts[1] ?? parts[0];
      const parsed = new Date(endPart.replace(" ", "T"));
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const endDate = parseEndDateFromDescription(toastNotification.description);
    const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const updateCountdown = () => {
      if (!endDate) {
        setToastCountdown(null);
        return;
      }

      const now = new Date();
      const diff = endDate.getTime() - now.getTime();
      if (diff <= 0) {
        setToastCountdown('Voting is now closed');
        return;
      }
      if (diff <= 30 * 60 * 1000) {
        const minutes = Math.max(1, Math.ceil(diff / (1000 * 60)));
        setToastCountdown(`Voting ends in ${minutes} minute${minutes === 1 ? '' : 's'}`);
        return;
      }
      setToastCountdown(`Ends at ${formatTime(endDate)}`);
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [toastNotification]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allNotifications = [...localNotifications, ...notifications];
  const visibleNotifications = allNotifications.filter((item) => !dismissedNotificationIds.includes(item.id));
  const unreadCount = visibleNotifications.filter((item) => !readNotificationIds.includes(item.id)).length;

  const persistReadNotificationIds = (next: string[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(next));
    }
    setReadNotificationIds(next);
  };

  const persistDismissedNotificationIds = (next: string[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(next));
    }
    setDismissedNotificationIds(next);
  };

  const markVisibleNotificationsRead = () => {
    const visibleIds = visibleNotifications.map((item) => item.id);
    if (visibleIds.length === 0) return;
    persistReadNotificationIds(Array.from(new Set([...readNotificationIds, ...visibleIds])));
  };

  const handleNotifToggle = () => {
    const nextOpen = !isNotifOpen;
    setIsNotifOpen(nextOpen);
    if (nextOpen) markVisibleNotificationsRead();
  };

  const markNotificationRead = (id: string) => {
    persistReadNotificationIds(Array.from(new Set([...readNotificationIds, id])));
  };

  const dismissNotification = (id: string) => {
    persistDismissedNotificationIds(Array.from(new Set([...dismissedNotificationIds, id])));
    markNotificationRead(id);
  };

  const openNotification = (item: LiveNotification) => {
    markNotificationRead(item.id);
    if (item.actionHref) {
      setIsNotifOpen(false);
      router.push(item.actionHref);
    }
  };

  const toastIsOpen = toastNotification?.title.toLowerCase().includes('open') ?? false;
  const toastToneClasses = toastIsOpen
    ? 'border-emerald-200 bg-gradient-to-br from-emerald-600 via-emerald-500 to-lime-500 shadow-[0_24px_70px_-20px_rgba(16,185,129,0.45)]'
    : 'border-red-200 bg-gradient-to-br from-red-600 via-red-500 to-orange-500 shadow-[0_24px_70px_-20px_rgba(220,38,38,0.45)]';
  const toastAccentLine = toastIsOpen ? 'bg-white/45' : 'bg-white/40';

  const handleLogout = () => {
    localStorage.removeItem('voterId');
    localStorage.removeItem('voterName');
    localStorage.removeItem('voterEmail');
    localStorage.removeItem('voterPic');
    router.push('/');
  };

  const resolveUserDocId = async () => {
    if (userDocId) return userDocId;
    const firestore = db;
    if (!firestore || !voterId || voterId === '00000000') return null;

    const userQuery = query(
      collection(firestore, 'users'),
      where('studentId', '==', voterId),
      limit(1)
    );
    const snapshot = await getDocs(userQuery);
    if (snapshot.empty) return null;

    const resolvedId = snapshot.docs[0].id;
    setUserDocId(resolvedId);
    return resolvedId;
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setProfilePic(base64String);
      localStorage.setItem('voterPic', base64String);

      void (async () => {
        const firestore = db;
        const storageService = storage;
        if (!firestore || !storageService) return;

        try {
          const resolvedDocId = await resolveUserDocId();
          if (!resolvedDocId) return;

          const storageRef = ref(storageService, `profile-pictures/${resolvedDocId}/avatar`);
          await uploadBytes(storageRef, file, {
            contentType: file.type || 'image/jpeg',
          });

          const downloadURL = await getDownloadURL(storageRef);
          await updateDoc(doc(firestore, 'users', resolvedDocId), {
            profilePic: downloadURL,
            profilePicUpdatedAt: new Date().toISOString(),
          });

          setProfilePic(downloadURL);
          localStorage.setItem('voterPic', downloadURL);
        } catch (error) {
          console.error('Failed to sync profile picture to cloud:', error);
        }
      })();
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <AnimatePresence>
        {toastNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            className={`fixed top-24 right-3 z-[180] w-[calc(100%-1.5rem)] max-w-[18rem] overflow-hidden rounded-[1.5rem] border text-white backdrop-blur-xl ${toastToneClasses}`}
          >
            <div className={`h-1 w-full ${toastAccentLine}`} />
            <div className="p-3.5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
                  <CalendarClock size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/85">Realtime Election Alert</p>
                  <h3 className="mt-1 text-[13px] font-black leading-tight text-white">{toastNotification.title}</h3>
                  <p className="mt-1 text-[11px] font-medium leading-relaxed text-white/85">{toastNotification.description}</p>
                  {toastCountdown ? (
                    <p className="mt-2 text-[11px] font-semibold leading-relaxed text-white/90">{toastCountdown}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => setToastNotification(null)}
                  className="rounded-full p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
                  aria-label="Dismiss alert"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="sticky top-0 z-[100] w-full border-b border-gray-100/50 bg-white/80 shadow-sm backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={() => router.push('/vote')}
            className="group relative flex cursor-pointer items-center gap-4"
          >
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#f05a28]/20 blur-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <Image
                src="/cet.png"
                alt="CET Logo"
                width={48}
                height={48}
                className="relative drop-shadow-md transition-transform duration-300 group-hover:rotate-[5deg]"
              />
            </div>
            <div className="flex flex-col">
              <h1 className="font-[900] text-2xl leading-none tracking-tighter text-gray-900 italic">
                CET<span className="text-[#f05a28]">VOTE</span>
              </h1>
              <span className="mt-1 hidden text-[8px] font-bold uppercase tracking-[0.3em] text-gray-400 sm:block">
                Student Vote Portal
              </span>
            </div>
          </motion.div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="relative" ref={notifRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNotifToggle}
                className={`relative rounded-2xl p-3 transition-all duration-300 ${
                  isNotifOpen
                    ? 'bg-[#f05a28] text-white shadow-lg shadow-[#f05a28]/20'
                    : 'text-gray-400 hover:bg-[#f05a28]/5 hover:text-[#f05a28]'
                }`}
              >
                <Bell size={22} strokeWidth={2.5} />
                <span className={`absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-white ${unreadCount > 0 ? 'bg-red-500' : 'bg-gray-300'}`} />
              </motion.button>

              <AnimatePresence>
                {isNotifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-72 overflow-hidden rounded-[1.5rem] border border-gray-100 bg-white/95 shadow-[0_22px_45px_-15px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:w-80"
                  >
                    <div className="flex items-center justify-between border-b border-gray-50 bg-gradient-to-r from-gray-50 to-white p-4">
                      <div>
                        <span className="text-[9px] font-[900] uppercase tracking-[0.2em] text-gray-500">Live Updates</span>
                        <p className="mt-1 text-[11px] font-semibold text-gray-400">
                          {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
                        </p>
                      </div>
                      <button onClick={() => setIsNotifOpen(false)} className="rounded-full p-1.5 transition-colors hover:bg-gray-100">
                        <X size={14} className="text-gray-400" />
                      </button>
                    </div>
                    <div className="max-h-[280px] overflow-y-auto p-1.5">
                      {visibleNotifications.length === 0 ? (
                        <div className="p-6 text-center text-[13px] font-medium text-gray-400">No notifications</div>
                      ) : (
                        visibleNotifications.map((item) => {
                          const isRead = readNotificationIds.includes(item.id);
                          const isElectionOpen = item.title.toLowerCase().includes('open');
                          return (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`relative mb-1.5 rounded-2xl border p-3 transition-all ${
                                isRead
                                  ? 'border-gray-100 bg-gray-50/70'
                                  : isElectionOpen
                                    ? 'border-emerald-200 bg-emerald-50 shadow-sm'
                                    : 'border-red-200 bg-red-50 shadow-sm'
                              }`}
                            >
                              <div className="flex gap-3 pr-8">
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isElectionOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                  <CalendarClock size={18} strokeWidth={2.2} />
                                </div>
                                <button type="button" onClick={() => openNotification(item)} className="flex-1 text-left">
                                  <div className="mb-1 flex items-center gap-2">
                                    <p className="text-[13px] font-black leading-tight text-gray-800">{item.title}</p>
                                    {!isRead ? <span className="h-2 w-2 rounded-full bg-red-500" /> : null}
                                  </div>
                                  <p className="text-[11px] font-medium leading-relaxed text-gray-500">{item.description}</p>
                                </button>
                              </div>

                              <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => dismissNotification(item.id)}
                                  className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                  aria-label="Dismiss notification"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative" ref={dropdownRef}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-4 rounded-[1.5rem] border border-gray-100 bg-gray-50/50 px-2 py-2 transition-all duration-300 hover:bg-white hover:shadow-xl hover:shadow-black/[0.03] sm:pl-2 sm:pr-5"
              >
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#111] to-gray-700 text-white shadow-lg">
                  {profilePic ? <img src={profilePic} alt="Avatar" className="h-full w-full object-cover" /> : <User size={20} strokeWidth={2.5} />}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="mb-0.5 text-[9px] font-black uppercase leading-none tracking-widest text-gray-400">Voter</p>
                  <p className="text-xs font-black text-gray-800">{voterName}</p>
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-500 ${isDropdownOpen ? 'rotate-180 text-[#f05a28]' : ''}`} />
              </motion.button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    className="absolute right-0 mt-5 w-64 overflow-hidden rounded-[2.5rem] border border-gray-50 bg-white/95 p-3 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] backdrop-blur-xl"
                  >
                    <div className="mb-2 rounded-[1.8rem] border border-gray-100 bg-gradient-to-br from-gray-50 to-white px-5 py-5">
                      <div className="mb-2 flex items-center gap-2">
                        <ShieldCheck size={14} className="text-[#f05a28]" />
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] leading-none text-gray-400">Verified Account</p>
                      </div>
                      <p className="break-all text-sm font-[900] text-gray-900">{voterId}</p>
                    </div>

                    <div className="space-y-1">
                      <motion.button
                        initial="rest"
                        whileHover="hover"
                        animate="rest"
                        onClick={() => {
                          setShowProfileModal(true);
                          setIsDropdownOpen(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-2xl px-5 py-3.5 text-[13px] font-bold text-gray-600 transition-all duration-200 hover:bg-[#f05a28]/5 hover:text-[#f05a28]"
                      >
                        <motion.span
                          variants={{
                            rest: { x: 0, scale: 1 },
                            hover: { x: 4, scale: 1.08 },
                          }}
                          transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                          className="inline-flex"
                        >
                          <UserCircle size={20} />
                        </motion.span>
                        Profile Details
                      </motion.button>
                      <motion.button
                        initial="rest"
                        whileHover="hover"
                        animate="rest"
                        onClick={() => {
                          setShowSettingsModal(true);
                          setIsDropdownOpen(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-2xl px-5 py-3.5 text-[13px] font-bold text-gray-600 transition-all duration-200 hover:bg-[#f05a28]/5 hover:text-[#f05a28]"
                      >
                        <motion.span
                          variants={{
                            rest: { rotate: 0, scale: 1 },
                            hover: { rotate: 90, scale: 1.05 },
                          }}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                          className="inline-flex"
                        >
                          <Settings size={20} />
                        </motion.span>
                        Settings
                      </motion.button>

                      <div className="mx-4 my-2 h-px bg-gray-100/60" />

                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-[13px] font-black text-red-500 transition-all hover:bg-red-50"
                      >
                        <LogOut size={20} /> Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg overflow-hidden rounded-[3rem] bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between p-8 pb-0">
                <h2 className="text-2xl font-[900] italic uppercase tracking-tight text-black">
                  Voter <span className="text-[#f05a28]">Profile</span>
                </h2>
                <button onClick={() => setShowProfileModal(false)} className="rounded-full bg-black p-3 text-white transition-colors hover:bg-gray-900">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8">
                <div className="mb-8 flex flex-col items-center">
                  <div className="relative group">
                    <div className="h-32 w-32 overflow-hidden rounded-[2.5rem] border-4 border-white bg-gray-100 shadow-xl">
                      {profilePic ? (
                        <img src={profilePic} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-300">
                          <User size={64} />
                        </div>
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 cursor-pointer rounded-2xl bg-[#f05a28] p-3 text-white shadow-lg transition-transform hover:scale-110">
                      <Camera size={20} />
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                  </div>
                  <h3 className="mt-4 text-xl font-black text-gray-800">{voterName}</h3>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#f05a28]">{voterId}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 rounded-3xl border border-gray-100 bg-gray-50 p-5">
                    <Mail className="text-gray-400" size={20} />
                    <div>
                      <p className="mb-1 text-[10px] font-black uppercase leading-none text-gray-400">Account Email</p>
                      <p className="text-sm font-bold text-gray-700">{voterEmail || 'No email found'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettingsModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg overflow-hidden rounded-[3rem] bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between p-8 pb-0">
                <h2 className="text-2xl font-[900] italic uppercase tracking-tight">
                  App <span className="text-[#f05a28]">Settings</span>
                </h2>
                <button onClick={() => setShowSettingsModal(false)} className="rounded-full bg-gray-50 p-3 transition-colors hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6 p-8">
                <section>
                  <h4 className="mb-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Preferences</h4>
                  <div className="space-y-3">
                    <div className="flex cursor-pointer items-center justify-between rounded-2xl border border-transparent p-4 transition-colors hover:border-gray-100 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-indigo-50 p-2 text-indigo-500"><Moon size={18} /></div>
                        <span className="text-sm font-bold text-gray-700">Dark Mode</span>
                      </div>
                      <div className="relative h-6 w-10 rounded-full bg-gray-200"><div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm" /></div>
                    </div>
                    <div className="flex cursor-pointer items-center justify-between rounded-2xl border border-transparent p-4 transition-colors hover:border-gray-100 hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-50 p-2 text-blue-500"><Globe size={18} /></div>
                        <span className="text-sm font-bold text-gray-700">Language</span>
                      </div>
                      <span className="text-xs font-black text-[#f05a28]">English (US)</span>
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="mb-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Privacy & Security</h4>
                  <div className="space-y-2">
                    <button className="flex w-full items-center gap-3 rounded-2xl border border-transparent p-4 text-sm font-bold text-gray-700 transition-all hover:border-gray-100 hover:bg-gray-50">
                      <Lock size={18} className="text-gray-400" /> Change Vote PIN
                    </button>
                    <button className="flex w-full items-center gap-3 rounded-2xl border border-transparent p-4 text-sm font-bold text-gray-700 transition-all hover:border-gray-100 hover:bg-gray-50">
                      <Smartphone size={18} className="text-gray-400" /> Two-Factor Auth
                    </button>
                    <button className="flex w-full items-center gap-3 rounded-2xl border border-transparent p-4 text-sm font-bold text-red-500 transition-all hover:border-red-100 hover:bg-red-50">
                      <Trash2 size={18} /> Delete Ballot History
                    </button>
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
