import { useState, useEffect } from "react";

/**
 * Hook to calculate time remaining until a deadline
 * @param deadline Unix timestamp in seconds
 * @returns Object with days, hours, minutes, seconds, and formatted string
 */
export function useCountdown(deadline: number | undefined) {
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
    expired: boolean;
    formatted: string;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    total: 0,
    expired: false,
    formatted: "",
  });

  useEffect(() => {
    if (!deadline || deadline === 0) {
      setTimeRemaining({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        total: 0,
        expired: true,
        formatted: "No deadline",
      });
      return;
    }

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const total = deadline - now;

      if (total <= 0) {
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          total: 0,
          expired: true,
          formatted: "Expired",
        });
        return;
      }

      const days = Math.floor(total / 86400);
      const hours = Math.floor((total % 86400) / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const seconds = total % 60;

      // Format: "X days, Y hours" or "Y hours, Z minutes" or "Z minutes" or "X seconds"
      let formatted = "";
      if (days > 0) {
        formatted = `${days}d ${hours}h`;
      } else if (hours > 0) {
        formatted = `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        formatted = `${minutes}m ${seconds}s`;
      } else {
        formatted = `${seconds}s`;
      }

      setTimeRemaining({
        days,
        hours,
        minutes,
        seconds,
        total,
        expired: false,
        formatted,
      });
    };

    // Update immediately
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [deadline]);

  return timeRemaining;
}

