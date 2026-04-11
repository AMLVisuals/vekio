import NetInfo from '@react-native-community/netinfo';
import { cacheGet, cacheSet } from './cache';

interface QueuedAction {
  id: string;
  table: string;
  type: 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
}

const QUEUE_KEY = 'offline-queue';

/**
 * Recupere la file d'attente depuis le cache
 */
function getQueue(): QueuedAction[] {
  return cacheGet<QueuedAction[]>(QUEUE_KEY) ?? [];
}

/**
 * Sauvegarde la file d'attente dans le cache
 */
function saveQueue(queue: QueuedAction[]): void {
  cacheSet(QUEUE_KEY, queue);
}

/**
 * Ajoute une action a la file d'attente offline
 */
export function enqueue(action: Omit<QueuedAction, 'id' | 'timestamp'>): void {
  const queue = getQueue();
  queue.push({
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
  });
  saveQueue(queue);
}

/**
 * Traite la file d'attente quand le reseau est disponible
 * Retourne le nombre d'actions traitees
 */
export async function processQueue(
  executor: (action: QueuedAction) => Promise<boolean>
): Promise<number> {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return 0;

  const queue = getQueue();
  if (queue.length === 0) return 0;

  const remaining: QueuedAction[] = [];
  let processed = 0;

  for (const action of queue) {
    const success = await executor(action);
    if (success) {
      processed++;
    } else {
      remaining.push(action);
    }
  }

  saveQueue(remaining);
  return processed;
}

/**
 * Ecoute les changements de connectivite et lance la sync
 */
export function startOfflineSync(
  executor: (action: QueuedAction) => Promise<boolean>
): () => void {
  const unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      processQueue(executor);
    }
  });

  return unsubscribe;
}
