import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BellIcon, BellOffIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface NotificationToggleProps {
  matchTime: Date;
}

const NOTIFICATION_TIMES = [
  { value: '5', label: '5 minutes before' },
  { value: '15', label: '15 minutes before' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '180', label: '3 hours before' },
  { value: '360', label: '6 hours before' },
  { value: '720', label: '12 hours before' },
  { value: '1440', label: '1 day before' },
];

export default function NotificationToggle({ matchTime }: NotificationToggleProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [notificationTime, setNotificationTime] = useState('60');
  const { toast } = useToast();

  // Check if device is mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const notificationsSupported = 'Notification' in window && !isMobile;

  useEffect(() => {
    if (!notificationsSupported) return;

    // Check initial permission status
    setPermissionGranted(Notification.permission === 'granted');

    // Load saved preferences
    const savedPref = localStorage.getItem('matchNotifications');
    const savedTime = localStorage.getItem('notificationTime');
    if (savedPref) {
      setNotificationsEnabled(savedPref === 'true');
    }
    if (savedTime) {
      setNotificationTime(savedTime);
    }
  }, [notificationsSupported]);

  useEffect(() => {
    if (!notificationsEnabled || !permissionGranted || !notificationsSupported) return;

    // Schedule notification based on selected time
    const minutesBefore = parseInt(notificationTime);
    const scheduledTime = new Date(matchTime.getTime() - minutesBefore * 60 * 1000);
    const now = new Date();

    if (scheduledTime > now) {
      const timeout = setTimeout(() => {
        new Notification('Match Reminder', {
          body: `Arsenal match starts in ${minutesBefore} minute${minutesBefore === 1 ? '' : 's'}!`,
          icon: '/arsenal-icon.png'
        });
      }, scheduledTime.getTime() - now.getTime());

      return () => clearTimeout(timeout);
    }
  }, [notificationsEnabled, permissionGranted, matchTime, notificationTime, notificationsSupported]);

  const toggleNotifications = async () => {
    if (!notificationsSupported) {
      toast({
        title: "Notifications Not Available",
        description: "Match notifications are only available on desktop browsers. Please use a computer to enable notifications.",
        variant: "destructive"
      });
      return;
    }

    if (Notification.permission === 'denied') {
      toast({
        title: "Permission Denied",
        description: "Please enable notifications in your browser settings",
        variant: "destructive"
      });
      return;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setPermissionGranted(true);
      } else {
        return;
      }
    }

    const newState = !notificationsEnabled;
    setNotificationsEnabled(newState);
    localStorage.setItem('matchNotifications', String(newState));

    toast({
      title: newState ? "Notifications Enabled" : "Notifications Disabled",
      description: newState 
        ? `You'll receive a reminder ${NOTIFICATION_TIMES.find(t => t.value === notificationTime)?.label}` 
        : "You won't receive match reminders",
    });
  };

  if (!notificationsSupported) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={toggleNotifications}
        className="gap-2 bg-codepen-black border-white/20 text-white hover:bg-white/10"
      >
        <BellOffIcon className="h-4 w-4 text-codepen-purple" />
        Not Available on Mobile
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {notificationsEnabled && (
        <Select
          value={notificationTime}
          onValueChange={(value) => {
            setNotificationTime(value);
            localStorage.setItem('notificationTime', value);
            toast({
              title: "Reminder Time Updated",
              description: `You'll be notified ${NOTIFICATION_TIMES.find(t => t.value === value)?.label}`,
            });
          }}
        >
          <SelectTrigger className="w-[180px] bg-codepen-black border-white/20 text-white focus:ring-codepen-blue">
            <SelectValue placeholder="Select reminder time" />
          </SelectTrigger>
          <SelectContent className="bg-codepen-black border-white/20 text-white">
            {NOTIFICATION_TIMES.map((time) => (
              <SelectItem 
                key={time.value} 
                value={time.value}
                className="text-white focus:bg-white/10 focus:text-white"
              >
                {time.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={toggleNotifications}
        className={`gap-2 bg-codepen-black border-white/20 ${notificationsEnabled ? 'text-codepen-teal hover:bg-codepen-teal/10' : 'text-white hover:bg-white/10'}`}
      >
        {notificationsEnabled ? (
          <>
            <BellIcon className="h-4 w-4 text-codepen-teal" />
            Notifications On
          </>
        ) : (
          <>
            <BellOffIcon className="h-4 w-4 text-codepen-blue" />
            Notifications Off
          </>
        )}
      </Button>
    </div>
  );
}