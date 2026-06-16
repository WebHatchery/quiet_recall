<?php

declare(strict_types=1);

namespace App\Services;

use DomainException;

final class RecallStateService
{
    public function defaultState(): array
    {
        $createdAt = '2026-06-15T00:00:00.000Z';
        $dueAt = '2026-06-15T00:00:00.000Z';

        return [
            'cards' => [
                $this->card('kana-a', 'kana-recognition', 'あ', 'hiragana a', 'Hiragana', [
                    'reading' => 'a',
                    'notes' => 'A soft opening sound, as in asa.',
                    'audioText' => 'あ',
                    'romaji' => 'a',
                    'status' => 'learning',
                    'intervalDays' => 1,
                    'ease' => 2.2,
                    'reviews' => 1,
                ], $createdAt, $dueAt),
                $this->card('kana-ka', 'kana-recognition', 'か', 'hiragana ka', 'Hiragana', [
                    'reading' => 'ka',
                    'audioText' => 'か',
                    'romaji' => 'ka',
                    'status' => 'learning',
                    'intervalDays' => 1,
                    'ease' => 2.2,
                    'reviews' => 1,
                ], $createdAt, $dueAt),
                $this->card('vocab-coffee', 'target-reading-meaning', 'コーヒー', 'coffee', 'Everyday', [
                    'reading' => 'コーヒー',
                    'notes' => 'Katakana loanword. Useful for simple preference sentences.',
                    'audioText' => 'コーヒー',
                    'romaji' => 'koohii',
                    'status' => 'review',
                    'intervalDays' => 2,
                    'ease' => 2.4,
                    'reviews' => 3,
                ], $createdAt, $dueAt),
                $this->card('vocab-like', 'target-reading-meaning', '好き', 'like; fond of', 'Everyday', [
                    'reading' => 'すき',
                    'notes' => 'Usually used with が: コーヒーが好きです.',
                    'audioText' => 'すき',
                    'romaji' => 'suki',
                    'status' => 'review',
                    'intervalDays' => 3,
                    'ease' => 2.5,
                    'reviews' => 4,
                ], $createdAt, $dueAt),
                $this->card('vocab-tomorrow', 'target-reading-meaning', '明日', 'tomorrow', 'Time', [
                    'reading' => 'あした',
                    'notes' => 'Common reading for daily speech.',
                    'audioText' => 'あした',
                    'romaji' => 'ashita',
                    'status' => 'learning',
                    'intervalDays' => 1,
                    'ease' => 2.1,
                    'reviews' => 1,
                    'lapses' => 1,
                ], $createdAt, $dueAt),
                $this->card(
                    'sentence-like-coffee',
                    'sentence-meaning',
                    'コーヒーが好きです。',
                    'I like coffee.',
                    'Tiny sentences',
                    [
                        'reading' => 'コーヒーがすきです。',
                        'audioText' => 'コーヒーが好きです',
                        'romaji' => 'koohii ga suki desu',
                    ],
                    $createdAt,
                    $dueAt
                ),
                $this->card('vocab-busy', 'target-reading-meaning', '忙しい', 'busy', 'Everyday', [
                    'reading' => 'いそがしい',
                    'audioText' => 'いそがしい',
                    'romaji' => 'isogashii',
                ], $createdAt, $dueAt),
                $this->card('vocab-gym', 'target-reading-meaning', 'ジム', 'gym', 'Everyday', [
                    'reading' => 'ジム',
                    'audioText' => 'ジム',
                    'romaji' => 'jimu',
                ], $createdAt, $dueAt),
            ],
            'readings' => [
                $this->reading(
                    'reading-coffee',
                    'Coffee before work',
                    '朝、コーヒーを飲みます。',
                    'あさ、コーヒーをのみます。',
                    'In the morning, I drink coffee.',
                    '飲みます is the polite form of drink.',
                    $createdAt
                ),
                $this->reading(
                    'reading-tomorrow',
                    'Tomorrow is busy',
                    '明日は忙しいです。',
                    'あしたはいそがしいです。',
                    'Tomorrow is busy.',
                    'は marks the topic: as for tomorrow.',
                    $createdAt
                ),
                $this->reading(
                    'reading-gym',
                    'A small plan',
                    '今日、ジムに行きました。',
                    'きょう、ジムにいきました。',
                    'Today, I went to the gym.',
                    '行きました is the polite past form of go.',
                    $createdAt
                ),
            ],
            'sentenceTemplates' => [
                [
                    'id' => 'template-like',
                    'prompt' => 'Write one thing you like.',
                    'hint' => '___ が好きです。',
                    'example' => 'コーヒーが好きです。',
                ],
                [
                    'id' => 'template-tomorrow',
                    'prompt' => 'Write one simple sentence about tomorrow.',
                    'hint' => '明日は ___ です。',
                    'example' => '明日は忙しいです。',
                ],
                [
                    'id' => 'template-today',
                    'prompt' => 'Write one simple sentence about today.',
                    'hint' => '今日、___ に行きました。',
                    'example' => '今日、ジムに行きました。',
                ],
            ],
            'settings' => [
                'language' => 'Japanese',
                'defaultSessionMinutes' => 5,
                'customSessionMinutes' => 7,
                'newCardLimit' => 2,
                'romajiVisible' => false,
                'reducedMotion' => false,
            ],
            'progress' => [
                'totalCardsReviewed' => 0,
                'totalCorrect' => 0,
                'totalHard' => 0,
                'reviewedByDate' => [],
                'correctByDate' => [],
                'completedNightDates' => [],
                'completedReadingIds' => [],
                'typedSentences' => [],
            ],
        ];
    }

