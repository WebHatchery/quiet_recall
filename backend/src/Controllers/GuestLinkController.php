<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Actions\LinkGuestAccountAction;
use App\Core\Request;
use App\Core\Response;
use App\Models\AuthUser;

final class GuestLinkController
{
    public function __construct(private readonly LinkGuestAccountAction $linkGuestAccountAction)
    {
    }

    public function link(Request $request, Response $response): void
    {
        $response->success($this->linkGuestAccountAction->execute(
            AuthUser::fromArray($request->getAttribute('auth_user', [])),
            $request->getBody()
        ));
    }
}
