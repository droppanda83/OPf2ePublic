import React from 'react';

interface LogEntry {
  timestamp: number;
  type: string;
  message: string;
  details?: any;
}

interface GameLogProps {
  log: LogEntry[];
}

const GameLog: React.FC<GameLogProps> = ({ log }) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [log]);

  return (
    <div style={styles.log}>
      <h3>Combat Log</h3>
      <div ref={scrollRef} style={styles.logContent}>
        {log?.map((entry, i) => (
          <div
            key={i}
            style={{
              ...styles.logEntry,
              color: entry.type === 'system' ? '#888' : '#ccc',
            }}
          >
            {entry.message}
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  log: {
    padding: '15px',
    borderTop: '1px solid #2a3042',
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  logContent: {
    flex: 1,
    overflow: 'auto',
    fontSize: '12px',
  },
  logEntry: {
    padding: '4px 0',
    borderBottom: '1px solid #1a1f2a',
  },
};

export default GameLog;