    public function normalizeState(array $state): array
    {
        $default = $this->defaultState();

        return [
            'cards' => is_array($state['cards'] ?? null) ? $state['cards'] : $default['cards'],
            'readings' => is_array($state['readings'] ?? null) ? $state['readings'] : $default['readings'],
            'sentenceTemplates' => is_array($state['sentenceTemplates'] ?? null)
                ? $state['sentenceTemplates']
                : $default['sentenceTemplates'],
            'settings' => array_merge(
                $default['settings'],
                is_array($state['settings'] ?? null) ? $state['settings'] : []
            ),
            'progress' => array_merge(
                $default['progress'],
                is_array($state['progress'] ?? null) ? $state['progress'] : []
            ),
        ];
    }

    public function startSession(array $state, int $minutes, bool $tiredMode, int $newCardLimit): array
    {
        $state = $this->normalizeState($state);
        $minutes = $tiredMode ? 5 : max(1, min(15, $minutes));
        $cardIds = $this->selectSessionCardIds($state['cards'], $minutes, $tiredMode, $newCardLimit);
        $reading = $tiredMode ? null : $this->selectReading($state);
        $template = $tiredMode ? null : $this->selectSentenceTemplate($state);

        return [
            'id' => bin2hex(random_bytes(16)),
            'startedAt' => $this->nowIso(),
            'expiresAt' => gmdate('c', time() + ($minutes * 60)),
            'minutes' => $minutes,
            'tiredMode' => $tiredMode,
            'cardIds' => $cardIds,
            'currentCardIndex' => 0,
            'revealed' => false,
            'readingId' => $reading['id'] ?? null,
            'sentenceTemplateId' => $template['id'] ?? null,
            'step' => count($cardIds) > 0 ? 'review' : ($tiredMode ? 'done' : 'reading'),
            'reviewedCount' => 0,
            'correctCount' => 0,
            'hardCount' => 0,
            'timeExpired' => false,
        ];
    }

