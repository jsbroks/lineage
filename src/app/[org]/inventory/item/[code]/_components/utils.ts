export function formatTimeAgo(timestamp: Date | string) {
  const diffMs = Math.max(0, Date.now() - new Date(timestamp).getTime());
  const totalMinutes = Math.floor(diffMs / 60_000);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h ago`;
  if (totalHours > 0) return `${totalHours}h ${minutes}m ago`;
  if (totalMinutes > 0) return `${totalMinutes}m ago`;
  return "just now";
}
