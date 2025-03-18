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

  useEffect(() => {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      return;
    }

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
  }, []);

  useEffect(() => {
    if (!notificationsEnabled || !permissionGranted) return;

    // Schedule notification based on selected time
    const minutesBefore = parseInt(notificationTime);
    const notificationTime = new Date(matchTime.getTime() - minutesBefore * 60 * 1000);
    const now = new Date();

    if (notificationTime > now) {
      const timeout = setTimeout(() => {
        new Notification('Match Reminder', {
          body: `Arsenal match starts in ${minutesBefore} minute${minutesBefore === 1 ? '' : 's'}!`,
          icon: '/arsenal-icon.png'
        });
      }, notificationTime.getTime() - now.getTime());

      return () => clearTimeout(timeout);
    }
  }, [notificationsEnabled, permissionGranted, matchTime, notificationTime]);

  const toggleNotifications = async () => {
    if (!('Notification' in window)) {
      toast({
        title: "Not Supported",
        description: "Your browser doesn't support notifications",
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
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select reminder time" />
          </SelectTrigger>
          <SelectContent>
            {NOTIFICATION_TIMES.map((time) => (
              <SelectItem key={time.value} value={time.value}>
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
        className="gap-2"
      >
        {notificationsEnabled ? (
          <>
            <BellIcon className="h-4 w-4" />
            Notifications On
          </>
        ) : (
          <>
            <BellOffIcon className="h-4 w-4" />
            Notifications Off
          </>
        )}
      </Button>
    </div>
  );
}