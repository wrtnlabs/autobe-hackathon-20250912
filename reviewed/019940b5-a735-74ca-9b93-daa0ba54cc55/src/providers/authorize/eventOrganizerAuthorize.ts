import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { EventOrganizerPayload } from "../../decorators/payload/EventOrganizerPayload";

export async function eventOrganizerAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<EventOrganizerPayload> {
  const payload: EventOrganizerPayload = jwtAuthorize({ request }) as EventOrganizerPayload;

  if (payload.type !== "eventOrganizer") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // Since event_registration_event_organizers is a top-level table, query by id
  const organizer = await MyGlobal.prisma.event_registration_event_organizers.findFirst({
    where: {
      id: payload.id,
      email_verified: true,
    },
  });

  if (organizer === null) {
    throw new ForbiddenException("You're not enrolled or your email is not verified");
  }

  return payload;
}
