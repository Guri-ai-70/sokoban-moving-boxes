function pad(n, width) {
  return String(n).padStart(width, '0');
}

export function formatHud(floor, moves, pushes, elapsedMs) {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const time = `${hours}:${pad(minutes, 2)}:${pad(seconds, 2)}`;
  return `${pad(floor, 2)}|moves:${pad(moves, 4)} pushes:${pad(pushes, 4)} time:${time}`;
}
