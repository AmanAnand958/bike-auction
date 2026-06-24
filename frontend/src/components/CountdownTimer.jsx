import { useState, useEffect } from 'react';

function CountdownTimer({ endTime, startTime, status, large = false }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const targetTime = status === 'upcoming' ? new Date(startTime) : new Date(endTime);

    const update = () => {
      const now = new Date();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft(status === 'upcoming' ? 'Starting...' : 'Ended');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTime, startTime, status]);

  if (status === 'ended') {
    return (
      <span className="countdown-wrap countdown-ended">
        🏁 {large ? 'Auction Ended' : 'Ended'}
      </span>
    );
  }

  if (status === 'upcoming') {
    return (
      <span className="countdown-wrap countdown-upcoming">
        🕐 {large ? `Starts in: ${timeLeft}` : `Starts ${timeLeft}`}
      </span>
    );
  }

  return (
    <span className="countdown-wrap countdown-active">
      ⏱ {large ? `Ends in: ${timeLeft}` : timeLeft}
    </span>
  );
}

export default CountdownTimer;
