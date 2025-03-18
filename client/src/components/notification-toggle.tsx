import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BellIcon, BellOffIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NotificationToggleProps {
  matchTime: Date;
}

export default function NotificationToggle({ matchTime }: NotificationToggleProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      return;
    }

    // Check initial permission status
    setPermissionGranted(Notification.permission === 'granted');
    
    // Load saved preference
    const savedPref = localStorage.getItem('matchNotifications');
    if (savedPref) {
      setNotificationsEnabled(savedPref === 'true');
    }
  }, []);

  useEffect(() => {
    if (!notificationsEnabled || !permissionGranted) return;

    // Schedule notification for 1 hour before match
    const notificationTime = new Date(matchTime.getTime() - 60 * 60 * 1000);
    const now = new Date();

    if (notificationTime > now) {
      const timeout = setTimeout(() => {
        new Notification('Match Reminder', {
          body: `Arsenal match starts in 1 hour!`,
          icon: '/arsenal-icon.png'
        });
      }, notificationTime.getTime() - now.getTime());

      return () => clearTimeout(timeout);
    }
  }, [notificationsEnabled, permissionGranted, matchTime]);

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
        ? "You'll receive a reminder 1 hour before the match" 
        : "You won't receive match reminders",
    });
  };

  return (
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
  );
}