    public function reviewCard(array $state, string $cardId, string $rating): array
    {
        if (!in_array($rating, ['hard', 'okay', 'easy'], true)) {
            throw new DomainException('Invalid card rating.');
        }

        $state = $this->normalizeState($state);
        $reviewedCard = null;
        foreach ($state['cards'] as $index => $card) {
            if (($card['id'] ?? '') !== $cardId) {
                continue;
            }

            $reviewedCard = $this->scheduleCard($card, $rating);
            $state['cards'][$index] = $reviewedCard;
            break;
        }

        if ($reviewedCard === null) {
            throw new DomainException('Card not found.');
        }

        $today = $this->todayKey();
        $progress = $state['progress'];
        $progress['totalCardsReviewed'] = (int) ($progress['totalCardsReviewed'] ?? 0) + 1;
        $progress['totalCorrect'] = (int) ($progress['totalCorrect'] ?? 0) + ($rating === 'hard' ? 0 : 1);
        $progress['totalHard'] = (int) ($progress['totalHard'] ?? 0) + ($rating === 'hard' ? 1 : 0);
        $progress['reviewedByDate'][$today] = (int) ($progress['reviewedByDate'][$today] ?? 0) + 1;
        $progress['correctByDate'][$today] = (int) ($progress['correctByDate'][$today] ?? 0)
            + ($rating === 'hard' ? 0 : 1);
        if ($rating !== 'hard') {
            $progress['lastRemembered'] = ($reviewedCard['prompt'] ?? '') . ' - ' . ($reviewedCard['meaning'] ?? '');
        }
        $state['progress'] = $progress;

        return [
            'state' => $state,
            'card' => $reviewedCard,
        ];
    }

    public function completeReading(array $state, string $readingId): array
    {
        $state = $this->normalizeState($state);
        $completed = null;

        foreach ($state['readings'] as $index => $reading) {
            if (($reading['id'] ?? '') !== $readingId) {
                continue;
            }

            $completed = array_merge($reading, [
                'completedAt' => $this->nowIso(),
                'updatedAt' => $this->nowIso(),
            ]);
            $state['readings'][$index] = $completed;
            break;
        }

        if ($completed === null) {
            throw new DomainException('Reading not found.');
        }

        if (!in_array($readingId, $state['progress']['completedReadingIds'], true)) {
            $state['progress']['completedReadingIds'][] = $readingId;
        }

        return [
            'state' => $state,
            'reading' => $completed,
        ];
    }

    public function saveSentence(array $state, string $prompt, string $text): array
    {
        $state = $this->normalizeState($state);
        $text = trim($text);
        if ($text === '') {
            throw new DomainException('Sentence text is required.');
        }

        array_unshift($state['progress']['typedSentences'], [
            'id' => bin2hex(random_bytes(12)),
            'prompt' => trim($prompt) !== '' ? trim($prompt) : 'Typed sentence',
            'text' => $text,
            'savedAt' => $this->nowIso(),
        ]);
        $state['progress']['typedSentences'] = array_slice($state['progress']['typedSentences'], 0, 20);

        return $state;
    }

    public function completeSession(array $state, array $session): array
    {
        $state = $this->normalizeState($state);
        $today = $this->todayKey();

        if (!in_array($today, $state['progress']['completedNightDates'], true)) {
            $state['progress']['completedNightDates'][] = $today;
        }

        $state['progress']['lastSessionAt'] = $this->nowIso();
        if (isset($session['remembered']) && is_string($session['remembered']) && $session['remembered'] !== '') {
            $state['progress']['lastRemembered'] = $session['remembered'];
        }

        return $state;
    }

    private function card(
        string $id,
        string $kind,
        string $prompt,
        string $meaning,
        string $group,
        array $overrides,
        string $createdAt,
        string $dueAt
    ): array {
        return array_merge([
            'id' => $id,
            'kind' => $kind,
            'prompt' => $prompt,
            'meaning' => $meaning,
            'group' => $group,
            'status' => 'new',
            'dueAt' => $dueAt,
            'intervalDays' => 0,
            'ease' => 2.3,
            'reviews' => 0,
            'lapses' => 0,
            'createdAt' => $createdAt,
            'updatedAt' => $createdAt,
        ], $overrides);
    }

    private function reading(
        string $id,
        string $title,
        string $text,
        string $readingHelp,
        string $translation,
        string $notes,
        string $createdAt
    ): array {
        return [
            'id' => $id,
            'title' => $title,
            'text' => $text,
            'readingHelp' => $readingHelp,
            'translation' => $translation,
            'notes' => $notes,
            'audioText' => $text,
            'createdAt' => $createdAt,
            'updatedAt' => $createdAt,
        ];
    }

