import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Trash2,
} from "lucide-react";
import { useRecallStore } from "../stores/useRecallStore";
import type {
  CardDraft,
  CardKind,
  RecallCard,
  ReadingDraft,
  ReadingItem,
} from "../types";

type LibraryTab = "cards" | "readings" | "settings";

const cardKinds: { value: CardKind; label: string }[] = [
  { value: "target-meaning", label: "Word -> meaning" },
  { value: "target-reading-meaning", label: "Word -> reading + meaning" },
  { value: "sentence-meaning", label: "Sentence -> meaning" },
  { value: "kana-recognition", label: "Kana recognition" },
  { value: "audio-prompt", label: "Audio prompt" },
];

export function LibraryView() {
  const [tab, setTab] = useState<LibraryTab>("cards");

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-teal-100/70">
            Library
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-stone-50">
            Study material
          </h2>
        </div>
        <div className="grid grid-cols-3 rounded-md border border-stone-700 bg-stone-950/70 p-1">
          {(["cards", "readings", "settings"] as LibraryTab[]).map((item) => (
            <button
              key={item}
              type="button"
              className={`min-h-10 rounded px-3 text-sm font-medium capitalize transition ${
                tab === item
                  ? "bg-stone-100 text-stone-950"
                  : "text-stone-300 hover:bg-stone-800 hover:text-stone-50"
              }`}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {tab === "cards" ? <CardsLibrary /> : null}
      {tab === "readings" ? <ReadingsLibrary /> : null}
      {tab === "settings" ? <SettingsPanel /> : null}
    </main>
  );
}

function CardsLibrary() {
  const cards = useRecallStore((state) => state.cards);
  const saveCard = useRecallStore((state) => state.saveCard);
  const deleteCard = useRecallStore((state) => state.deleteCard);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingCard = useMemo(
    () => cards.find((card) => card.id === editingId) ?? null,
    [cards, editingId],
  );

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid content-start gap-3">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            className={`grid gap-2 rounded-md border p-4 text-left transition sm:grid-cols-[1fr_auto] ${
              editingId === card.id
                ? "border-teal-200/35 bg-teal-200/10"
                : "border-stone-700 bg-[#101119]/80 hover:border-stone-500"
            }`}
            onClick={() => setEditingId(card.id)}
          >
            <span>
              <span className="block text-xl font-semibold text-stone-50">
                {card.prompt}
              </span>
              <span className="mt-1 block text-sm text-stone-400">
                {card.meaning}
              </span>
            </span>
            <span className="text-sm text-teal-100">{card.group}</span>
          </button>
        ))}
      </div>
      <CardEditor
        card={editingCard}
        onSave={(draft) => {
          saveCard(draft);
          setEditingId(null);
        }}
        onDelete={
          editingCard
            ? () => {
                deleteCard(editingCard.id);
                setEditingId(null);
              }
            : undefined
        }
        onNew={() => setEditingId(null)}
      />
    </section>
  );
}

function CardEditor({
  card,
  onSave,
  onDelete,
  onNew,
}: {
  card: RecallCard | null;
  onSave: (draft: CardDraft) => void;
  onDelete?: () => void;
  onNew: () => void;
}) {
  const [draft, setDraft] = useState<CardDraft>(() => cardToDraft(card));

  useEffect(() => {
    setDraft(cardToDraft(card));
  }, [card]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(draft);
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-md border border-stone-700/70 bg-[#101119]/80 p-5"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-stone-50">
          <Plus aria-hidden="true" className="h-5 w-5 text-teal-100" />
          <h3 className="text-xl font-semibold">
            {card ? "Edit card" : "Add card"}
          </h3>
        </div>
        <button
          type="button"
          className="rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 hover:bg-stone-800"
          onClick={() => {
            onNew();
            setDraft(cardToDraft(null));
          }}
        >
          New
        </button>
      </div>

      <Field label="Type">
        <select
          value={draft.kind}
          onChange={(event) =>
            setDraft({ ...draft, kind: event.target.value as CardKind })
          }
          className="form-input"
        >
          {cardKinds.map((kind) => (
            <option key={kind.value} value={kind.value}>
              {kind.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Prompt">
        <input
          value={draft.prompt}
          onChange={(event) =>
            setDraft({ ...draft, prompt: event.target.value })
          }
          className="form-input"
          required
        />
      </Field>
      <Field label="Reading">
        <input
          value={draft.reading ?? ""}
          onChange={(event) =>
            setDraft({ ...draft, reading: event.target.value })
          }
          className="form-input"
        />
      </Field>
      <Field label="Meaning">
        <input
          value={draft.meaning}
          onChange={(event) =>
            setDraft({ ...draft, meaning: event.target.value })
          }
          className="form-input"
          required
        />
      </Field>
      <Field label="Group">
        <input
          value={draft.group}
          onChange={(event) =>
            setDraft({ ...draft, group: event.target.value })
          }
          className="form-input"
          required
        />
      </Field>
      <Field label="Notes">
        <textarea
          value={draft.notes ?? ""}
          onChange={(event) =>
            setDraft({ ...draft, notes: event.target.value })
          }
          className="form-input min-h-24 resize-y"
        />
      </Field>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-stone-100 px-4 font-semibold text-stone-950 hover:bg-teal-100"
        >
          <Save aria-hidden="true" className="h-4 w-4" />
          Save Card
        </button>
        {onDelete ? (
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-rose-200/25 bg-rose-200/10 px-4 font-semibold text-rose-100 hover:bg-rose-200/15"
            onClick={onDelete}
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}

function ReadingsLibrary() {
  const readings = useRecallStore((state) => state.readings);
  const saveReading = useRecallStore((state) => state.saveReading);
  const deleteReading = useRecallStore((state) => state.deleteReading);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingReading =
    readings.find((reading) => reading.id === editingId) ?? null;

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="grid content-start gap-3">
        {readings.map((reading) => (
          <button
            key={reading.id}
            type="button"
            className={`rounded-md border p-4 text-left transition ${
              editingId === reading.id
                ? "border-teal-200/35 bg-teal-200/10"
                : "border-stone-700 bg-[#101119]/80 hover:border-stone-500"
            }`}
            onClick={() => setEditingId(reading.id)}
          >
            <span className="block text-lg font-semibold text-stone-50">
              {reading.title}
            </span>
            <span className="mt-2 block text-2xl text-stone-100">
              {reading.text}
            </span>
          </button>
        ))}
      </div>
      <ReadingEditor
        reading={editingReading}
        onSave={(draft) => {
          saveReading(draft);
          setEditingId(null);
        }}
        onDelete={
          editingReading
            ? () => {
                deleteReading(editingReading.id);
                setEditingId(null);
              }
            : undefined
        }
        onNew={() => setEditingId(null)}
      />
    </section>
  );
}

function ReadingEditor({
  reading,
  onSave,
  onDelete,
  onNew,
}: {
  reading: ReadingItem | null;
  onSave: (draft: ReadingDraft) => void;
  onDelete?: () => void;
  onNew: () => void;
}) {
  const [draft, setDraft] = useState<ReadingDraft>(() =>
    readingToDraft(reading),
  );

  useEffect(() => {
    setDraft(readingToDraft(reading));
  }, [reading]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(draft);
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-md border border-stone-700/70 bg-[#101119]/80 p-5"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-stone-50">
          <BookOpen aria-hidden="true" className="h-5 w-5 text-teal-100" />
          <h3 className="text-xl font-semibold">
            {reading ? "Edit reading" : "Add reading"}
          </h3>
        </div>
        <button
          type="button"
          className="rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 hover:bg-stone-800"
          onClick={() => {
            onNew();
            setDraft(readingToDraft(null));
          }}
        >
          New
        </button>
      </div>

      <Field label="Title">
        <input
          value={draft.title}
          onChange={(event) =>
            setDraft({ ...draft, title: event.target.value })
          }
          className="form-input"
          required
        />
      </Field>
      <Field label="Text">
        <textarea
          value={draft.text}
          onChange={(event) => setDraft({ ...draft, text: event.target.value })}
          className="form-input min-h-24 resize-y"
          required
        />
      </Field>
      <Field label="Reading help">
        <textarea
          value={draft.readingHelp}
          onChange={(event) =>
            setDraft({ ...draft, readingHelp: event.target.value })
          }
          className="form-input min-h-20 resize-y"
          required
        />
      </Field>
      <Field label="Meaning">
        <textarea
          value={draft.translation}
          onChange={(event) =>
            setDraft({ ...draft, translation: event.target.value })
          }
          className="form-input min-h-20 resize-y"
          required
        />
      </Field>
      <Field label="Notes">
        <textarea
          value={draft.notes ?? ""}
          onChange={(event) =>
            setDraft({ ...draft, notes: event.target.value })
          }
          className="form-input min-h-20 resize-y"
        />
      </Field>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-stone-100 px-4 font-semibold text-stone-950 hover:bg-teal-100"
        >
          <Save aria-hidden="true" className="h-4 w-4" />
          Save Reading
        </button>
        {onDelete ? (
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-rose-200/25 bg-rose-200/10 px-4 font-semibold text-rose-100 hover:bg-rose-200/15"
            onClick={onDelete}
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Delete
          </button>
        ) : null}
      </div>
    </form>
  );
}

function SettingsPanel() {
  const settings = useRecallStore((state) => state.settings);
  const updateSettings = useRecallStore((state) => state.updateSettings);
  const resetLocalData = useRecallStore((state) => state.resetLocalData);

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-md border border-stone-700/70 bg-[#101119]/80 p-5">
        <div className="mb-5 flex items-center gap-2 text-stone-50">
          <Settings aria-hidden="true" className="h-5 w-5 text-teal-100" />
          <h3 className="text-xl font-semibold">Session settings</h3>
        </div>

        <div className="grid gap-5">
          <Field label="Default minutes">
            <input
              type="number"
              min={5}
              max={15}
              value={settings.defaultSessionMinutes}
              onChange={(event) =>
                updateSettings({
                  defaultSessionMinutes: Number(event.target.value),
                })
              }
              className="form-input"
            />
          </Field>
          <Field label="Custom minutes">
            <input
              type="number"
              min={5}
              max={15}
              value={settings.customSessionMinutes}
              onChange={(event) =>
                updateSettings({
                  customSessionMinutes: Number(event.target.value),
                })
              }
              className="form-input"
            />
          </Field>
          <Field label="New cards">
            <input
              type="number"
              min={0}
              max={3}
              value={settings.newCardLimit}
              onChange={(event) =>
                updateSettings({ newCardLimit: Number(event.target.value) })
              }
              className="form-input"
            />
          </Field>
          <label className="flex items-center justify-between gap-4 rounded-md border border-stone-700 bg-stone-950/70 p-4 text-stone-100">
            <span>Show romaji on cards</span>
            <input
              type="checkbox"
              checked={settings.romajiVisible}
              onChange={(event) =>
                updateSettings({ romajiVisible: event.target.checked })
              }
              className="h-5 w-5 accent-teal-200"
            />
          </label>
          <label className="flex items-center justify-between gap-4 rounded-md border border-stone-700 bg-stone-950/70 p-4 text-stone-100">
            <span>Reduce motion</span>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(event) =>
                updateSettings({ reducedMotion: event.target.checked })
              }
              className="h-5 w-5 accent-teal-200"
            />
          </label>
        </div>
      </div>

      <div className="rounded-md border border-stone-700/70 bg-[#101119]/80 p-5">
        <h3 className="text-xl font-semibold text-stone-50">Local data</h3>
        <button
          type="button"
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-rose-200/25 bg-rose-200/10 px-4 font-semibold text-rose-100 hover:bg-rose-200/15"
          onClick={resetLocalData}
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          Reset Library
        </button>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-2 block text-sm font-medium text-stone-300">
        {label}
      </span>
      {children}
    </label>
  );
}

function cardToDraft(card: RecallCard | null): CardDraft {
  return {
    id: card?.id,
    kind: card?.kind ?? "target-reading-meaning",
    prompt: card?.prompt ?? "",
    reading: card?.reading ?? "",
    meaning: card?.meaning ?? "",
    notes: card?.notes ?? "",
    group: card?.group ?? "Manual",
    audioText: card?.audioText ?? "",
    romaji: card?.romaji ?? "",
  };
}

function readingToDraft(reading: ReadingItem | null): ReadingDraft {
  return {
    id: reading?.id,
    title: reading?.title ?? "",
    text: reading?.text ?? "",
    readingHelp: reading?.readingHelp ?? "",
    translation: reading?.translation ?? "",
    notes: reading?.notes ?? "",
    audioText: reading?.audioText ?? "",
  };
}
