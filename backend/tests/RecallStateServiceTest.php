<?php

declare(strict_types=1);

namespace Tests;

use App\Services\RecallStateService;
use PHPUnit\Framework\TestCase;

final class RecallStateServiceTest extends TestCase
{
    public function testTiredModeAlwaysCreatesFiniteFiveMinuteReviewSession(): void
    {
        $service = new RecallStateService();
        $session = $service->startSession($service->defaultState(), 15, true, 10);

        self::assertSame(5, $session['minutes']);
        self::assertTrue($session['tiredMode']);
        self::assertNull($session['readingId']);
        self::assertNull($session['sentenceTemplateId']);
        self::assertLessThanOrEqual(5, count($session['cardIds']));
    }

    public function testReviewUpdatesSchedulingAndProgressTogether(): void
    {
        $service = new RecallStateService();
        $state = $service->defaultState();
        $beforeReviews = $state['cards'][0]['reviews'];

        $result = $service->reviewCard($state, 'kana-a', 'easy');

        self::assertSame($beforeReviews + 1, $result['card']['reviews']);
        self::assertSame(1, $result['state']['progress']['totalCardsReviewed']);
        self::assertSame(1, $result['state']['progress']['totalCorrect']);
        self::assertSame('easy', $result['card']['lastRating']);
    }

    public function testGuestMergeDoesNotDoubleCountOverlappingDailyHistory(): void
    {
        $service = new RecallStateService();
        $account = $service->defaultState();
        $guest = $service->defaultState();
        $account['progress']['reviewedByDate'] = ['2026-08-14' => 3];
        $account['progress']['correctByDate'] = ['2026-08-14' => 2];
        $guest['progress']['reviewedByDate'] = ['2026-08-14' => 5, '2026-08-13' => 2];
        $guest['progress']['correctByDate'] = ['2026-08-14' => 4, '2026-08-13' => 1];

        $merged = $service->mergeStates($account, $guest);

        self::assertSame(7, $merged['progress']['totalCardsReviewed']);
        self::assertSame(5, $merged['progress']['totalCorrect']);
        self::assertSame(5, $merged['progress']['reviewedByDate']['2026-08-14']);
    }
}