    private function selectSessionCardIds(array $cards, int $minutes, bool $tiredMode, int $newCardLimit): array
    {
        usort($cards, static function (array $first, array $second): int {
            $firstDue = strtotime((string) ($first['dueAt'] ?? 'now')) ?: 0;
            $secondDue = strtotime((string) ($second['dueAt'] ?? 'now')) ?: 0;
            return $firstDue <=> $secondDue;
        });

        $dueCards = array_values(array_filter($cards, fn (array $card): bool => $this->isDue($card)));
        $dueIds = array_map(static fn (array $card): string => (string) $card['id'], $dueCards);
        $fallback = array_values(array_filter(
            $cards,
            static fn (array $card): bool => ($card['status'] ?? 'new') !== 'new'
                && !in_array((string) ($card['id'] ?? ''), $dueIds, true)
        ));
        $reviewLimit = $tiredMode ? 5 : max(5, min(12, (int) round($minutes * 1.1)));
        $reviewCards = array_slice(array_merge($dueCards, $fallback), 0, $reviewLimit);

        if ($tiredMode) {
            return array_map(static fn (array $card): string => (string) $card['id'], $reviewCards);
        }

        $usedIds = array_map(static fn (array $card): string => (string) $card['id'], $reviewCards);
        $newCards = array_slice(array_values(array_filter(
            $cards,
            static fn (array $card): bool => ($card['status'] ?? 'new') === 'new'
                && !in_array((string) ($card['id'] ?? ''), $usedIds, true)
        )), 0, max(0, min(3, $newCardLimit)));

        return array_map(static fn (array $card): string => (string) $card['id'], array_merge($reviewCards, $newCards));
    }

    private function selectReading(array $state): ?array
    {
        $completed = $state['progress']['completedReadingIds'] ?? [];
        foreach ($state['readings'] as $reading) {
            if (!in_array((string) ($reading['id'] ?? ''), $completed, true)) {
                return $reading;
            }
        }

        return $state['readings'][0] ?? null;
    }

    private function selectSentenceTemplate(array $state): ?array
    {
        $templates = $state['sentenceTemplates'];
        if (count($templates) === 0) {
            return null;
        }

        $typed = $state['progress']['typedSentences'] ?? [];
        return $templates[count($typed) % count($templates)];
    }

    private function scheduleCard(array $card, string $rating): array
    {
        $reviews = (int) ($card['reviews'] ?? 0);
        $ease = $this->nextEase((float) ($card['ease'] ?? 2.3), $rating);
        $intervalDays = $this->nextInterval((int) ($card['intervalDays'] ?? 0), $reviews, $rating, $ease);

        $card['status'] = $reviews + 1 < 2 ? 'learning' : 'review';
        $card['dueAt'] = gmdate('c', time() + ($intervalDays * 86400));
        $card['intervalDays'] = $intervalDays;
        $card['ease'] = $ease;
        $card['reviews'] = $reviews + 1;
        $card['lapses'] = (int) ($card['lapses'] ?? 0) + ($rating === 'hard' ? 1 : 0);
        $card['lastReviewedAt'] = $this->nowIso();
        $card['lastRating'] = $rating;
        $card['updatedAt'] = $this->nowIso();

        return $card;
    }

    private function nextEase(float $currentEase, string $rating): float
    {
        if ($rating === 'easy') {
            return min(3.2, round($currentEase + 0.12, 2));
        }

        if ($rating === 'hard') {
            return max(1.3, round($currentEase - 0.2, 2));
        }

        return max(1.5, round($currentEase - 0.02, 2));
    }

    private function nextInterval(int $currentInterval, int $previousReviews, string $rating, float $ease): int
    {
        if ($rating === 'hard') {
            return 1;
        }

        if ($previousReviews === 0) {
            return $rating === 'easy' ? 3 : 1;
        }

        $multiplier = $rating === 'easy' ? $ease + 0.4 : $ease;
        return max(1, min(45, (int) ceil(max(1, $currentInterval) * $multiplier)));
    }

    private function isDue(array $card): bool
    {
        $dueAt = strtotime((string) ($card['dueAt'] ?? 'now'));
        return $dueAt === false || $dueAt <= strtotime(gmdate('Y-m-d 23:59:59'));
    }

    private function todayKey(): string
    {
        return gmdate('Y-m-d');
    }

    private function nowIso(): string
    {
        return gmdate('c');
    }
}
