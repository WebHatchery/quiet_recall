<?php

declare(strict_types=1);

namespace Tests;

use App\Services\RecallStateService;
use PHPUnit\Framework\TestCase;

final class SmokeTest extends TestCase
{
    public function testRecallStateHasJapaneseStarterContent(): void
    {
        $state = (new RecallStateService())->defaultState();

        self::assertNotEmpty($state['cards']);
        self::assertSame('Japanese', $state['settings']['language']);
        self::assertSame('コーヒー', $state['cards'][2]['prompt']);
    }
}
