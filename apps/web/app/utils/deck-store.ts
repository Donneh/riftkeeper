export interface StoredDeck {
  readonly id: string;
  readonly name: string;
  readonly legend: string | null;
  readonly list: string;
  readonly updatedAt: string;
}

export type DeckDraft = Omit<StoredDeck, "updatedAt">;

export interface DeckStore {
  list(): Promise<readonly StoredDeck[]>;
  get(id: string): Promise<StoredDeck | null>;
  save(deck: DeckDraft): Promise<StoredDeck>;
  remove(id: string): Promise<void>;
}

export const LOCAL_DECKS_KEY = "riftkeeper-decks";

const isStoredDeck = (value: unknown): value is StoredDeck => {
  const deck = value as Partial<StoredDeck> | null;
  return (
    typeof deck?.id === "string" &&
    typeof deck.name === "string" &&
    (deck.legend === null || typeof deck.legend === "string") &&
    typeof deck.list === "string" &&
    typeof deck.updatedAt === "string"
  );
};

export function localDeckStore(storage: () => Storage, now: () => Date = () => new Date()): DeckStore {
  function read(): StoredDeck[] {
    try {
      const parsed: unknown = JSON.parse(storage().getItem(LOCAL_DECKS_KEY) ?? "[]");
      return Array.isArray(parsed) ? parsed.filter(isStoredDeck) : [];
    } catch {
      return [];
    }
  }

  function write(decks: readonly StoredDeck[]) {
    storage().setItem(LOCAL_DECKS_KEY, JSON.stringify(decks));
  }

  return {
    async list() {
      return read().toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async get(id) {
      return read().find((deck) => deck.id === id) ?? null;
    },
    async save(draft) {
      const saved: StoredDeck = { ...draft, updatedAt: now().toISOString() };
      write([saved, ...read().filter((deck) => deck.id !== draft.id)]);
      return saved;
    },
    async remove(id) {
      write(read().filter((deck) => deck.id !== id));
    },
  };
}
